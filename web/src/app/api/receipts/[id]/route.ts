import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Receipt } from "@/models/Receipt";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (
  context: RouteContext,
): Promise<{ id: string }> => Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    return json(
      { error: "Deletion now requires manager approval. Submit a delete request." },
      { status: 403 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("void_restore_receipt");
    if ("response" in auth) return auth.response;

    const { status } = await req.json().catch(() => ({}));
    if (status !== "void" && status !== "active") {
      return json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDb();
    const updated = await Receipt.findByIdAndUpdate(params.id, { status }, { new: true }).lean();
    if (!updated) {
      return json({ error: "Receipt not found" }, { status: 404 });
    }
    return json({ success: true, receipt: { _id: updated._id.toString(), status: updated.status || "active" } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { amount, paymentDate, paymentMethod, notes, location, registrationNumber } = body;

    if (amount !== undefined && (typeof amount !== "number" || amount < 0)) {
      return json({ error: "Invalid amount" }, { status: 400 });
    }

    if (paymentDate && !Date.parse(paymentDate)) {
      return json({ error: "Invalid payment date" }, { status: 400 });
    }

    await connectDb();
    
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (paymentDate) updateData.paymentDate = new Date(paymentDate);
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (notes !== undefined) updateData.notes = notes || null;
    if (location !== undefined) updateData.location = location || null;
    if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber || null;

    const updated = await Receipt.findByIdAndUpdate(params.id, updateData, { new: true }).lean();
    if (!updated) {
      return json({ error: "Receipt not found" }, { status: 404 });
    }

    return json({ success: true, receipt: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}



