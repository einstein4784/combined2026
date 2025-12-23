import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { Customer } from "@/models/Customer";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";
import { EditPolicyButton } from "@/components/EditPolicyButton";
import { DeletePolicyButton } from "@/components/DeletePolicyButton";
import { formatDateOnly } from "@/lib/utils";

type PageParams = { params: { id: string } } | { params: Promise<{ id: string }> };

const resolveParams = async (context: PageParams) => Promise.resolve(context.params);

export default async function PolicyDetailPage(context: PageParams) {
  const { id } = await resolveParams(context);

  await connectDb();

  const policy = await Policy.findById(id).lean();
  if (!policy) notFound();

  // Collect all possible linked customer ids
  const customerIdSet = new Set<string>();
  if (policy.customerId) customerIdSet.add(policy.customerId.toString());
  (Array.isArray(policy.customerIds) ? policy.customerIds : []).forEach((c: any) => {
    if (c) customerIdSet.add(c.toString());
  });
  const customerIds = Array.from(customerIdSet);

  const [customers, payments, receipts, auditLogs, createdByUser] = await Promise.all([
    customerIds.length
      ? Customer.find({ _id: { $in: customerIds } })
          .select("firstName middleName lastName email contactNumber idNumber")
          .lean()
      : [],
    Payment.find({ policyId: id }).sort({ paymentDate: -1 }).lean(),
    Receipt.find({ policyId: id }).sort({ paymentDate: -1 }).lean(),
    AuditLog.find({
      entityType: "Policy",
      entityId: id,
      action: { $in: ["CREATE_POLICY", "UPDATE_POLICY"] },
    })
      .populate("userId", "fullName username")
      .sort({ createdAt: -1 })
      .lean(),
    policy.createdBy
      ? User.findById(policy.createdBy).select("fullName username").lean()
      : null,
  ]);

  const safePolicy = {
    _id: policy._id.toString(),
    policyNumber: policy.policyNumber || "",
    policyIdNumber: policy.policyIdNumber || "",
    coverageType: policy.coverageType || "Third Party",
    registrationNumber: policy.registrationNumber || "",
    engineNumber: policy.engineNumber || "",
    chassisNumber: policy.chassisNumber || "",
    vehicleType: policy.vehicleType || "",
    coverageStartDate: policy.coverageStartDate,
    coverageEndDate: policy.coverageEndDate,
    totalPremiumDue: Number(policy.totalPremiumDue || 0),
    outstandingBalance: Number(policy.outstandingBalance || 0),
    amountPaid: Number((policy as any).amountPaid || 0),
    status: (policy.status as any) || "Active",
    notes: policy.notes || "",
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    renewalNoticeSentAt: policy.renewalNoticeSentAt || null,
    renewalNoticeSentBy: policy.renewalNoticeSentBy || null,
    createdBy: policy.createdBy || null,
    financialPeriodId: policy.financialPeriodId || null,
  };

  // Calculate payment statistics
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalRefunds = payments.reduce((sum, p) => sum + Number(p.refundAmount || 0), 0);
  const netPayments = totalPayments - totalRefunds;

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Suspended":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box flex items-start justify-between">
        <div>
          <p className="section-heading">Policy</p>
          <h4>{safePolicy.policyNumber}</h4>
          <p className="page-subtitle">Comprehensive policy information, customers, and payment history.</p>
        </div>
        <div className="flex items-center gap-2">
          <EditPolicyButton
            policy={{
              _id: safePolicy._id,
              policyNumber: safePolicy.policyNumber,
              policyIdNumber: safePolicy.policyIdNumber,
              coverageType: safePolicy.coverageType,
              registrationNumber: safePolicy.registrationNumber,
              engineNumber: safePolicy.engineNumber,
              chassisNumber: safePolicy.chassisNumber,
              vehicleType: safePolicy.vehicleType,
              coverageStartDate: safePolicy.coverageStartDate?.toISOString?.(),
              coverageEndDate: safePolicy.coverageEndDate?.toISOString?.(),
              totalPremiumDue: safePolicy.totalPremiumDue,
              status: safePolicy.status as any,
              notes: safePolicy.notes,
              customerIds: customerIds,
            }}
          />
          <DeletePolicyButton policyId={safePolicy._id} policyNumber={safePolicy.policyNumber} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="card">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Status</p>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(safePolicy.status)}`}>
            {safePolicy.status}
          </span>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Premium Due</p>
          <p className="mt-2 text-2xl font-bold text-[var(--ic-navy)]">
            ${safePolicy.totalPremiumDue.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Amount Paid</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            ${safePolicy.amountPaid.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Outstanding</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            ${safePolicy.outstandingBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Policy Details - Takes 2 columns */}
        <div className="card space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Policy Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Detail label="Policy Number" value={safePolicy.policyNumber} />
            <Detail label="Customer ID" value={customers.length > 0 ? (customers[0] as any).idNumber || "—" : "—"} />
            <Detail label="Coverage Type" value={safePolicy.coverageType} />
            <Detail label="Status" value={safePolicy.status} />
            <Detail
              label="Coverage Start"
              value={formatDateOnly(safePolicy.coverageStartDate)}
            />
            <Detail
              label="Coverage End"
              value={formatDateOnly(safePolicy.coverageEndDate)}
            />
            <Detail label="Total Premium Due" value={`$${safePolicy.totalPremiumDue.toFixed(2)}`} />
            <Detail label="Amount Paid" value={`$${safePolicy.amountPaid.toFixed(2)}`} />
            <Detail label="Outstanding Balance" value={`$${safePolicy.outstandingBalance.toFixed(2)}`} />
            <Detail
              label="Created"
              value={safePolicy.createdAt ? new Date(safePolicy.createdAt).toLocaleDateString() : "—"}
            />
            <Detail
              label="Last Updated"
              value={safePolicy.updatedAt ? new Date(safePolicy.updatedAt).toLocaleDateString() : "—"}
            />
            <Detail
              label="Renewal Notice Sent"
              value={
                safePolicy.renewalNoticeSentAt
                  ? new Date(safePolicy.renewalNoticeSentAt).toLocaleString()
                  : "Not sent"
              }
            />
          </div>

          {/* Vehicle Information Section */}
          <div className="border-t border-[var(--ic-gray-200)] pt-4">
            <h3 className="mb-3 text-base font-semibold text-[var(--ic-navy)]">Vehicle Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Registration Number" value={safePolicy.registrationNumber || "—"} />
              <Detail label="Vehicle Type" value={safePolicy.vehicleType || "—"} />
              <Detail label="Engine Number" value={safePolicy.engineNumber || "—"} />
              <Detail label="Chassis Number" value={safePolicy.chassisNumber || "—"} />
            </div>
          </div>

          {/* Notes Section */}
          {safePolicy.notes && (
            <div className="border-t border-[var(--ic-gray-200)] pt-4">
              <h3 className="mb-2 text-base font-semibold text-[var(--ic-navy)]">Notes</h3>
              <div className="rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3 text-sm text-[var(--ic-gray-700)]">
                {safePolicy.notes}
              </div>
            </div>
          )}
        </div>

        {/* Linked Customers - Takes 1 column */}
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
            Linked Customers <span className="badge info ml-2">{customers.length}</span>
          </h2>
          {!customers.length ? (
            <p className="text-sm text-[var(--ic-gray-600)]">No linked customers.</p>
          ) : (
            <ul className="space-y-2">
              {customers.map((c) => (
                <li
                  key={c._id.toString()}
                  className="rounded-lg border border-[var(--ic-gray-200)] bg-white p-3 transition hover:bg-[var(--ic-gray-50)] hover:shadow-sm"
                >
                  <Link
                    href={`/customers/${c._id.toString()}`}
                    className="font-semibold text-[var(--ic-navy)] hover:underline"
                  >
                    {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ")}
                  </Link>
                  <div className="mt-1 text-xs text-[var(--ic-gray-600)]">
                    <div>{c.email || "—"}</div>
                    <div>{c.contactNumber || "—"}</div>
                    <div>ID: {(c as any).idNumber || "—"}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Payment History</h2>
          <div className="flex items-center gap-3">
            <span className="badge success">Payments: ${totalPayments.toFixed(2)}</span>
            <span className="badge danger">Refunds: ${totalRefunds.toFixed(2)}</span>
            <span className="badge info">Net: ${netPayments.toFixed(2)}</span>
            <span className="badge">{payments.length} total</span>
          </div>
        </div>
        <table className="mt-4">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Receipt</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((pay) => (
              <tr key={pay._id.toString()}>
                <td>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                <td className={Number(pay.refundAmount || 0) > 0 ? "text-red-600" : ""}>
                  ${(Number(pay.amount) - Number(pay.refundAmount || 0)).toFixed(2)}
                  {Number(pay.refundAmount || 0) > 0 && (
                    <span className="ml-1 text-xs text-red-500">
                      (Refund: ${Number(pay.refundAmount).toFixed(2)})
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge ${pay.paymentMethod === "Cash" ? "warning" : "primary"}`}>
                    {pay.paymentMethod}
                  </span>
                </td>
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

      {/* Receipts Section */}
      {receipts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Associated Receipts</h2>
            <span className="badge info">{receipts.length} total</span>
          </div>
          <table className="mt-4">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt._id.toString()}>
                  <td className="font-mono text-sm">{(receipt as any).receiptNumber || "—"}</td>
                  <td>{new Date((receipt as any).paymentDate || receipt.paymentDate).toLocaleDateString()}</td>
                  <td>${Number((receipt as any).totalAmount || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${(receipt as any).status === "Voided" ? "danger" : "success"}`}>
                      {(receipt as any).status || "Issued"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/receipts/${receipt._id.toString()}`}
                      className="text-sm font-medium text-[var(--ic-teal)] hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Log / Edit History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[var(--ic-navy)] mb-4">Edit Log & History</h2>
        
        {/* Creation Info */}
        {(() => {
          const createLog = auditLogs.find((log: any) => log.action === "CREATE_POLICY");
          const lastEditLog = auditLogs.find((log: any) => log.action === "UPDATE_POLICY");
          const createUser = createLog?.userId as any;
          const lastEditUser = lastEditLog?.userId as any;
          
          return (
            <div className="mb-6 pb-6 border-b border-[var(--ic-gray-200)]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)] mb-1">Created By</p>
                  <p className="text-sm font-semibold text-[var(--ic-navy)]">
                    {createdByUser
                      ? `${(createdByUser as any).fullName} (${(createdByUser as any).username})`
                      : createUser
                        ? `${createUser.fullName || "Unknown"} (${createUser.username || "N/A"})`
                        : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)] mb-1">Created At</p>
                  <p className="text-sm font-semibold text-[var(--ic-navy)]">
                    {safePolicy.createdAt
                      ? new Date(safePolicy.createdAt).toLocaleString()
                      : createLog
                        ? new Date(createLog.createdAt).toLocaleString()
                        : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)] mb-1">Last Edited By</p>
                  <p className="text-sm font-semibold text-[var(--ic-navy)]">
                    {lastEditUser
                      ? `${lastEditUser.fullName || "Unknown"} (${lastEditUser.username || "N/A"})`
                      : "No edits yet"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)] mb-1">Last Edited At</p>
                  <p className="text-sm font-semibold text-[var(--ic-navy)]">
                    {safePolicy.updatedAt
                      ? new Date(safePolicy.updatedAt).toLocaleString()
                      : lastEditLog
                        ? new Date(lastEditLog.createdAt).toLocaleString()
                        : "—"}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* All Edits History */}
        {(() => {
          const editLogs = auditLogs.filter((log: any) => log.action === "UPDATE_POLICY");
          return (
            <div>
              <h3 className="text-base font-semibold text-[var(--ic-navy)] mb-3">
                All Edits ({editLogs.length})
              </h3>
              {editLogs.length > 0 ? (
                <div className="space-y-3">
                  {editLogs.map((log: any, index: number) => {
                    const user = log.userId as any;
                    return (
                      <div
                        key={log._id.toString()}
                        className="rounded-lg border border-[var(--ic-gray-200)] bg-white p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-[var(--ic-gray-600)]">
                                Edit #{editLogs.length - index}
                              </span>
                              <span className="text-xs text-[var(--ic-gray-500)]">•</span>
                              <span className="text-xs text-[var(--ic-gray-600)]">
                                {user?.fullName || "Unknown"} ({user?.username || "N/A"})
                              </span>
                            </div>
                            <p className="text-xs text-[var(--ic-gray-500)]">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--ic-gray-600)] italic">No edits recorded yet.</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Quick Actions */}
      <div className="card bg-[var(--ic-gray-50)]">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Quick Actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/policies/${safePolicy._id}/notice`}
            className="btn btn-ghost border-[var(--ic-gray-200)]"
          >
            📄 Generate Notice
          </Link>
          <Link
            href={`/payments/advanced?policyId=${safePolicy._id}`}
            className="btn btn-primary"
          >
            💰 Record Payment
          </Link>
          {customers.length > 0 && (
            <Link
              href={`/customers/${customers[0]._id.toString()}`}
              className="btn btn-ghost border-[var(--ic-gray-200)]"
            >
              👤 View Primary Customer
            </Link>
          )}
        </div>
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


