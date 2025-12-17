import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import { EditPolicyButton } from "@/components/EditPolicyButton";

type PageParams = { params: { id: string } } | { params: Promise<{ id: string }> };

const resolveParams = async (context: PageParams) => Promise.resolve(context.params);

function splitPrefix(value?: string) {
  if (!value) return { prefix: "CA", suffix: "" };
  const [first, ...rest] = value.split("-");
  return { prefix: first || "CA", suffix: rest.join("-") || "" };
}

export default async function PolicyDetailPage(context: PageParams) {
  const { id } = await resolveParams(context);

  await connectDb();

  const policy = await Policy.findById(id).lean();
  if (!policy) notFound();

  // Collect all possible linked customer ids (legacy customerId + array customerIds)
  const customerIdSet = new Set<string>();
  if (policy.customerId) customerIdSet.add(policy.customerId.toString());
  (Array.isArray(policy.customerIds) ? policy.customerIds : []).forEach((c: any) => {
    if (c) customerIdSet.add(c.toString());
  });
  const customerIds = Array.from(customerIdSet);

  const [customers, payments] = await Promise.all([
    customerIds.length
      ? Customer.find({ _id: { $in: customerIds } })
          .select("firstName middleName lastName email contactNumber")
          .lean()
      : [],
    Payment.find({ policyId: id }).sort({ paymentDate: -1 }).lean(),
  ]);

  const customerDocs = customers;
  const prefixInfo = splitPrefix(policy.policyIdNumber as string);
  const policyNumberParts = splitPrefix(policy.policyNumber as string);

  const safePolicy = {
    _id: policy._id.toString(),
    policyNumber: policy.policyNumber || `${prefixInfo.prefix}-${policyNumberParts.suffix || ""}`,
    policyIdNumber: policy.policyIdNumber || "",
    prefix: prefixInfo.prefix,
    idSuffix: prefixInfo.suffix,
    numberSuffix: policyNumberParts.suffix,
    coverageType: policy.coverageType || "Third Party",
    registrationNumber: policy.registrationNumber || "",
    coverageStartDate: policy.coverageStartDate,
    coverageEndDate: policy.coverageEndDate,
    totalPremiumDue: Number(policy.totalPremiumDue || 0),
    outstandingBalance: Number(policy.outstandingBalance || 0),
    amountPaid: Number((policy as any).amountPaid || 0),
    status: (policy.status as any) || "Active",
    notes: policy.notes || "",
    createdAt: policy.createdAt,
    renewalNoticeSentAt: policy.renewalNoticeSentAt || null,
  };

  return (
    <div className="space-y-6">
      <div className="page-title-box flex items-start justify-between">
        <div>
          <p className="section-heading">Policy</p>
          <h4>{safePolicy.policyNumber}</h4>
          <p className="page-subtitle">Full policy details and payment history.</p>
        </div>
        <EditPolicyButton
          policy={{
            _id: safePolicy._id,
            policyNumber: safePolicy.policyNumber,
            policyIdNumber: safePolicy.policyIdNumber,
            coverageType: safePolicy.coverageType,
            registrationNumber: safePolicy.registrationNumber,
            coverageStartDate: safePolicy.coverageStartDate?.toISOString?.(),
            coverageEndDate: safePolicy.coverageEndDate?.toISOString?.(),
            totalPremiumDue: safePolicy.totalPremiumDue,
            status: safePolicy.status as any,
            notes: safePolicy.notes,
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Detail label="Policy Number" value={safePolicy.policyNumber} />
            <Detail label="Policy ID" value={safePolicy.policyIdNumber} />
            <Detail label="Coverage" value={safePolicy.coverageType} />
            <Detail label="Status" value={safePolicy.status} />
            <Detail label="Registration" value={safePolicy.registrationNumber || "—"} />
            <Detail
              label="Coverage Start"
              value={safePolicy.coverageStartDate ? new Date(safePolicy.coverageStartDate).toLocaleDateString() : "—"}
            />
            <Detail
              label="Coverage End"
              value={safePolicy.coverageEndDate ? new Date(safePolicy.coverageEndDate).toLocaleDateString() : "—"}
            />
            <Detail
              label="Premium Due"
              value={`$${safePolicy.totalPremiumDue.toFixed(2)}`}
            />
            <Detail label="Amount Paid" value={`$${safePolicy.amountPaid.toFixed(2)}`} />
            <Detail
              label="Outstanding"
              value={`$${safePolicy.outstandingBalance.toFixed(2)}`}
            />
            <Detail
              label="Renewal notice sent"
              value={
                safePolicy.renewalNoticeSentAt
                  ? new Date(safePolicy.renewalNoticeSentAt).toLocaleString()
                  : "Not sent"
              }
            />
            <Detail
              label="Created"
              value={safePolicy.createdAt ? new Date(safePolicy.createdAt).toLocaleDateString() : "—"}
            />
          </div>
          {safePolicy.notes && (
            <div className="rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3 text-sm text-[var(--ic-gray-700)]">
              {safePolicy.notes}
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Customers</h2>
          {!customerDocs.length ? (
            <p className="text-sm text-[var(--ic-gray-600)]">No linked customers.</p>
          ) : (
            <ul className="space-y-2">
              {customerDocs.map((c) => (
                <li
                  key={c._id.toString()}
                  className="rounded-lg border border-[var(--ic-gray-200)] p-3 transition hover:bg-[var(--ic-gray-50)]"
                >
                  <Link
                    href={`/customers/${c._id.toString()}`}
                    className="font-semibold text-[var(--ic-navy)] underline"
                  >
                    {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ")}
                  </Link>
                  <div className="text-sm text-[var(--ic-gray-600)]">{c.email}</div>
                  <div className="text-sm text-[var(--ic-gray-600)]">{c.contactNumber}</div>
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
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Receipt</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => (
              <tr key={pay._id.toString()}>
                <td>${Number(pay.amount).toFixed(2)}</td>
                <td>{pay.paymentMethod}</td>
                <td>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                <td>{pay.receiptNumber}</td>
                <td>{(pay as any).notes || "—"}</td>
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


