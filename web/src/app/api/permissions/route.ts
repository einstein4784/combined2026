import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { rolePermissionSchema } from "@/lib/validators";
import { RolePermission } from "@/models/RolePermission";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();
    const records = await RolePermission.find();
    return json(records);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = rolePermissionSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    await RolePermission.findOneAndUpdate(
      { role: parsed.data.role },
      { permissions: parsed.data.permissions },
      { upsert: true },
    );

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


