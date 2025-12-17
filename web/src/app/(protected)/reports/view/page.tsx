import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { Policy } from "@/models/Policy";
import { PrintButton } from "@/components/PrintButton";
import { EmailCashStatementButton } from "@/components/EmailCashStatementButton";
import "@/models/StatementRecipient";
import { StatementRecipient } from "@/models/StatementRecipient";

type SearchParams = {
  type?: string | string[];
  from?: string | string[];
  to?: string | string[];
  prefix?: string | string[];
  q?: string | string[];
};

function parseDate(value?: string | string[] | null): Date | null {
  if (!value) return null;
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return null;
  // Parse date inputs (yyyy-mm-dd) in local time to avoid UTC shift.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
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

export default async function ReportsViewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const type = (Array.isArray(params.type) ? params.type[0] : params.type) || "cash";
  const prefixParam = (Array.isArray(params.prefix) ? params.prefix[0] : params.prefix) || "";
  const qParam = (Array.isArray(params.q) ? params.q[0] : params.q) || "";
  const fromParam = startOfDay(parseDate(params.from));
  const toParam = endOfDay(parseDate(params.to));

  const from = fromParam ?? startOfDay(new Date(0))!;
  const to = toParam ?? endOfDay(new Date())!;

  await connectDb();

  let cashRows: any[] = [];
  let outstandingRows: any[] = [];
  let renewalRows: any[] = [];
  let total = 0;
  let totalCash = 0;
  let totalCard = 0;
  let totalTransfer = 0;
  let totalOutstanding = 0;
  let cashEmailRows: any[] = [];
  let statementRecipients: { email: string; name?: string }[] = [];

  if (type === "cash") {
    // Build filter with prefix early if provided
    const receiptFilter: any = {
      paymentDate: { $gte: from, $lte: to },
    };
    
    // If prefix filter is provided, add it to the query (more efficient than filtering in memory)
    if (prefixParam && prefixParam !== "ALL") {
      receiptFilter.policyNumberSnapshot = { $regex: `^${prefixParam}-` };
    }
    
    const receipts = await Receipt.find(receiptFilter)
      .populate({
        path: "policyId",
        select: "policyNumber policyIdNumber coverageStartDate coverageEndDate customerId customerIds",
        populate: [
          { path: "customerId", select: "firstName lastName middleName" },
          { path: "customerIds", select: "firstName lastName middleName" },
        ],
      })
      .populate({
        path: "customerId",
        select: "firstName lastName middleName",
      })
      .populate("paymentId", "refundAmount amount paymentMethod")
      .sort({ paymentDate: -1 })
      .lean();

    cashRows = receipts.map((r: any) => {
      const policy = r.policyId as any;
      const receiptCustomer = r.customerId as any;
      const policyIdNumber =
        policy?.policyIdNumber ||
        (r as any)?.policyIdNumberSnapshot ||
        policy?._id?.toString?.() ||
        "—";
      const policyNumber = policy?.policyNumber || r.policyNumberSnapshot || policy?._id?.toString?.() || "—";
      const customerFromPolicy = [policy?.customerId, ...(Array.isArray(policy?.customerIds) ? policy.customerIds : [])]
        .filter(Boolean)
        .map(
          (c: any) =>
            `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim(),
        )
        .filter(Boolean)
        .join(", ");
      const customerFromReceipt = receiptCustomer
        ? `${receiptCustomer?.firstName ?? ""} ${receiptCustomer?.middleName ?? ""} ${receiptCustomer?.lastName ?? ""}`.trim()
        : "";

      return {
        _id: r._id.toString(),
        receiptNumber: r.receiptNumber,
        policyNumber,
        policyIdNumber,
        customerName: r.customerNameSnapshot || customerFromPolicy || customerFromReceipt || "—",
        coverageStartDate: policy?.coverageStartDate,
        coverageEndDate: policy?.coverageEndDate,
        amount: r.amount,
        refundAmount:
          typeof (r.paymentId as any)?.refundAmount === "number" ? (r.paymentId as any).refundAmount : 0,
        netAmount: r.amount,
        paymentMethod: r.paymentMethod,
        paymentDate: r.paymentDate,
        receiptStatus: r.status || "active",
      };
    });

    cashEmailRows = cashRows.map((r) => ({
      receiptNumber: r.receiptNumber,
      policyNumber: r.policyNumber,
      policyIdNumber: r.policyIdNumber,
      customerName: r.customerName || "—",
      coverageStartDate: r.coverageStartDate ? new Date(r.coverageStartDate).toISOString() : null,
      coverageEndDate: r.coverageEndDate ? new Date(r.coverageEndDate).toISOString() : null,
      amount: r.amount,
      refundAmount: r.refundAmount,
      netAmount: r.netAmount,
      paymentMethod: r.paymentMethod,
      paymentDate: r.paymentDate ? new Date(r.paymentDate).toISOString() : null,
      receiptStatus: r.receiptStatus,
    }));

    const recips = await StatementRecipient.find().sort({ email: 1 }).lean();
    statementRecipients = recips.map((r: any) => ({ email: r.email, name: r.name }));

    // Prefix filtering is now done in the query above, only apply search filter if needed
    if (qParam) {
      const qLower = qParam.toLowerCase();
      cashRows = cashRows.filter((p) => {
        const policyNumber = p.policyNumber || "";
        const receiptNumber = p.receiptNumber || "";
        const customerName = p.customerName || "";
        return (
          policyNumber.toLowerCase().includes(qLower) ||
          receiptNumber.toLowerCase().includes(qLower) ||
          customerName.toLowerCase().includes(qLower)
        );
      });
    }

    // Exclude voided amounts from totals but still show rows
    cashRows.forEach((p) => {
      const rowAmount = p.receiptStatus === "void" ? 0 : p.amount || 0;
      const method = (p.paymentMethod || "Cash").toLowerCase();
      if (method === "card") {
        totalCard += rowAmount;
      } else if (method === "transfer") {
        totalTransfer += rowAmount;
      } else {
        totalCash += rowAmount;
      }
    });
    total = totalCash;
  } else if (type === "outstanding") {
    const policies = await Policy.find({
      outstandingBalance: { $gt: 0 },
      ...(fromParam || toParam ? { coverageEndDate: { $gte: from, $lte: to } } : {}),
    })
      .populate("customerId", "firstName lastName middleName")
      .populate("customerIds", "firstName lastName middleName")
        .sort({ coverageEndDate: 1 })
      .lean();

    const policyIds = policies.map((p: any) => p._id);
    const paymentsByPolicy = await Payment.find({
      policyId: { $in: policyIds },
    })
      .sort({ paymentDate: -1 })
      .lean();

    outstandingRows = policies.map((p: any) => ({
      _id: p._id.toString(),
      policyNumber: p.policyNumber,
      customerName: [
        p.customerId,
        ...(Array.isArray(p.customerIds) ? p.customerIds : []),
      ]
        .filter(Boolean)
        .map(
          (c: any) =>
            `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim(),
        )
        .filter(Boolean)
        .join(", "),
      outstandingBalance: p.outstandingBalance,
      coverageEndDate: p.coverageEndDate,
      coverageStartDate: p.coverageStartDate,
      latestReceiptNumber:
        paymentsByPolicy.find((pay) => pay.policyId?.toString() === p._id.toString())
          ?.receiptNumber || "—",
    }));
    totalOutstanding = outstandingRows.reduce(
      (sum, r) => sum + (r.outstandingBalance || 0),
      0,
    );
  } else if (type === "renewals") {
    const policies = await Policy.find({
      coverageEndDate: { $gte: from, $lte: to },
    })
      .populate("customerId", "firstName lastName middleName")
      .populate("customerIds", "firstName lastName middleName")
      .sort({ coverageEndDate: 1 })
      .lean();

    const policyIds = policies.map((p: any) => p._id);
    const paymentsByPolicy = await Payment.find({
      policyId: { $in: policyIds },
    })
      .sort({ paymentDate: -1 })
      .lean();

    renewalRows = policies.map((p: any) => ({
      _id: p._id.toString(),
      policyNumber: p.policyNumber,
      customerName: [
        p.customerId,
        ...(Array.isArray(p.customerIds) ? p.customerIds : []),
      ]
        .filter(Boolean)
        .map(
          (c: any) =>
            `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim(),
        )
        .filter(Boolean)
        .join(", "),
      coverageEndDate: p.coverageEndDate,
      coverageStartDate: p.coverageStartDate,
      outstandingBalance: p.outstandingBalance,
      latestReceiptNumber:
        paymentsByPolicy.find((pay) => pay.policyId?.toString() === p._id.toString())
          ?.receiptNumber || "—",
    }));
  }

  const reportTitle =
    type === "cash"
      ? "Cash report"
      : type === "outstanding"
      ? "Outstanding balance"
      : "Renewal listing";

  const dateRangeLabel = `From ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`;

  const summaryItems =
    type === "cash"
      ? [
          { label: "Cash collected", value: `$${totalCash.toFixed(2)}` },
          { label: "Card total (not in cash)", value: `$${totalCard.toFixed(2)}` },
          { label: "Transfer total (not in cash)", value: `$${totalTransfer.toFixed(2)}` },
          { label: "Receipts", value: `${cashRows.length}` },
        ]
      : type === "outstanding"
      ? [
          { label: "Policies with balance", value: `${outstandingRows.length}` },
          { label: "Total outstanding", value: `$${totalOutstanding.toFixed(2)}` },
        ]
      : [
          { label: "Renewals in range", value: `${renewalRows.length}` },
          {
            label: "Outstanding (sum)",
            value: `$${renewalRows
              .reduce((sum, r) => sum + (r.outstandingBalance || 0), 0)
              .toFixed(2)}`,
          },
        ];

  return (
    <>
      <div className="space-y-4 p-6 print:p-0 print:[writing-mode:horizontal-tb] print:[page:size:landscape]">
        <div className="card print:border-none print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/IC-LOGO-NEW.png"
                alt="Combined Insurance Services"
                className="h-14 w-14 object-contain print:h-12 print:w-12"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--ic-navy)]">
                  Combined Insurance Services (St. Lucia) Ltd.
                </p>
                <p className="text-xs text-[var(--ic-gray-600)]">
                  P.O. GM 636, Gablewoods Mall, Castries, St. Lucia · Tel: 758 456-0700
                </p>
                <p className="text-xs text-[var(--ic-gray-600)]">
                  info@combinedinsuranceslu.com · www.combinedinsuranceslu.com
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <a href="/reports" className="btn">
                Back
              </a>
              {type === "cash" && (
                <EmailCashStatementButton
                  rows={cashEmailRows}
                  total={total}
                  totalCash={totalCash}
                  totalCard={totalCard}
                  totalTransfer={totalTransfer}
                  from={from.toISOString()}
                  to={to.toISOString()}
                  recipients={statementRecipients}
                />
              )}
              <PrintButton />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">Report</p>
              <h1 className="text-2xl font-semibold text-[var(--ic-navy)]">{reportTitle}</h1>
              <p className="text-sm text-[var(--ic-gray-700)]">{dateRangeLabel}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-[var(--ic-navy)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {type === "cash" && (
          <div className="card print:border-none print:shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Cash report</h3>
              <div className="text-sm font-semibold text-[var(--ic-navy)] space-y-1 text-right">
                <div>Cash total: ${totalCash.toFixed(2)}</div>
                <div className="text-[var(--ic-gray-600)] text-xs">
                  Card: ${totalCard.toFixed(2)} · Transfer (not in cash total): ${totalTransfer.toFixed(2)}
                </div>
              </div>
            </div>
            <table className="mt-4">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Policy</th>
                  <th>Policy ID</th>
                  <th>Coverage period</th>
                  <th>Receipt #</th>
                  <th>Status</th>
                <th>Amount</th>
                <th>Refund</th>
                <th>Net</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {cashRows.map((p) => (
                  <tr key={p._id.toString()}>
                  <td>{p.customerName}</td>
                  <td>{p.policyNumber}</td>
                  <td>{p.policyIdNumber || "—"}</td>
                  <td>
                    {p.coverageStartDate
                      ? new Date(p.coverageStartDate).toLocaleDateString()
                      : "—"}{" "}
                    to{" "}
                    {p.coverageEndDate
                      ? new Date(p.coverageEndDate).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>{p.receiptNumber}</td>
                    <td>
                      {(p as any).receiptStatus === "void" ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          VOID
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          ACTIVE
                        </span>
                      )}
                    </td>
                  <td>${(p.amount || 0).toFixed(2)}</td>
                  <td>${(p.refundAmount ?? 0).toFixed(2)}</td>
                  <td>${(p.netAmount ?? p.amount ?? 0).toFixed(2)}</td>
                  <td>{p.paymentMethod}</td>
                  <td>{new Date(p.paymentDate).toLocaleString()}</td>
                  </tr>
                ))}
                {!cashRows.length && (
                  <tr>
                  <td colSpan={10} className="py-4 text-center text-sm text-slate-500">
                      No payments found in range.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}></td>
                  <td colSpan={5}>
                    <div className="flex flex-col items-end gap-1">
                      <span>Cash total: ${totalCash.toFixed(2)}</span>
                      <span className="text-xs text-[var(--ic-gray-600)]">
                        Card: ${totalCard.toFixed(2)} · Transfer (not in cash total): ${totalTransfer.toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[var(--ic-gray-200)] p-4">
                <p className="text-sm text-[var(--ic-gray-700)]">
                  I certify that the information contained in this report is accurate and complete to the best of my
                  knowledge.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--ic-gray-200)] p-4 grid gap-2 text-sm text-[var(--ic-gray-700)]">
                <div>
                  <p className="font-semibold text-[var(--ic-navy)]">Prepared by</p>
                  <div className="h-8 border-b border-[var(--ic-gray-300)]"></div>
                </div>
                <div>
                  <p className="font-semibold text-[var(--ic-navy)]">Authorized signature</p>
                  <div className="h-8 border-b border-[var(--ic-gray-300)]"></div>
                </div>
                <p className="text-xs text-[var(--ic-gray-600)]">
                  Report generated on {new Date().toLocaleString()} by System
                </p>
              </div>
            </div>
          </div>
        )}

        {type === "outstanding" && (
          <div className="card print:border-none print:shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
                Outstanding balance
              </h3>
              <div className="text-sm font-semibold text-[var(--ic-navy)]">
                Total outstanding: ${totalOutstanding.toFixed(2)}
              </div>
            </div>
            <table className="mt-4">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Customer</th>
                  <th>Coverage period</th>
                  <th>Receipt #</th>
                  <th>Outstanding</th>
                  <th>Coverage end</th>
                </tr>
              </thead>
              <tbody>
                {outstandingRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.policyNumber}</td>
                    <td>{r.customerName}</td>
                    <td>
                      {r.coverageStartDate
                        ? new Date(r.coverageStartDate).toLocaleDateString()
                        : "—"}{" "}
                      to{" "}
                      {r.coverageEndDate
                        ? new Date(r.coverageEndDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>{r.latestReceiptNumber}</td>
                    <td>${r.outstandingBalance.toFixed(2)}</td>
                    <td>
                      {r.coverageEndDate
                        ? new Date(r.coverageEndDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
                {!outstandingRows.length && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                      No outstanding policies found in range.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}></td>
                  <td colSpan={2}>Total outstanding: ${totalOutstanding.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {type === "renewals" && (
          <div className="card print:border-none print:shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Renewal listing</h3>
              <div className="text-sm text-[var(--ic-gray-600)]">
                Coverage end between {from.toISOString().slice(0, 10)} and{" "}
                {to.toISOString().slice(0, 10)}
              </div>
            </div>
            <table className="mt-4">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Customer</th>
                  <th>Coverage period</th>
                  <th>Receipt #</th>
                  <th>Coverage end</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {renewalRows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.policyNumber}</td>
                    <td>{r.customerName}</td>
                    <td>
                      {r.coverageStartDate
                        ? new Date(r.coverageStartDate).toLocaleDateString()
                        : "—"}{" "}
                      to{" "}
                      {r.coverageEndDate
                        ? new Date(r.coverageEndDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>{r.latestReceiptNumber}</td>
                    <td>
                      {r.coverageEndDate
                        ? new Date(r.coverageEndDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {typeof r.outstandingBalance === "number"
                        ? `$${r.outstandingBalance.toFixed(2)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {!renewalRows.length && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                      No renewals found in range.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}></td>
                  <td>
                    Total outstanding: $
                    {renewalRows
                      .reduce((sum, r) => sum + (r.outstandingBalance || 0), 0)
                      .toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

