import { connectDb } from "@/lib/db";
import { Receipt } from "@/models/Receipt";
import "@/models/Customer";
import "@/models/Policy";
import Link from "next/link";
import { DeleteReceiptButton } from "@/components/DeleteReceiptButton";
import { guardPermission } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import { VoidReceiptButton } from "@/components/VoidReceiptButton";

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  label,
}: {
  field: string;
  currentSort: string;
  currentOrder: number;
  label: string;
}) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === -1 ? "asc" : "desc";
  const searchParams = new URLSearchParams();
  searchParams.set("sortBy", field);
  searchParams.set("sortOrder", nextOrder);
  
  return (
    <Link
      href={`/receipts?${searchParams.toString()}`}
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

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const auth = await guardPermission("view_dashboard"); // allow all authenticated users to view/print receipts
  if ("response" in auth) {
    redirect("/login");
  }

  const params = await searchParams;
  const qRaw = normalize(params.q);
  const q = qRaw.trim();
  const page = Math.max(1, parseInt(normalize(params.page) || "1", 10));
  const perPage = 20;
  const skip = (page - 1) * perPage;
  
  // Sort parameters
  const sortBy = normalize(params.sortBy) || "generatedAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  const num = q ? Number(q) : NaN;

  const filter =
    q.length === 0
      ? {}
      : {
          $or: [
            { receiptNumber: { $regex: q, $options: "i" } },
            { policyIdNumber: { $regex: q, $options: "i" } },
            { policyNumberSnapshot: { $regex: q, $options: "i" } },
            { customerNameSnapshot: { $regex: q, $options: "i" } },
            { customerEmailSnapshot: { $regex: q, $options: "i" } },
            { registrationNumber: { $regex: q, $options: "i" } },
            ...(Number.isFinite(num) ? [{ amount: num }] : []),
          ],
        };

  // Get total count for pagination (only when not searching)
  const totalCount = q.length === 0 ? await Receipt.countDocuments(filter) : 0;
  const totalPages = q.length === 0 ? Math.ceil(totalCount / perPage) : 1;

  // Build sort object based on sortBy parameter
  const sortObject: Record<string, 1 | -1> = {};
  
  // Map sortable fields to database fields
  const sortFieldMap: Record<string, string> = {
    receiptNumber: "receiptNumber",
    policyNumber: "policyNumberSnapshot",
    policyIdNumber: "policyIdNumber",
    customerName: "customerNameSnapshot",
    customerEmail: "customerEmailSnapshot",
    customerContact: "customerContactSnapshot",
    amount: "amount",
    date: "generatedAt",
    paymentDate: "paymentDate",
  };
  
  const dbSortField = sortFieldMap[sortBy] || "generatedAt";
  sortObject[dbSortField] = sortOrder;

  const query = Receipt.find(filter)
    .populate("customerId", "firstName lastName email contactNumber")
    .populate("policyId", "policyNumber policyIdNumber")
    .sort(sortObject);

  // Apply pagination only when not searching
  const receipts = q.length === 0
    ? await query.skip(skip).limit(perPage).lean()
    : await query.lean();

  const canDelete = true; // guarded by permission above
  const rows = receipts.map((r: any) => ({
    _id: r._id.toString(),
    receiptNumber: r.receiptNumber,
    status: r.status || "active",
    policyNumber: (r.policyId as any)?.policyNumber || r.policyNumberSnapshot,
    policyIdNumber: (r.policyId as any)?.policyIdNumber || "",
    customerName:
      r.customerNameSnapshot ||
      `${(r.customerId as any)?.firstName ?? ""} ${(r.customerId as any)?.lastName ?? ""}`.trim(),
    customerEmail: r.customerEmailSnapshot || (r.customerId as any)?.email || "",
    customerContact: r.customerContactSnapshot || (r.customerId as any)?.contactNumber || "",
    amount: r.amount,
    paymentDate: r.paymentDate,
  }));

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Receipts</p>
        <h4>Receipts</h4>
        <p className="page-subtitle">All generated receipts with customer links.</p>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">History</h2>
          <span className="badge success">
            {q.length === 0
              ? `Page ${page} of ${totalPages} (${totalCount} total)`
              : `${rows.length} found`}
          </span>
          </div>
          <form className="flex w-full max-w-md items-center gap-2" method="GET" action="/receipts">
            <input type="hidden" name="sortBy" value={sortBy} />
            <input type="hidden" name="sortOrder" value={sortOrder === 1 ? "asc" : "desc"} />
            <input
              type="text"
              name="q"
              placeholder="Search receipt #, policy, customer, email, amount…"
              defaultValue={q}
              className="w-full rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
            />
            <button type="submit" className="btn">
              Search
            </button>
          </form>
        </div>
        <table className="mt-4">
          <thead>
            <tr>
              <th>
                <SortableHeader
                  field="receiptNumber"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Receipt #"
                />
              </th>
              <th>
                <SortableHeader
                  field="policyNumber"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Policy"
                />
              </th>
              <th>
                <SortableHeader
                  field="policyIdNumber"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Policy ID"
                />
              </th>
              <th>
                <SortableHeader
                  field="customerName"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Customer"
                />
              </th>
              <th>
                <SortableHeader
                  field="customerEmail"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Email"
                />
              </th>
              <th>
                <SortableHeader
                  field="customerContact"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Contact"
                />
              </th>
              <th>
                <SortableHeader
                  field="amount"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Amount"
                />
              </th>
              <th>
                <SortableHeader
                  field="date"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Date"
                />
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td>{r.receiptNumber}</td>
                  <td>{r.policyNumber}</td>
                  <td>{r.policyIdNumber || "—"}</td>
                  <td>{r.customerName}</td>
                  <td className="text-[var(--ic-gray-700)]">{r.customerEmail || "—"}</td>
                  <td className="text-[var(--ic-gray-700)]">{r.customerContact || "—"}</td>
                  <td>${r.amount.toFixed(2)}</td>
                  <td>{new Date(r.paymentDate).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/receipts/${r._id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
                        title="View receipt"
                        aria-label="View receipt"
                      >
                        🔍
                      </Link>
                      {r.status === "void" && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          VOID
                        </span>
                      )}
                      {canDelete && (
                        <DeleteReceiptButton receiptId={r._id} receiptNumber={r.receiptNumber} />
                      )}
                      <VoidReceiptButton receiptId={r._id} receiptNumber={r.receiptNumber} status={r.status} />
                    </div>
                  </td>
                </tr>
              ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="py-4 text-center text-sm text-slate-500">
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {q.length === 0 && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-[var(--ic-gray-200)] pt-4">
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={`/receipts?page=${page - 1}&sortBy=${sortBy}&sortOrder=${sortOrder === 1 ? "asc" : "desc"}`}
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
                  href={`/receipts?page=${page + 1}&sortBy=${sortBy}&sortOrder=${sortOrder === 1 ? "asc" : "desc"}`}
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
                    href={`/receipts?page=${pageNum}&sortBy=${sortBy}&sortOrder=${sortOrder === 1 ? "asc" : "desc"}`}
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
    </div>
  );
}

