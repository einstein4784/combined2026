import { connectDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";
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
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

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
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    const email = parsed.data.email?.trim() || "na@none.com";

    await connectDb();
    await Customer.findByIdAndUpdate(params.id, {
      ...parsed.data,
      email,
      middleName: parsed.data.middleName || null,
      contactNumber2: parsed.data.contactNumber2 || null,
      sex: parsed.data.sex || null,
    });

    await logAuditAction({
      userId: session.id,
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
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

    return json(
      { error: "Deletion now requires manager approval. Submit a delete request." },
      { status: 403 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

