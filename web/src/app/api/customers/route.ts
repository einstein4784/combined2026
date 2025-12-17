import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { customerSchema } from "@/lib/validators";
import { Customer } from "@/models/Customer";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const customers = await Customer.find().sort({ createdAt: -1 });
    
    // Log for debugging
    console.log(`[API /customers] Returning ${customers.length} customers`);
    
    // Create response with no-cache headers
    const response = json(customers, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
    
    return response;
  } catch (error) {
    console.error('[API /customers] Error:', error);
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


