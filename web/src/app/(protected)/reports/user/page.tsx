import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { redirect, notFound } from "next/navigation";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { PrintButton } from "@/components/PrintButton";

type SearchParams = {
  username?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

function pick(value?: string | string[]) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date | null) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date | null) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function UserReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const auth = await guardPermission("generate_user_report");
  if ("response" in auth) {
    redirect("/login");
  }

  const params = await searchParams;
  const username = pick(params.username).trim();
  if (!username) {
    return (
      <div className="p-6 space-y-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">User report</p>
              <h1 className="text-2xl font-semibold text-[var(--ic-navy)]">Select a user</h1>
              <p className="text-sm text-[var(--ic-gray-600)]">Go back to Reports to choose a username.</p>
            </div>
            <a href="/reports" className="btn">
              Back
            </a>
          </div>
        </div>
      </div>
    );
  }

  const from = startOfDay(parseDate(pick(params.from)));
  const to = endOfDay(parseDate(pick(params.to)));

  await connectDb();
  const user = await User.findOne({ username }).lean();
  if (!user) return notFound();

  const dateFilter = from || to ? { $gte: from || new Date(0), $lte: to || new Date() } : undefined;

  const [auditLogs, payments, receipts] = await Promise.all([
    AuditLog.find({
      userId: user._id,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Payment.find({
      receivedBy: user._id,
      ...(dateFilter ? { paymentDate: dateFilter } : {}),
    })
      .populate("policyId", "policyNumber")
      .sort({ paymentDate: -1 })
      .lean(),
    Receipt.find({
      generatedBy: user._id,
      ...(dateFilter ? { paymentDate: dateFilter } : {}),
    })
      .populate("policyId", "policyNumber")
      .sort({ paymentDate: -1 })
      .lean(),
  ]);

  return (
    <div className="space-y-6 p-6 print:p-0">
      <div className="card print:border-none print:shadow-none">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">User report</p>
            <h1 className="text-2xl font-semibold text-[var(--ic-navy)]">{user.fullName}</h1>
            <p className="text-sm text-[var(--ic-gray-700)]">
              {user.username} · {user.email} · {user.role} · {user.users_location || "—"}
            </p>
            {from || to ? (
              <p className="text-sm text-[var(--ic-gray-600)]">
                Range: {from ? from.toISOString().slice(0, 10) : "—"} to{" "}
                {to ? to.toISOString().slice(0, 10) : "—"}
              </p>
            ) : (
              <p className="text-sm text-[var(--ic-gray-600)]">Range: all time</p>
            )}
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <a href="/reports" className="btn">
              Back
            </a>
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card print:border-none print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">Audit entries</p>
          <h3 className="text-2xl font-semibold text-[var(--ic-navy)]">{auditLogs.length}</h3>
        </div>
        <div className="card print:border-none print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">Payments recorded</p>
          <h3 className="text-2xl font-semibold text-[var(--ic-navy)]">{payments.length}</h3>
        </div>
        <div className="card print:border-none print:shadow-none">
          <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">Receipts generated</p>
          <h3 className="text-2xl font-semibold text-[var(--ic-navy)]">{receipts.length}</h3>
        </div>
      </div>

      <div className="card print:border-none print:shadow-none">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Payments</h3>
        </div>
        <table className="mt-3 w-full border border-[var(--ic-gray-200)] text-sm">
          <thead className="bg-[var(--ic-gray-50)]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Policy
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Amount
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Method
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ic-gray-200)]">
            {payments.map((p: any) => (
              <tr key={p._id.toString()}>
                <td className="px-3 py-2">{(p.policyId as any)?.policyNumber || "—"}</td>
                <td className="px-3 py-2">${(p.amount || 0).toFixed(2)}</td>
                <td className="px-3 py-2">{p.paymentMethod || "—"}</td>
                <td className="px-3 py-2">{p.paymentDate ? new Date(p.paymentDate).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-sm text-[var(--ic-gray-600)]">
                  No payments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card print:border-none print:shadow-none">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Receipts</h3>
        </div>
        <table className="mt-3 w-full border border-[var(--ic-gray-200)] text-sm">
          <thead className="bg-[var(--ic-gray-50)]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Receipt #
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Policy
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Amount
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ic-gray-200)]">
            {receipts.map((r: any) => (
              <tr key={r._id.toString()}>
                <td className="px-3 py-2">{r.receiptNumber}</td>
                <td className="px-3 py-2">{(r.policyId as any)?.policyNumber || r.policyNumberSnapshot || "—"}</td>
                <td className="px-3 py-2">${(r.amount || 0).toFixed(2)}</td>
                <td className="px-3 py-2">{r.status || "active"}</td>
                <td className="px-3 py-2">{r.paymentDate ? new Date(r.paymentDate).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!receipts.length && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-sm text-[var(--ic-gray-600)]">
                  No receipts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card print:border-none print:shadow-none">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Activity (audit log)</h3>
        </div>
        <table className="mt-3 w-full border border-[var(--ic-gray-200)] text-sm">
          <thead className="bg-[var(--ic-gray-50)]">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                When
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Action
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Entity
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--ic-gray-600)]">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ic-gray-200)]">
            {auditLogs.map((log: any) => (
              <tr key={log._id.toString()}>
                <td className="px-3 py-2">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</td>
                <td className="px-3 py-2">{log.action}</td>
                <td className="px-3 py-2">
                  {log.entityType}
                  {log.entityId ? ` (${log.entityId})` : ""}
                </td>
                <td className="px-3 py-2 text-xs text-[var(--ic-gray-700)]">
                  {log.details ? JSON.stringify(log.details) : "—"}
                </td>
              </tr>
            ))}
            {!auditLogs.length && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-sm text-[var(--ic-gray-600)]">
                  No activity found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


