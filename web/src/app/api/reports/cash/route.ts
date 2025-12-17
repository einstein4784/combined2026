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
    const paymentsWithTotals = payments.map((p) => {
      const totalPaid = p.amount ?? 0; // amount is stored net of refunds
      return {
        ...p.toObject(),
        totalPaid,
      };
    });

    const totals = paymentsWithTotals.reduce(
      (acc, p) => {
        const method = (p.paymentMethod || "Cash").toLowerCase();
        if (method === "card") acc.card += p.totalPaid || 0;
        else if (method === "transfer") acc.transfer += p.totalPaid || 0;
        else acc.cash += p.totalPaid || 0;
        return acc;
      },
      { cash: 0, card: 0, transfer: 0 },
    );

    return json({
      total: totals.cash,
      totalCash: totals.cash,
      totalCard: totals.card,
      totalTransfer: totals.transfer,
      count: paymentsWithTotals.length,
      payments: paymentsWithTotals,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


