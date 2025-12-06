import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";
import { Receipt } from "@/models/Receipt";
import { PaymentForm } from "@/components/forms/PaymentForm";

export default async function PaymentsPage() {
  await connectDb();
  const payments = await Payment.find()
    .populate({
      path: "policyId",
      select: "policyNumber outstandingBalance customerId",
      populate: { path: "customerId", select: "firstName lastName" },
    })
    .sort({ paymentDate: -1 })
    .lean();

  const paymentIds = payments.map((p) => p._id);
  const receipts = await Receipt.find({ paymentId: { $in: paymentIds } })
    .select("_id paymentId receiptNumber")
    .lean();
  const receiptByPayment: Record<string, { _id: string; receiptNumber: string }> = {};
  receipts.forEach((r) => {
    receiptByPayment[String(r.paymentId)] = { _id: r._id.toString(), receiptNumber: r.receiptNumber };
  });

  const policies = await Policy.find()
    .populate("customerId", "firstName lastName")
    .sort({ createdAt: -1 })
    .lean();

  type PaymentRow = {
    _id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: Date;
    policyId?: {
      policyNumber?: string;
      customerId?: { firstName?: string; lastName?: string };
    };
  };

  const paymentRows = payments as unknown as PaymentRow[];

  const policyOptions = policies.map((p) => ({
    id: p._id.toString(),
    policyNumber: p.policyNumber,
    customerName: `${(p.customerId as { firstName?: string; lastName?: string } | undefined)?.firstName || ""} ${
      (p.customerId as { firstName?: string; lastName?: string } | undefined)?.lastName || ""
    }`.trim(),
    outstandingBalance: p.outstandingBalance,
  }));

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Billing</p>
        <h4>Payments</h4>
        <p className="page-subtitle">Record and review payments across policies.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Recent payments</h2>
            <span className="badge success">{paymentRows.length} records</span>
          </div>
          <table className="mt-4">
            <thead>
              <tr>
                <th>Policy</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th className="text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {paymentRows.map((p) => (
                <tr key={p._id}>
                  <td>{p.policyId?.policyNumber}</td>
                  <td>
                    {p.policyId?.customerId?.firstName} {p.policyId?.customerId?.lastName}
                  </td>
                  <td>${p.amount.toFixed(2)}</td>
                  <td>{p.paymentMethod}</td>
                  <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="text-right">
                    {receiptByPayment[p._id] ? (
                      <a
                        href={`/receipts/${receiptByPayment[p._id]._id}`}
                        className="text-[var(--ic-navy)] underline"
                        target="_blank"
                      >
                        View receipt
                      </a>
                    ) : (
                      <span className="text-sm text-[var(--ic-gray-500)]">No receipt</span>
                    )}
                  </td>
                </tr>
              ))}
              {!paymentRows.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Record payment</h2>
          <p className="text-sm text-[var(--ic-gray-600)]">
            Validates against outstanding balance unless override is enabled.
          </p>
          <div className="mt-3">
            <PaymentForm policies={policyOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

