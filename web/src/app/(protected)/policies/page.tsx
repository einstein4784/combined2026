import Link from "next/link";
import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import { PolicyForm } from "@/components/forms/PolicyForm";
import mongoose from "mongoose";
import { DeletePolicyButton } from "@/components/DeletePolicyButton";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  label,
  basePath = "/policies",
  preserveParams = {},
}: {
  field: string;
  currentSort: string;
  currentOrder: number;
  label: string;
  basePath?: string;
  preserveParams?: Record<string, string>;
}) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === -1 ? "asc" : "desc";
  const searchParams = new URLSearchParams();
  searchParams.set("sortBy", field);
  searchParams.set("sortOrder", nextOrder);
  searchParams.set("page", "1"); // Reset to first page on sort change
  
  // Preserve search query if present
  if (preserveParams.q) {
    searchParams.set("q", preserveParams.q);
  }
  
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

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const canDeletePolicy = true; // allow all authenticated users to manage policies

  const params = await searchParams;
  const q = normalize(params.q).trim();
  const page = Math.max(1, parseInt(normalize(params.page) || "1", 10));
  const perPage = 30;
  const skip = (page - 1) * perPage;
  
  // Sort parameters
  const sortBy = normalize(params.sortBy) || "createdAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();

  const customerIds: string[] = [];
  if (q) {
    const matches = await Customer.find({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { middleName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { contactNumber: { $regex: q, $options: "i" } },
      ],
    }).select("_id");
    customerIds.push(...matches.map((m) => m._id.toString()));
  }

  const filter =
    q.length === 0
      ? {}
      : {
          $or: [
            { policyNumber: { $regex: q, $options: "i" } },
            { coverageType: { $regex: q, $options: "i" } },
            ...(mongoose.Types.ObjectId.isValid(q) ? [{ _id: new mongoose.Types.ObjectId(q) }] : []),
            ...(customerIds.length ? [{ customerId: { $in: customerIds } }] : []),
          ],
        };

  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    policyNumber: "policyNumber",
    coverageType: "coverageType",
    totalPremiumDue: "totalPremiumDue",
    outstandingBalance: "outstandingBalance",
    createdAt: "createdAt",
  };
  
  const dbSortField = sortFieldMap[sortBy] || "createdAt";
  sortObject[dbSortField] = sortOrder;

  // Get total count for pagination (only when not searching)
  const totalCount = q.length === 0 ? await Policy.countDocuments(filter as any) : 0;
  const totalPages = q.length === 0 ? Math.ceil(totalCount / perPage) : 1;

  // Only fetch customers if we need them for the form (limit to reasonable number)
  const [policies, customers] = await Promise.all([
    Policy.find(filter as any)
      .populate("customerId", "firstName middleName lastName email contactNumber")
      .populate("customerIds", "firstName middleName lastName email contactNumber")
      .sort(sortObject)
      .skip(q.length === 0 ? skip : 0) // Only paginate when not searching
      .limit(q.length === 0 ? perPage : 1000) // Show all results when searching, limit to 30 when not
      .lean(),
    Customer.find()
      .select("firstName middleName lastName")
      .sort({ firstName: 1 })
      .limit(500) // Limit customers for dropdown to prevent loading all
      .lean(),
  ]);
  
  // Helper function to get unique customers from a policy
  const getUniqueCustomers = (p: any) => {
    const allCustomers = [
      p.customerId,
      ...(Array.isArray(p.customerIds) ? p.customerIds : []),
    ].filter(Boolean);
    // Deduplicate by _id
    const seen = new Set();
    return allCustomers.filter((c: any) => {
      const id = c?._id?.toString() || c?.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  // Sort by customer name if needed (after populating)
  let sortedPolicies = policies;
  if (sortBy === "customerName") {
    sortedPolicies = policies.sort((a: any, b: any) => {
      const customersA = getUniqueCustomers(a);
      const customersB = getUniqueCustomers(b);
      
      const nameA = customersA
        .map((c: any) => `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim())
        .filter(Boolean)
        .join(", ");
      const nameB = customersB
        .map((c: any) => `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim())
        .filter(Boolean)
        .join(", ");
      
      if (nameA < nameB) return sortOrder;
      if (nameA > nameB) return -sortOrder;
      return 0;
    });
  }

  const policyRows = sortedPolicies.map((p: any) => {
    const customers = getUniqueCustomers(p);
    const customerName = customers
      .map(
        (c: any) =>
          `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim(),
      )
      .filter(Boolean)
      .join(", ");

    return {
      _id: p._id.toString(),
      policyNumber: p.policyNumber,
      coverageType: p.coverageType,
      totalPremiumDue: p.totalPremiumDue,
      outstandingBalance: p.outstandingBalance,
      customerName,
    };
  });

  const customerOptions = customers.map((c) => ({
    id: c._id.toString(),
    name: `${c.firstName} ${c.middleName || ""} ${c.lastName}`.trim(),
  }));

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Policies</p>
        <h4>Policies</h4>
        <p className="page-subtitle">Active policies with coverage and balances.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Active policies</h2>
              <span className="badge success">
                {q.length === 0
                  ? `Page ${page} of ${totalPages} (${totalCount} total)`
                  : `${policyRows.length} found`}
              </span>
            </div>
            <form className="flex w-full max-w-md items-center gap-2" method="GET" action="/policies">
              <input type="hidden" name="page" value="1" />
              <input type="hidden" name="sortBy" value={sortBy} />
              <input type="hidden" name="sortOrder" value={sortOrder === 1 ? "asc" : "desc"} />
              <input
                type="text"
                name="q"
                placeholder="Search policy, customer, coverage…"
                defaultValue={q}
                className="w-full rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
              />
              <button type="submit" className="btn">
                Search
              </button>
            </form>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full" suppressHydrationWarning>
              <thead>
                <tr>
                  <th>
                    <SortableHeader field="policyNumber" currentSort={sortBy} currentOrder={sortOrder} label="Policy #" preserveParams={{ q, page: String(page) }} />
                  </th>
                  <th>
                    <SortableHeader field="customerName" currentSort={sortBy} currentOrder={sortOrder} label="Customer" preserveParams={{ q, page: String(page) }} />
                  </th>
                  <th>
                    <SortableHeader field="coverageType" currentSort={sortBy} currentOrder={sortOrder} label="Coverage" preserveParams={{ q, page: String(page) }} />
                  </th>
                  <th>
                    <SortableHeader field="totalPremiumDue" currentSort={sortBy} currentOrder={sortOrder} label="Total" preserveParams={{ q, page: String(page) }} />
                  </th>
                  <th>
                    <SortableHeader field="outstandingBalance" currentSort={sortBy} currentOrder={sortOrder} label="Outstanding" preserveParams={{ q, page: String(page) }} />
                  </th>
                  <th>Notice</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policyRows.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-[var(--ic-gray-100)] transition cursor-pointer"
                  >
                    <td>
                      <Link href={`/policies/${p._id}`} className="text-[var(--ic-navy)] underline">
                        {p.policyNumber}
                      </Link>
                    </td>
                    <td>
                      {p.customerName}
                    </td>
                    <td>{p.coverageType}</td>
                    <td>${p.totalPremiumDue.toFixed(2)}</td>
                    <td>${p.outstandingBalance.toFixed(2)}</td>
                    <td>
                      <a
                        href={`/policies/notice?policyId=${p._id}&policyNumber=${encodeURIComponent(
                          p.policyNumber,
                        )}`}
                        target="_blank"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
                        title="Print notice"
                        aria-label="Print notice"
                      >
                        🖨️
                      </a>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/policies/${p._id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--ic-gray-200)] bg-white text-[var(--ic-navy)] shadow-sm hover:bg-[var(--ic-gray-50)]"
                          title="View policy"
                          aria-label="View policy"
                        >
                          🔍
                        </Link>
                        {canDeletePolicy && (
                          <DeletePolicyButton policyId={p._id} policyNumber={p.policyNumber} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!policyRows.length && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-sm text-slate-500">
                      No policies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {q.length === 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--ic-gray-200)] pt-4">
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/policies?page=${page - 1}&sortBy=${sortBy}&sortOrder=${sortOrder === 1 ? "asc" : "desc"}`}
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
                    href={`/policies?page=${page + 1}&sortBy=${sortBy}&sortOrder=${sortOrder === 1 ? "asc" : "desc"}`}
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
                      href={`/policies?page=${pageNum}&sortBy=${sortBy}&sortOrder=${sortOrder === 1 ? "asc" : "desc"}`}
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
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Create policy</h2>
          <p className="text-sm text-[var(--ic-gray-600)]">Links to an existing customer.</p>
          <div className="mt-3">
            <PolicyForm customers={customerOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

