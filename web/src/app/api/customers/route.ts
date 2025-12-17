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
    
    // Check if there's a specific customer ID to verify (from query params)
    const url = new URL(request.url);
    const verifyCustomerId = url.searchParams.get('verify');
    
    // Use lean() for plain objects (faster, no Mongoose document overhead)
    // Sort by createdAt descending to get newest first
    // No limit - return all customers for the dropdown
    const queryStart = Date.now();
    const customers = await Customer.find()
      .sort({ createdAt: -1 })
      .lean();
    const queryTime = Date.now() - queryStart;
    
    // Log for debugging - include timestamp and sample of customer IDs to verify freshness
    const now = new Date();
    const recentCustomers = customers
      .filter((c: any) => {
        if (!c.createdAt) return false;
        const created = new Date(c.createdAt);
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        return created > fiveMinutesAgo;
      })
      .slice(0, 5)
      .map((c: any) => ({
        id: c._id?.toString() || 'no-id',
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        createdAt: c.createdAt
      }));
    
    console.log(`[API /customers] Query took ${queryTime}ms. Total: ${customers.length} customers. Recent (last 5min): ${recentCustomers.length}`);
    if (recentCustomers.length > 0) {
      console.log(`[API /customers] Recent customers:`, recentCustomers);
    }
    
    // If verifying a specific customer, check if it exists
    if (verifyCustomerId) {
      const found = customers.find((c: any) => c._id?.toString() === verifyCustomerId);
      console.log(`[API /customers] Verification for ${verifyCustomerId}:`, found ? 'FOUND' : 'NOT FOUND');
    }
    
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
      const createStart = Date.now();
      created = await Customer.create({
        ...parsed.data,
        email,
        middleName: parsed.data.middleName || null,
        sex: parsed.data.sex || null,
      });
      const createTime = Date.now() - createStart;
      
      console.log(`[API /customers POST] Created customer in ${createTime}ms:`, {
        id: created._id.toString(),
        name: `${created.firstName} ${created.lastName}`,
        idNumber: created.idNumber,
        createdAt: created.createdAt
      });
    } catch (err: any) {
      console.error('[API /customers POST] Error creating customer:', err);
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

    // Verify the customer can be found immediately after creation
    const verifyStart = Date.now();
    const verify = await Customer.findById(created._id).lean();
    const verifyTime = Date.now() - verifyStart;
    console.log(`[API /customers POST] Verification query took ${verifyTime}ms. Found:`, verify ? 'YES' : 'NO');

    return json(created);
  } catch (error) {
    return handleRouteError(error);
  }
}


