import { connectDb } from "@/lib/db";
import { Receipt } from "@/models/Receipt";
import "@/models/Customer";
import "@/models/Policy";
import Link from "next/link";
import { DeleteReceiptButton } from "@/components/DeleteReceiptButton";
import { Pagination } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import { guardPermission } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import { VoidReceiptButton } from "@/components/VoidReceiptButton";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

import { escapeRegex } from "@/lib/regex-utils";

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");
const ITEMS_PER_PAGE = 20;

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const auth = await guardPermission("view_dashboard"); // allow all authenticated users to view/print receipts
  if ("response" in auth) {
    redirect("/login");
  }

  const params = await searchParams;
  const qRaw = normalize(params.q);
  const q = qRaw.trim();
  const page = Math.max(1, parseInt(normalize(params.page)) || 1);
  const sortBy = normalize(params.sortBy) || "generatedAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  const num = q ? Number(q) : NaN;

  const escapedQuery = q.length > 0 ? escapeRegex(q) : "";
  const filter =
    q.length === 0
      ? {}
      : {
          $or: [
            { receiptNumber: { $regex: escapedQuery, $options: "i" } },
            { policyIdNumber: { $regex: escapedQuery, $options: "i" } },
            { policyNumberSnapshot: { $regex: escapedQuery, $options: "i" } },
            { customerNameSnapshot: { $regex: escapedQuery, $options: "i" } },
            { customerEmailSnapshot: { $regex: escapedQuery, $options: "i" } },
            { registrationNumber: { $regex: escapedQuery, $options: "i" } },
            ...(Number.isFinite(num) ? [{ amount: num }] : []),
          ],
        };

  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    receiptNumber: "receiptNumber",
    amount: "amount",
    paymentDate: "paymentDate",
    generatedAt: "generatedAt",
  };
  const dbSortField = sortFieldMap[sortBy] || "generatedAt";
  sortObject[dbSortField] = sortOrder;

  const [totalCount, receipts] = await Promise.all([
    Receipt.countDocuments(filter),
    Receipt.find(filter)
      .populate("customerId", "firstName lastName email contactNumber")
      .populate("policyId", "policyNumber policyIdNumber")
      .sort(sortObject)
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
          <span className="badge success">{totalCount} records</span>
          </div>
          <form className="flex w-full max-w-md items-center gap-2" method="GET" action="/receipts">
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
                  basePath="/receipts"
                  searchParams={params}
                />
              </th>
              <th>Policy</th>
              <th>Policy ID</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Contact</th>
              <th>
                <SortableHeader
                  field="amount"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Amount"
                  basePath="/receipts"
                  searchParams={params}
                />
              </th>
              <th>
                <SortableHeader
                  field="paymentDate"
                  currentSort={sortBy}
                  currentOrder={sortOrder}
                  label="Date"
                  basePath="/receipts"
                  searchParams={params}
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
                <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                  No receipts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl="/receipts"
          searchParams={params}
        />
      </div>
    </div>
  );
}

