import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { userSchema } from "@/lib/validators";
import { User } from "@/models/User";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("generate_user_report");
    if ("response" in auth) return auth.response;

    await connectDb();
    const users = await User.find({}, "username email role fullName createdAt").sort({
      createdAt: -1,
    });
    return json(users);
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

    const created = await User.create({
      username: parsed.data.username,
      email: parsed.data.email,
      password: hashedPassword,
      role: parsed.data.role,
      fullName: parsed.data.fullName,
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
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

