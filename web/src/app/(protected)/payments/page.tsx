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
  
  // Build sort object for direct payment fields
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    amount: "amount",
    paymentDate: "paymentDate",
    paymentMethod: "paymentMethod",
    createdAt: "createdAt",
    policyNumber: "policyNumber", // Will sort in memory
    policyIdNumber: "policyIdNumber", // Will sort in memory
    customerName: "customerName", // Will sort in memory
    outstandingBalance: "outstandingBalance", // Will sort in memory
    totalPremiumDue: "totalPremiumDue", // Will sort in memory
  };
  
  // Check if we need to sort by a nested field (requires in-memory sorting)
  const requiresMemorySort = ["policyNumber", "policyIdNumber", "customerName", "outstandingBalance", "totalPremiumDue"].includes(sortBy);
  
  // For direct payment fields, use MongoDB sort
  if (!requiresMemorySort) {
    const dbSortField = sortFieldMap[sortBy] || "paymentDate";
    sortObject[dbSortField] = sortOrder;
  } else {
    // Default sort by paymentDate for initial fetch, then sort in memory
    sortObject["paymentDate"] = -1;
  }

  // For nested field sorting, fetch all records, sort in memory, then paginate
  // For direct field sorting, use MongoDB sort with pagination
  const [totalCount, allPayments] = await Promise.all([
    Payment.countDocuments(),
    Payment.find()
      .select("amount refundAmount paymentMethod paymentDate policyId createdAt")
      .populate({
        path: "policyId",
        select: "policyNumber policyIdNumber totalPremiumDue outstandingBalance customerId customerIds",
        populate: [
          { path: "customerId", select: "firstName lastName email contactNumber" },
          { path: "customerIds", select: "firstName lastName" },
        ],
      })
      .sort(sortObject)
      .lean(),
  ]);

  // If sorting by nested field, we need all records to sort properly
  // Otherwise, we can paginate at DB level
  let payments;
  if (requiresMemorySort) {
    payments = allPayments; // Will paginate after sorting
  } else {
    payments = allPayments.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }

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

  let paymentRows = payments.map((p: any) => {
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
      policyNumber: policy?.policyNumber || "",
      policyIdNumber: policy?.policyIdNumber || "",
      totalPremiumDue: typeof policy?.totalPremiumDue === "number" ? policy.totalPremiumDue : 0,
      totalPremiumDueDisplay:
        typeof policy?.totalPremiumDue === "number"
          ? `$${policy.totalPremiumDue.toFixed(2)}`
          : undefined,
      customerName: names,
      customerEmail: customer?.email || "",
      customerContact: customer?.contactNumber || "",
      outstandingBalance: typeof policy?.outstandingBalance === "number" ? policy.outstandingBalance : 0,
    };
  });

  // Sort in memory for nested fields
  if (requiresMemorySort) {
    paymentRows.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortBy) {
        case "policyNumber":
          aVal = (a.policyNumber || "").toLowerCase();
          bVal = (b.policyNumber || "").toLowerCase();
          break;
        case "policyIdNumber":
          aVal = (a.policyIdNumber || "").toLowerCase();
          bVal = (b.policyIdNumber || "").toLowerCase();
          break;
        case "customerName":
          aVal = (a.customerName || "").toLowerCase();
          bVal = (b.customerName || "").toLowerCase();
          break;
        case "outstandingBalance":
          aVal = a.outstandingBalance;
          bVal = b.outstandingBalance;
          break;
        case "totalPremiumDue":
          aVal = a.totalPremiumDue;
          bVal = b.totalPremiumDue;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return -sortOrder;
      if (aVal > bVal) return sortOrder;
      return 0;
    });
  }

  // Apply pagination after sorting
  const totalRows = paymentRows.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  paymentRows = paymentRows.slice(startIdx, endIdx);

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

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Billing</p>
        <h4>Payments</h4>
        <p className="page-subtitle">
          Record full payments or jump to advanced options for partials, refunds, and account management.
        </p>
        <div className="mt-3">
          <a 
            className="btn btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-base font-semibold" 
            href="/payments/advanced"
          >
            <svg 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
              />
            </svg>
            Advanced Payment Options
          </a>
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
                  <th>
                    <SortableHeader
                      field="policyNumber"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Policy"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="policyIdNumber"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Policy ID"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="customerName"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Customer"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="totalPremiumDue"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Total Premium Due"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
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
                  <th>
                    <SortableHeader
                      field="outstandingBalance"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Outstanding"
                      basePath="/payments"
                      searchParams={params}
                    />
                  </th>
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

