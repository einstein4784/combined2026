import type { UserRole } from "@/lib/permissions";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      username: string;
      fullName: string;
      role: UserRole;
    };
  }

  interface User {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    username?: string;
    fullName?: string;
  }
}


