import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";
import { Receipt } from "@/models/Receipt";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { DeletePaymentButton } from "@/components/DeletePaymentButton";
import { Pagination } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import { guardSession } from "@/lib/api-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");
const ITEMS_PER_PAGE = 20;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const auth = await guardSession();
  if ("response" in auth) {
    redirect("/login");
  }
  const canVoid = auth.session.role === "Admin";

  const params = await searchParams;
  const page = Math.max(1, parseInt(normalize(params.page)) || 1);
  const sortBy = normalize(params.sortBy) || "paymentDate";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  
  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    amount: "amount",
    paymentDate: "paymentDate",
    paymentMethod: "paymentMethod",
    createdAt: "createdAt",
  };
  const dbSortField = sortFieldMap[sortBy] || "paymentDate";
  sortObject[dbSortField] = sortOrder;

  const [totalCount, payments] = await Promise.all([
    Payment.countDocuments(),
    Payment.find()
      .select("amount refundAmount paymentMethod paymentDate policyId")
      .populate({
        path: "policyId",
        select: "policyNumber policyIdNumber totalPremiumDue outstandingBalance customerId customerIds",
        populate: [
          { path: "customerId", select: "firstName lastName email contactNumber" },
          { path: "customerIds", select: "firstName lastName" },
        ],
      })
      .sort(sortObject)
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const paymentIds = payments.map((p) => p._id);
  const [receipts, policies] = await Promise.all([
    Receipt.find({ paymentId: { $in: paymentIds } }).select("_id paymentId receiptNumber").lean(),
    Policy.find()
      .select("policyNumber policyIdNumber totalPremiumDue outstandingBalance customerId customerIds")
      .populate("customerId", "firstName lastName")
      .populate("customerIds", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  const receiptByPayment: Record<string, { _id: string; receiptNumber: string }> = {};
  receipts.forEach((r) => {
    receiptByPayment[String(r.paymentId)] = { _id: r._id.toString(), receiptNumber: r.receiptNumber };
  });

  const paymentRows = payments.map((p: any) => {
    const policy = p.policyId as any;
    const customer = policy?.customerId as any;
    const customers = [
      ...(Array.isArray(policy?.customerIds) ? policy.customerIds : []),
      customer,
    ].filter(Boolean);
    const names = Array.from(
      new Set(
        customers
          .map((c: any) => `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim())
          .filter(Boolean),
      ),
    ).join(", ");
    const refund = typeof p.refundAmount === "number" ? p.refundAmount : 0;
    const net = typeof p.amount === "number" ? p.amount : 0;
    return {
      _id: p._id.toString(),
      policyId: policy?._id?.toString?.() || "",
      amount: net,
      refundAmount: refund,
      grossAmount: net + refund,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      policyNumber: policy?.policyNumber,
      policyIdNumber: policy?.policyIdNumber,
      totalPremiumDueDisplay:
        typeof policy?.totalPremiumDue === "number"
          ? `$${policy.totalPremiumDue.toFixed(2)}`
          : undefined,
      customerName: names,
      customerEmail: customer?.email || "",
      customerContact: customer?.contactNumber || "",
      outstandingBalance: policy?.outstandingBalance,
    };
  });

  const policyOptions = policies.map((p) => {
    const customers = [
      p.customerId,
      ...(Array.isArray(p.customerIds) ? p.customerIds : []),
    ].filter(Boolean) as any[];
    const name = customers
      .map((c) => `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim())
      .filter(Boolean)
      .join(", ");
    return {
      id: p._id.toString(),
      policyNumber: p.policyNumber,
      policyIdNumber: p.policyIdNumber,
      customerName: name,
      outstandingBalance: p.outstandingBalance,
    };
  });

  const totalPremiumDue = policies.reduce((sum, p: any) => sum + (p.totalPremiumDue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Billing</p>
        <h4>Payments</h4>
        <p className="page-subtitle">
          Record full payments or jump to advanced options for partials, refunds, and account management.
        </p>
        <div className="mt-2">
          <a className="btn btn-secondary" href="/payments/advanced">
            Advanced payment options
          </a>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[var(--ic-gray-100)] px-3 py-1 font-semibold text-[var(--ic-navy)]">
            Total premium due (all policies): ${totalPremiumDue.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Recent payments</h2>
            <span className="badge success"> {totalCount} records</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Policy ID</th>
                  <th>Customer</th>
                  <th>Total Premium Due</th>
                  <th>
                    <SortableHeader
                      field="amount"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Amount"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
                  <th>Outstanding</th>
                  <th>
                    <SortableHeader
                      field="paymentMethod"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Method"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="paymentDate"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Date"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
                  <th className="text-right">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((p) => (
                  <tr key={p._id}>
                  <td>
                    <a
                      href={`/policies/${p.policyId}`}
                      className="text-[var(--ic-navy)] underline"
                      title="View policy"
                    >
                      {p.policyNumber}
                    </a>
                  </td>
                    <td>{p.policyIdNumber || "—"}</td>
                    <td>{p.customerName}</td>
                    <td>{p.totalPremiumDueDisplay || "—"}</td>
                    <td>${p.amount.toFixed(2)}</td>
                    <td>
                      {typeof p.outstandingBalance === "number"
                        ? `$${p.outstandingBalance.toFixed(2)}`
                        : "—"}
                    </td>
                    <td>{p.paymentMethod}</td>
                    <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {receiptByPayment[p._id] ? (
                          <a
                            href={`/receipts/${receiptByPayment[p._id]._id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
                            target="_blank"
                            title="View receipt"
                            aria-label="View receipt"
                          >
                            🔍
                          </a>
                        ) : (
                          <span className="text-sm text-[var(--ic-gray-500)]">No receipt</span>
                        )}
                        {canVoid && <DeletePaymentButton paymentId={p._id} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {!paymentRows.length && (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-sm text-slate-500">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/payments"
            searchParams={params}
          />
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Record payment</h2>
          <p className="text-sm text-[var(--ic-gray-600)]">
            Full payments only. For partial payments, refunds, or account adjustments use Advanced Payment
            Options.
          </p>
          <div className="mt-3">
            <PaymentForm policies={policyOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

