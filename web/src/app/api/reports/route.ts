import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";
import "@/models/Customer";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  // Parse date inputs (yyyy-mm-dd) in local time to avoid UTC shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = value.split("-").map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date | null): Date | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date | null): Date | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "cash";
    const fromParam = startOfDay(parseDate(searchParams.get("from")));
    const toParam = endOfDay(parseDate(searchParams.get("to")));

    const from = fromParam ?? startOfDay(new Date(0))!;
    const to = toParam ?? endOfDay(new Date())!;
    const prefix = (searchParams.get("prefix") || "").toUpperCase();

    await connectDb();

    if (type === "cash") {
      const payments = await Payment.find({
        paymentDate: { $gte: from, $lte: to },
      })
        .populate({
          path: "policyId",
          select: "policyNumber policyIdNumber coverageStartDate coverageEndDate customerId",
          populate: { path: "customerId", select: "firstName lastName" },
        })
        .sort({ paymentDate: -1 })
        .lean();

      const filteredByPrefix = payments.filter((p: any) => {
        if (!prefix || prefix === "ALL") return true;
        const policyNumber = (p.policyId as any)?.policyNumber || "";
        return policyNumber.startsWith(prefix);
      });

      const paymentsWithTotals = filteredByPrefix.map((p: any) => {
        const refundAmount = typeof p.refundAmount === "number" ? p.refundAmount : 0;
        const netAmount = typeof p.amount === "number" ? p.amount : 0;
        const grossAmount = netAmount + refundAmount;
        const policy = p.policyId as any;
        const customer = policy?.customerId as any;
        return {
          ...p,
          totalPaid: netAmount, // net of refunds
          refundAmount,
          netAmount,
          grossAmount,
          policyNumber: policy?.policyNumber,
          policyIdNumber: policy?.policyIdNumber,
          customerName: `${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim(),
          coverageStartDate: policy?.coverageStartDate,
          coverageEndDate: policy?.coverageEndDate,
        };
      });

      const totals = paymentsWithTotals.reduce(
        (acc, p) => {
          const method = (p.paymentMethod || "Cash").toLowerCase();
          if (method === "card") acc.card += p.totalPaid || 0;
          else if (method === "transfer") acc.transfer += p.totalPaid || 0; // tracked but not added to cash
          else acc.cash += p.totalPaid || 0;
          return acc;
        },
        { cash: 0, card: 0, transfer: 0 },
      );

      return json({
        type,
        from,
        to,
        total: totals.cash,
        totalCash: totals.cash,
        totalCard: totals.card,
        totalTransfer: totals.transfer,
        payments: paymentsWithTotals,
      });
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

