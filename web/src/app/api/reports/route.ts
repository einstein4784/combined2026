import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "cash";
    const fromParam = parseDate(searchParams.get("from"));
    const toParam = parseDate(searchParams.get("to"));

    const from = fromParam ?? new Date(0);
    const to = toParam ?? new Date();

    await connectDb();

    if (type === "cash") {
      const payments = await Payment.find({
        paymentDate: { $gte: from, $lte: to },
      })
        .sort({ paymentDate: -1 })
        .lean();

      const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      return json({ type, from, to, total, payments });
    }

    if (type === "outstanding") {
      const policies = await Policy.find({
        outstandingBalance: { $gt: 0 },
        ...(fromParam || toParam
          ? { coverageEndDate: { $gte: from, $lte: to } }
          : {}),
      })
        .populate("customerId", "firstName lastName")
        .sort({ coverageEndDate: 1 })
        .lean();

      const rows = policies.map((p: any) => ({
        _id: p._id.toString(),
        policyNumber: p.policyNumber,
        customerName: [p.customerId?.firstName, p.customerId?.lastName]
          .filter(Boolean)
          .join(" "),
        outstandingBalance: p.outstandingBalance,
        coverageEndDate: p.coverageEndDate,
      }));

      const totalOutstanding = rows.reduce(
        (sum, r) => sum + (r.outstandingBalance || 0),
        0,
      );

      return json({ type, from, to, totalOutstanding, rows });
    }

    if (type === "renewals") {
      const policies = await Policy.find({
        coverageEndDate: { $gte: from, $lte: to },
      })
        .populate("customerId", "firstName lastName")
        .sort({ coverageEndDate: 1 })
        .lean();

      const rows = policies.map((p: any) => ({
        _id: p._id.toString(),
        policyNumber: p.policyNumber,
        customerName: [p.customerId?.firstName, p.customerId?.lastName]
          .filter(Boolean)
          .join(" "),
        coverageEndDate: p.coverageEndDate,
        outstandingBalance: p.outstandingBalance,
      }));

      return json({ type, from, to, rows });
    }

    return json({ error: "Unsupported report type" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}

