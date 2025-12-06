import { auth } from "@/auth";
import type { UserRole } from "./permissions";

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
};

export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = session.user;
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? "",
    role: user.role,
    fullName: user.fullName || user.name || user.username,
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
