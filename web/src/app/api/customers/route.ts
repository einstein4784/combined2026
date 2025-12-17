import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { customerSchema } from "@/lib/validators";
import { Customer } from "@/models/Customer";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const customers = await Customer.find().sort({ createdAt: -1 });
    return json(customers);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await guardPermission("create_edit_customer");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    const email = parsed.data.email?.trim() || "na@none.com";

    await connectDb();
    let created;
    try {
      created = await Customer.create({
        ...parsed.data,
        email,
        middleName: parsed.data.middleName || null,
        sex: parsed.data.sex || null,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        const fields = Object.keys(err?.keyPattern || {});
        const fieldLabel = fields.length ? fields.join(", ") : "unique field";
        return json({ error: `Customer with this ${fieldLabel} already exists.` }, { status: 400 });
      }
      throw err;
    }

    await logAuditAction({
      userId: auth.session.id,
      action: "CREATE_CUSTOMER",
      entityType: "Customer",
      entityId: created._id.toString(),
      details: {
        name: `${created.firstName} ${created.lastName}`,
        idNumber: created.idNumber,
      },
    });

    return json(created);
  } catch (error) {
    return handleRouteError(error);
  }
}


