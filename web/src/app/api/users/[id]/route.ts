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
    const target = await User.findById(params.id).select("username");
    if (!target) {
      return json({ error: "User not found" }, { status: 404 });
    }
    const isLocked =
      target.username && target.username.toLowerCase() === "nicholas.dass";
    if (isLocked && parsed.data.password) {
      return json(
        { error: "Password for this account is locked and cannot be changed." },
        { status: 400 },
      );
    }

    const location = parsed.data.users_location || "Castries";
    const update: Record<string, unknown> = {
      username: parsed.data.username,
      email: parsed.data.email,
      role: parsed.data.role,
      fullName: parsed.data.fullName,
      users_location: location,
    };

    if (parsed.data.password && !isLocked) {
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

    return json(
      { error: "Deletion now requires manager approval. Submit a delete request." },
      { status: 403 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

