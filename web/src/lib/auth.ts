import { auth } from "@/auth";
import type { UserRole } from "./permissions";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  users_location?: string;
};

export async function getSession(): Promise<SessionUser | null> {
  let session = null;
  try {
    // Temporarily suppress console.error to prevent NextAuth from logging JWTSessionError
    const originalError = console.error;
    
    console.error = (...args: any[]) => {
      // Check if this is a JWTSessionError log from NextAuth
      const firstArg = args[0];
      const errorStr = args.map(arg => 
        typeof arg === "string" ? arg : 
        typeof arg === "object" && arg !== null ? JSON.stringify(arg) : 
        String(arg)
      ).join(" ");
      
      // Suppress only JWTSessionError logs from NextAuth
      if (
        (typeof firstArg === "string" && firstArg.includes("[auth][error]")) ||
        errorStr.includes("JWTSessionError") ||
        errorStr.includes("authjs.dev#jwtsessionerror") ||
        errorStr.includes("Read more at https://errors.authjs.dev#jwtsessionerror")
      ) {
        return; // Don't log this error - it's expected when cookies are invalid
      }
      // Log all other errors normally
      originalError.apply(console, args);
    };
    
    try {
      session = await auth();
    } finally {
      // Always restore original console.error
      console.error = originalError;
    }
  } catch (err: any) {
    // Auth.js throws JWTSessionError when token/secret is invalid; treat as signed-out
    // This is expected when cookies are invalid (e.g., after AUTH_SECRET change), so we silently handle it
    const errorName = err?.name || err?.constructor?.name || "";
    const errorMessage = err?.message || "";
    const errorCode = err?.code || "";
    
    // Check for JWT session errors (invalid/expired tokens)
    if (
      errorName === "JWTSessionError" ||
      errorCode === "ERR_JWT_SESSION_ERROR" ||
      errorMessage.includes("JWTSessionError") ||
      errorMessage.includes("authjs.dev#jwtsessionerror")
    ) {
      // Silently return null for invalid tokens (expected behavior)
      return null;
    }
    // Only log unexpected errors
    if (process.env.NODE_ENV === "development") {
      console.error("[auth] unexpected session error", err);
    }
    return null;
  }
  if (!session?.user?.id) return null;

  const user = session.user;
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? "",
    role: user.role,
    fullName: user.fullName || user.name || user.username,
    users_location: (user as any).users_location,
  };
}

export async function requireSession(
  roles?: UserRole[],
): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;
  return session;
}
