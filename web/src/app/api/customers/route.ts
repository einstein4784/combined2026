import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { customerSchema } from "@/lib/validators";
import { Customer } from "@/models/Customer";
import { logAuditAction } from "@/lib/audit";
import { rateLimitMiddleware } from "@/lib/rate-limit";
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";
import { generateCustomerId } from "@/lib/ids";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    // Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, auth.session.id);
    if (rateLimitResponse) return rateLimitResponse;

    await connectDb();

    // Parse pagination params (backward compatible - if no pagination params, return all with limit)
    const { searchParams } = new URL(req.url);
    const usePagination = searchParams.get('paginated') === 'true';
    const { page, limit, skip } = parsePaginationParams(searchParams);

    if (usePagination) {
      // New paginated format
      const [customers, total] = await Promise.all([
        Customer.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Customer.countDocuments(),
      ]);

      return json(createPaginatedResponse(customers, total, page, limit));
    } else {
      // Old format (backward compatible) - but add safety limit
      const customers = await Customer.find()
        .sort({ createdAt: -1 })
        .limit(1000) // Safety limit to prevent loading too much data
        .lean();
      return json(customers);
    }
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
    
    // Generate customer ID if not provided or if it's a duplicate
    let customerId = parsed.data.idNumber?.trim();
    if (!customerId || customerId.length < 3) {
      customerId = await generateCustomerId(Customer);
    } else {
      // Check if the provided ID already exists
      const existing = await Customer.findOne({ idNumber: customerId }).lean();
      if (existing) {
        // Generate a new one if duplicate
        customerId = await generateCustomerId(Customer);
      }
    }
    
    let created;
    try {
      created = await Customer.create({
        ...parsed.data,
        idNumber: customerId,
        email,
        middleName: parsed.data.middleName || null,
        sex: parsed.data.sex || null,
        driversLicenseNumber: parsed.data.driversLicenseNumber?.trim() || null,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        const fields = Object.keys(err?.keyPattern || {});
        const fieldLabel = fields.length ? fields.join(", ") : "unique field";
        
        // If it's the idNumber that's duplicate, try generating a new one once
        if (fields.includes("idNumber")) {
          try {
            const newId = await generateCustomerId(Customer);
            created = await Customer.create({
              ...parsed.data,
              idNumber: newId,
              email,
              middleName: parsed.data.middleName || null,
              sex: parsed.data.sex || null,
              driversLicenseNumber: parsed.data.driversLicenseNumber?.trim() || null,
            });
          } catch (retryErr: any) {
            return json({ error: `Customer ID "${customerId}" already exists. Please use a different Customer ID.` }, { status: 400 });
          }
        } else {
          return json({ error: `Customer with this ${fieldLabel} already exists.` }, { status: 400 });
        }
      } else {
        throw err;
      }
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


