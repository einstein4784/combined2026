import { redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { guardSession } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import AdvancedPaymentPortal from "./AdvancedPaymentPortal";

export const dynamic = "force-dynamic";

export default async function AdvancedPaymentsPage() {
  const auth = await guardSession();
  if ("response" in auth) {
    redirect("/login");
  }

  await connectDb();

  // Limit queries to prevent loading all data - use pagination or reasonable limits
  const [policies, payments] = await Promise.all([
    Policy.find({ status: "Active" }) // Only active policies
      .select(
        "policyNumber policyIdNumber totalPremiumDue outstandingBalance amountPaid customerId customerIds",
      )
      .populate([
        { path: "customerId", select: "firstName lastName" },
        { path: "customerIds", select: "firstName lastName" },
      ])
      .sort({ createdAt: -1 })
      .limit(500) // Limit to 500 most recent active policies
      .lean(),
    Payment.find()
      .select("policyId amount refundAmount paymentMethod paymentDate notes")
      .populate({ path: "policyId", select: "policyNumber" })
      .sort({ paymentDate: -1 })
      .limit(1000) // Limit to 1000 most recent payments
      .lean(),
  ]);

  const policyOptions = policies.map((p: any) => {
    const customers = [
      p.customerId,
      ...(Array.isArray(p.customerIds) ? p.customerIds : []),
    ].filter(Boolean) as any[];
    const customerName = customers
      .map((c) => `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim())
      .filter(Boolean)
      .join(", ");

    return {
      id: p._id.toString(),
      policyNumber: p.policyNumber,
      policyIdNumber: p.policyIdNumber,
      customerName,
      totalPremiumDue: p.totalPremiumDue ?? 0,
      amountPaid: p.amountPaid ?? 0,
      outstandingBalance: p.outstandingBalance ?? 0,
    };
  });

  const paymentRows = payments.map((p: any) => ({
    id: p._id.toString(),
    policyId: p.policyId?._id?.toString?.() || p.policyId?.toString?.() || "",
    policyNumber: (p.policyId as any)?.policyNumber,
    amount: typeof p.amount === "number" ? p.amount : 0,
    refundAmount: typeof p.refundAmount === "number" ? p.refundAmount : 0,
    paymentMethod: p.paymentMethod,
    paymentDate: p.paymentDate,
    notes: p.notes,
  }));

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Billing</p>
        <h4>Advanced payment options</h4>
        <p className="page-subtitle">
          Receive partial payments, record refunds, and manage balances per policy.
        </p>
        <div className="mt-2 flex gap-2">
          <a className="btn btn-secondary" href="/payments">
            Back to payments
          </a>
        </div>
      </div>

      <AdvancedPaymentPortal policies={policyOptions} payments={paymentRows} />
    </div>
  );
}



