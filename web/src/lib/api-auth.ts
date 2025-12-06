import { getSession } from "./auth";
import { json } from "./utils";
import type { SystemFunctionId, UserRole } from "./permissions";
import { DEFAULT_PERMISSIONS } from "./permissions";
import { RolePermission } from "@/models/RolePermission";
import { connectDb } from "./db";

export async function guardSession(roles?: UserRole[]) {
  const session = await getSession();
  if (!session) {
    return { response: json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roles && !roles.includes(session.role)) {
    return { response: json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function guardPermission(permission: SystemFunctionId) {
  const session = await getSession();
  if (!session) {
    return { response: json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (DEFAULT_PERMISSIONS[session.role]?.includes(permission)) {
    return { session };
  }

  // Fallback to DB-defined permissions
  await connectDb();
  const rolePerms = await RolePermission.findOne({ role: session.role });
  if (rolePerms?.permissions.includes(permission)) {
    return { session };
  }

  return { response: json({ error: "Permission denied" }, { status: 403 }) };
}

