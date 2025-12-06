import { connectDb } from "@/lib/db";
import { guardSession } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Payment } from "@/models/Payment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await guardSession(["Admin", "Cashier", "Supervisor"]);
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    await connectDb();

    const filters: Record<string, unknown> = {};
    if (from || to) {
      filters.paymentDate = {};
      if (from) (filters.paymentDate as Record<string, unknown>).$gte = new Date(from);
      if (to) (filters.paymentDate as Record<string, unknown>).$lte = new Date(to);
    }

    const payments = await Payment.find(filters);
    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    return json({ total, count: payments.length, payments });
  } catch (error) {
    return handleRouteError(error);
  }
}


