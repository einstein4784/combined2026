import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { userSchema } from "@/lib/validators";
import { User } from "@/models/User";
import { logAuditAction } from "@/lib/audit";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (
  context: RouteContext
): Promise<{ id: string }> => Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_delete_user");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    const update: Record<string, unknown> = {
      username: parsed.data.username,
      email: parsed.data.email,
      role: parsed.data.role,
      fullName: parsed.data.fullName,
    };

    if (parsed.data.password) {
      update.password = await bcrypt.hash(parsed.data.password, 10);
    }

    await User.findByIdAndUpdate(params.id, update);

    await logAuditAction({
      userId: auth.session.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: params.id,
      details: update,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_delete_user");
    if ("response" in auth) return auth.response;

    if (auth.session.id === params.id) {
      return json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await connectDb();
    await User.findByIdAndDelete(params.id);

    await logAuditAction({
      userId: auth.session.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: params.id,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

