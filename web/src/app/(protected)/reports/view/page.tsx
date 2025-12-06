import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";
import { PrintButton } from "@/components/PrintButton";

type SearchParams = {
  type?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

function parseDate(value?: string | string[] | null): Date | null {
  if (!value) return null;
  const v = Array.isArray(value) ? value[0] : value;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export default async function ReportsViewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const type = (Array.isArray(params.type) ? params.type[0] : params.type) || "cash";
  const fromParam = parseDate(params.from);
  const toParam = parseDate(params.to);

  const from = fromParam ?? new Date(0);
  const to = toParam ?? new Date();

  await connectDb();

  let cashRows: any[] = [];
  let outstandingRows: any[] = [];
  let renewalRows: any[] = [];
  let total = 0;
  let totalOutstanding = 0;

  if (type === "cash") {
    cashRows = await Payment.find({
      paymentDate: { $gte: from, $lte: to },
    })
      .populate({
        path: "policyId",
        select: "policyNumber coverageStartDate coverageEndDate customerId",
        populate: { path: "customerId", select: "firstName lastName" },
      })
      .sort({ paymentDate: -1 })
      .lean();
    total = cashRows.reduce((sum, p) => sum + (p.amount || 0), 0);
  } else if (type === "outstanding") {
    const policies = await Policy.find({
      outstandingBalance: { $gt: 0 },
      ...(fromParam || toParam ? { coverageEndDate: { $gte: from, $lte: to } } : {}),
    })
      .populate("customerId", "firstName lastName")
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
      customerName: [p.customerId?.firstName, p.customerId?.lastName]
        .filter(Boolean)
        .join(" "),
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
      .populate("customerId", "firstName lastName")
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
      customerName: [p.customerId?.firstName, p.customerId?.lastName]
        .filter(Boolean)
        .join(" "),
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
          { label: "Total collected", value: `$${total.toFixed(2)}` },
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
      <div className="space-y-4 p-6 print:p-0">
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
            <div className="print:hidden">
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
              <div className="text-sm font-semibold text-[var(--ic-navy)]">
                Total: ${total.toFixed(2)}
              </div>
            </div>
            <table className="mt-4">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Policy</th>
                  <th>Coverage period</th>
                  <th>Receipt #</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {cashRows.map((p) => (
                  <tr key={p._id.toString()}>
                    <td>
                      {[p.policyId?.customerId?.firstName, p.policyId?.customerId?.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </td>
                    <td>{p.policyId?.policyNumber}</td>
                    <td>
                      {p.policyId?.coverageStartDate
                        ? new Date(p.policyId.coverageStartDate).toLocaleDateString()
                        : "—"}{" "}
                      to{" "}
                      {p.policyId?.coverageEndDate
                        ? new Date(p.policyId.coverageEndDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>{p.receiptNumber}</td>
                    <td>${(p.amount || 0).toFixed(2)}</td>
                    <td>{p.paymentMethod}</td>
                    <td>{new Date(p.paymentDate).toLocaleString()}</td>
                  </tr>
                ))}
                {!cashRows.length && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-sm text-slate-500">
                      No payments found in range.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}></td>
                  <td colSpan={3}>Total: ${total.toFixed(2)}</td>
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

