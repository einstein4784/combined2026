import { connectDb } from "@/lib/db";
import { Receipt } from "@/models/Receipt";
import Link from "next/link";

export default async function ReceiptsPage() {
  await connectDb();
  const receipts = await Receipt.find()
    .populate("customerId", "firstName lastName")
    .populate("policyId", "policyNumber")
    .sort({ generatedAt: -1 })
    .lean();

  type ReceiptRow = {
    _id: string;
    receiptNumber: string;
    policyId?: { policyNumber?: string };
    customerId?: { firstName?: string; lastName?: string };
    amount: number;
    paymentDate: Date;
  };

  const rows = receipts as unknown as ReceiptRow[];

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Receipts</p>
        <h4>Receipts</h4>
        <p className="page-subtitle">All generated receipts with customer links.</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">History</h2>
          <span className="badge success">{rows.length} records</span>
        </div>
        <table className="mt-4">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Policy</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.receiptNumber}</td>
                <td>{r.policyId?.policyNumber}</td>
                <td>{r.customerId?.firstName} {r.customerId?.lastName}</td>
                <td>${r.amount.toFixed(2)}</td>
                <td>{new Date(r.paymentDate).toLocaleDateString()}</td>
                <td className="text-right">
                  <Link href={`/receipts/${r._id}`} className="text-[var(--ic-navy)] underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

