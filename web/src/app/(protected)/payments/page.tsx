import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";
import { Receipt } from "@/models/Receipt";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { DeletePaymentButton } from "@/components/DeletePaymentButton";
import { guardSession } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  label,
  basePath = "/payments",
}: {
  field: string;
  currentSort: string;
  currentOrder: number;
  label: string;
  basePath?: string;
}) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === -1 ? "asc" : "desc";
  const searchParams = new URLSearchParams();
  searchParams.set("sortBy", field);
  searchParams.set("sortOrder", nextOrder);
  
  return (
    <Link
      href={`${basePath}?${searchParams.toString()}`}
      className="flex items-center gap-1 hover:text-[var(--ic-navy)] cursor-pointer select-none"
      title={`Sort by ${label} ${nextOrder === "asc" ? "(ascending)" : "(descending)"}`}
    >
      <span>{label}</span>
      {isActive ? (
        <span className="text-[var(--ic-navy)] font-semibold">
          {currentOrder === -1 ? "↓" : "↑"}
        </span>
      ) : (
        <span className="text-[var(--ic-gray-400)] text-xs opacity-50">⇅</span>
      )}
    </Link>
  );
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const auth = await guardSession();
  if ("response" in auth) {
    redirect("/login");
  }
  const canVoid = auth.session.role === "Admin";

  const params = await searchParams;
  const page = Math.max(1, parseInt(normalize(params.page) || "1", 10));
  const perPage = 20;
  const skip = (page - 1) * perPage;
  
  // Sort parameters
  const sortBy = normalize(params.sortBy) || "paymentDate";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  
  // Build sort object - for nested fields, we'll sort after populating
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    amount: "amount",
    method: "paymentMethod",
    date: "paymentDate",
  };
  
  const dbSortField = sortFieldMap[sortBy] || "paymentDate";
  sortObject[dbSortField] = sortOrder;
  
  // Get total count for pagination
  const totalCount = await Payment.countDocuments();
  const totalPages = Math.ceil(totalCount / perPage);

  let payments = await Payment.find()
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
    .skip(skip)
    .limit(perPage)
    .lean();
  
  // Sort by nested fields after populating if needed
  if (["policyNumber", "policyIdNumber", "customerName", "outstanding"].includes(sortBy)) {
    payments = payments.sort((a: any, b: any) => {
      const policyA = a.policyId as any;
      const policyB = b.policyId as any;
      let valA: any, valB: any;
      
      if (sortBy === "policyNumber") {
        valA = policyA?.policyNumber || "";
        valB = policyB?.policyNumber || "";
      } else if (sortBy === "policyIdNumber") {
        valA = policyA?.policyIdNumber || "";
        valB = policyB?.policyIdNumber || "";
      } else if (sortBy === "customerName") {
        const customerA = policyA?.customerId as any;
        const customerB = policyB?.customerId as any;
        valA = `${customerA?.firstName || ""} ${customerA?.lastName || ""}`.trim();
        valB = `${customerB?.firstName || ""} ${customerB?.lastName || ""}`.trim();
      } else if (sortBy === "outstanding") {
        valA = policyA?.outstandingBalance || 0;
        valB = policyB?.outstandingBalance || 0;
      }
      
      if (valA < valB) return sortOrder;
      if (valA > valB) return -sortOrder;
      return 0;
    });
  }

  const paymentIds = payments.map((p) => p._id);
  // Only fetch policies for the payments we're displaying
  const policyIds = [...new Set(payments.map((p: any) => p.policyId?.toString()).filter(Boolean))];
  
  const [receipts] = await Promise.all([
    paymentIds.length > 0
      ? Receipt.find({ paymentId: { $in: paymentIds } }).select("_id paymentId receiptNumber").lean()
      : Promise.resolve([]),
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

  // Fetch only policies needed for the form dropdown (limit to recent active policies)
  const policyOptions = await Policy.find({ status: "Active" })
    .select("policyNumber policyIdNumber outstandingBalance customerId customerIds")
    .populate("customerId", "firstName lastName")
    .populate("customerIds", "firstName lastName")
    .sort({ createdAt: -1 })
    .limit(100) // Limit to 100 most recent active policies for dropdown
    .lean()
    .then((policies) =>
      policies.map((p: any) => {
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
      })
    );

  // Calculate total premium from active policies (limited query for performance)
  const totalPremiumDue = await Policy.aggregate([
    { $match: { status: "Active" } },
    { $group: { _id: null, total: { $sum: "$totalPremiumDue" } } },
  ]).then((result) => (result[0]?.total || 0) as number);

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
            <span className="badge success">
              Page {page} of {totalPages} ({totalCount} total)
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>
                    <SortableHeader field="policyNumber" currentSort={sortBy} currentOrder={sortOrder} label="Policy" />
                  </th>
                  <th>
                    <SortableHeader field="policyIdNumber" currentSort={sortBy} currentOrder={sortOrder} label="Policy ID" />
                  </th>
                  <th>
                    <SortableHeader field="customerName" currentSort={sortBy} currentOrder={sortOrder} label="Customer" />
                  </th>
                  <th>Total Premium Due</th>
                  <th>
                    <SortableHeader field="amount" currentSort={sortBy} currentOrder={sortOrder} label="Amount" />
                  </th>
                  <th>
                    <SortableHeader field="outstanding" currentSort={sortBy} currentOrder={sortOrder} label="Outstanding" />
                  </th>
                  <th>
                    <SortableHeader field="method" currentSort={sortBy} currentOrder={sortOrder} label="Method" />
                  </th>
                  <th>
                    <SortableHeader field="date" currentSort={sortBy} currentOrder={sortOrder} label="Date" />
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
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--ic-gray-200)] pt-4">
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/payments?page=${page - 1}`}
                    className="btn"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <button className="btn" disabled>
                    ← Previous
                  </button>
                )}
                <span className="text-sm text-[var(--ic-gray-600)]">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/payments?page=${page + 1}`}
                    className="btn"
                  >
                    Next →
                  </Link>
                ) : (
                  <button className="btn" disabled>
                    Next →
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={`/payments?page=${pageNum}`}
                      className={`px-3 py-1 text-sm rounded ${
                        pageNum === page
                          ? "bg-[var(--ic-navy)] text-white font-semibold"
                          : "bg-[var(--ic-gray-100)] text-[var(--ic-gray-700)] hover:bg-[var(--ic-gray-200)]"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
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

