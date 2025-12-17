import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDb } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { EditCustomerButton } from "@/components/EditCustomerButton";

type PageParams = { params: { id: string } } | { params: Promise<{ id: string }> };

const resolveParams = async (context: PageParams) => Promise.resolve(context.params);

export default async function CustomerDetailPage(context: PageParams) {
  const { id } = await resolveParams(context);

  await connectDb();

  const customer = await Customer.findById(id).lean();
  if (!customer) {
    notFound();
  }

  const policies = await Policy.find({
    $or: [{ customerId: id }, { customerIds: id }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const policyIds = policies.map((p) => p._id);
  const payments =
    policyIds.length === 0
      ? []
      : await Payment.find({ policyId: { $in: policyIds } })
          .sort({ paymentDate: -1 })
          .populate("policyId", "policyNumber")
          .lean();

  const safeCustomer = {
    _id: customer._id.toString(),
    firstName: customer.firstName || "",
    middleName: customer.middleName || "",
    lastName: customer.lastName || "",
    address: customer.address || "",
    contactNumber: customer.contactNumber || "",
    email: customer.email || "",
    sex: (customer as any).sex || "Male",
    idNumber: customer.idNumber || "",
    hasArrears: (customer as any).hasArrears ?? false,
    arrearsOverride: (customer as any).arrearsOverride ?? false,
    createdAt: customer.createdAt,
  };

  return (
    <div className="space-y-6">
      <div className="page-title-box flex items-start justify-between">
        <div>
          <p className="section-heading">Customer</p>
          <h4>
            {safeCustomer.firstName} {safeCustomer.middleName} {safeCustomer.lastName}
          </h4>
          <p className="page-subtitle">Full details and payment history.</p>
        </div>
        <EditCustomerButton customer={safeCustomer} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Detail label="Name" value={`${safeCustomer.firstName} ${safeCustomer.middleName} ${safeCustomer.lastName}`} />
            <Detail label="Email" value={safeCustomer.email} />
            <Detail label="Contact" value={safeCustomer.contactNumber} />
            <Detail label="ID Number" value={safeCustomer.idNumber} />
            <Detail label="Sex" value={safeCustomer.sex || "—"} />
            <Detail label="Address" value={safeCustomer.address} />
            <Detail
              label="Created"
              value={new Date(safeCustomer.createdAt).toLocaleDateString()}
            />
            <Detail
              label="Arrears"
              value={safeCustomer.hasArrears ? "Yes" : "No"}
            />
            <Detail
              label="Arrears Override"
              value={safeCustomer.arrearsOverride ? "Enabled" : "Disabled"}
            />
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Policies</h2>
          {policies.length === 0 ? (
            <p className="text-sm text-[var(--ic-gray-600)]">No policies yet.</p>
          ) : (
            <ul className="space-y-2">
              {policies.map((p) => (
                <li key={p._id.toString()} className="rounded-lg border border-[var(--ic-gray-200)] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[var(--ic-navy)]">{p.policyNumber}</div>
                      <div className="text-sm text-[var(--ic-gray-600)]">{p.coverageType}</div>
                    </div>
                    <Link href={`/policies/${p._id.toString()}/notice`} className="text-sm text-[var(--ic-navy)] underline">
                      View
                    </Link>
                  </div>
                  <div className="mt-2 text-xs text-[var(--ic-gray-600)]">
                    Status: {p.status} · Outstanding: ${Number(p.outstandingBalance || 0).toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Payment History</h2>
          <span className="badge success">{payments.length} total</span>
        </div>
        <table className="mt-4">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => (
              <tr key={pay._id.toString()}>
                <td>{(pay as any).policyId?.policyNumber || "—"}</td>
                <td>${Number(pay.amount).toFixed(2)}</td>
                <td>{pay.paymentMethod}</td>
                <td>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                <td>{pay.receiptNumber}</td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-sm text-slate-500">
                  No payments recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--ic-navy)]">{value || "—"}</p>
    </div>
  );
}






