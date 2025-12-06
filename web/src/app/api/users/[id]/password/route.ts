import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { User } from "@/models/User";
import { logAuditAction } from "@/lib/audit";

type RouteContext = { params: { id: string } } | { params: Promise<{ id: string }> };

const resolveParams = async (context: RouteContext): Promise<{ id: string }> =>
  Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_delete_user");
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password.trim() : "";
    if (!password || password.length < 6) {
      return json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await connectDb();
    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(params.id, { password: hashed });

    await logAuditAction({
      userId: auth.session.id,
      action: "RESET_USER_PASSWORD",
      entityType: "User",
      entityId: params.id,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

