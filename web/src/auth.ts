import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import type { UserRole } from "@/lib/permissions";
import { logAuditAction } from "@/lib/audit";
import type { JWT } from "next-auth/jwt";

type CredentialsInput = {
  username?: string;
  password?: string;
};

// Validate AUTH_SECRET is set
if (!process.env.AUTH_SECRET) {
  throw new Error(
    "AUTH_SECRET environment variable is not set. " +
    "Please set it in your environment variables. " +
    "You can generate one by running: npm run generate-auth-secret"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: false, // Suppress NextAuth internal error logging
  session: { strategy: "jwt", maxAge: 4 * 60 * 60, updateAge: 30 * 60 },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const { username, password } = (credentials || {}) as CredentialsInput;
        if (!username || !password) return null;

        await connectDb();
        const user = await User.findOne({
          $or: [{ username }, { email: username }],
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.fullName,
          role: user.role,
          username: user.username,
          fullName: user.fullName,
          users_location: (user as any).users_location || "Castries",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role;
        token.username = (user as { username?: string }).username;
        token.fullName = (user as { fullName?: string }).fullName;
        token.users_location = (user as { users_location?: string }).users_location;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = token.role as UserRole;
        session.user.username = token.username as string;
        session.user.fullName =
          (token.fullName as string) || session.user.name || "";
        (session.user as any).users_location = (token as any).users_location || "Castries";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await logAuditAction({
        userId: user.id as string,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id as string,
        details: { username: (user as { username?: string }).username },
      });
    },
    async signOut(message) {
      const tokenSub =
        "token" in message ? (message.token as JWT | null | undefined)?.sub : undefined;
      const sessionUserId =
        "session" in message
          ? (
              message.session as { user?: { id?: string; name?: string } } | null | undefined
            )?.user?.id
          : undefined;
      const userId = tokenSub || sessionUserId;
      if (!userId) return;

      const username =
        "token" in message
          ? (message.token as JWT | null | undefined)?.username
          : "session" in message
            ? (
                message.session as { user?: { name?: string } } | null | undefined
              )?.user?.name
            : undefined;

      await logAuditAction({
        userId,
        action: "LOGOUT",
        entityType: "User",
        entityId: userId,
        details: { username },
      });
    },
  },
});

