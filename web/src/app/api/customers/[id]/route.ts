import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { customerSchema } from "@/lib/validators";
import { Customer } from "@/models/Customer";
import { logAuditAction } from "@/lib/audit";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (
  context: RouteContext
): Promise<{ id: string }> => Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const customer = await Customer.findById(params.id);
    if (!customer) return json({ error: "Not found" }, { status: 404 });
    return json(customer);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_customer");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    await Customer.findByIdAndUpdate(params.id, {
      ...parsed.data,
      middleName: parsed.data.middleName || null,
      sex: parsed.data.sex || null,
    });

    await logAuditAction({
      userId: auth.session.id,
      action: "UPDATE_CUSTOMER",
      entityType: "Customer",
      entityId: params.id,
      details: parsed.data,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_customer");
    if ("response" in auth) return auth.response;

    await connectDb();
    await Customer.findByIdAndDelete(params.id);

    await logAuditAction({
      userId: auth.session.id,
      action: "DELETE_CUSTOMER",
      entityType: "Customer",
      entityId: params.id,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

