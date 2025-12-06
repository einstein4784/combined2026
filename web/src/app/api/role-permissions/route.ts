import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { RolePermission } from "@/models/RolePermission";
import { DEFAULT_PERMISSIONS, SYSTEM_FUNCTIONS, UserRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function parseRole(roleParam: string | null): UserRole | null {
  if (!roleParam) return null;
  const normalized = roleParam as UserRole;
  if (["Admin", "Supervisor", "Cashier", "Underwriter"].includes(normalized)) return normalized;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const role = parseRole(searchParams.get("role"));
    if (!role) return json({ error: "role is required" }, { status: 400 });

    await connectDb();
    const existing = await RolePermission.findOne({ role }).lean();
    const permissions =
      existing?.permissions || DEFAULT_PERMISSIONS[role] || Object.keys(SYSTEM_FUNCTIONS);

    return json({ role, permissions });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const role = parseRole(searchParams.get("role"));
    if (!role) return json({ error: "role is required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const permissions = Array.isArray(body.permissions) ? body.permissions : [];
    const validPermissions = permissions.filter((p: string) => p in SYSTEM_FUNCTIONS);

    await connectDb();
    const updated = await RolePermission.findOneAndUpdate(
      { role },
      { role, permissions: validPermissions },
      { upsert: true, new: true },
    ).lean();

    return json({ role: updated.role, permissions: updated.permissions });
  } catch (error) {
    return handleRouteError(error);
  }
}

