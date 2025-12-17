import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { userSchema } from "@/lib/validators";
import { User } from "@/models/User";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const scope = new URL(req.url).searchParams.get("scope");
    const idsParam = new URL(req.url).searchParams.get("ids");
    const auth =
      scope === "dropdown"
        ? await guardPermission("view_dashboard")
        : await guardPermission("generate_user_report");
    if ("response" in auth) return auth.response;

    await connectDb();
    const projection =
      scope === "dropdown" || idsParam
        ? "username fullName"
        : "username email role fullName users_location createdAt";

    const filter: any = {};
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (ids.length) {
        filter._id = { $in: ids };
      }
    }

    const users = await User.find(filter, projection).sort({ createdAt: -1 }).lean();

    if (scope === "dropdown" || idsParam) {
      const mapped = users.map((u: any) => ({
        id: u._id.toString(),
        username: u.username,
        fullName: u.fullName,
      }));
      return json({ users: mapped });
    }

    return json({ users });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await guardPermission("create_edit_delete_user");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = userSchema.safeParse(body);
    if (!parsed.success || !parsed.data.password) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const location = parsed.data.users_location || "Castries";

    const created = await User.create({
      username: parsed.data.username,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
      fullName: parsed.data.fullName,
      users_location: location,
    });

    await logAuditAction({
      userId: auth.session.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: created._id.toString(),
      details: { username: created.username, email: created.email, role: created.role },
    });

    return json({
      id: created._id,
      username: created.username,
      email: created.email,
      role: created.role,
      fullName: created.fullName,
      users_location: created.users_location,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

