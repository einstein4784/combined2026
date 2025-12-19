import Link from "next/link";
import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import { PolicyForm } from "@/components/forms/PolicyForm";
import { Pagination } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import mongoose from "mongoose";
import { DeletePolicyButton } from "@/components/DeletePolicyButton";
import { PolicyRenewButton } from "@/components/PolicyRenewButton";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

import { escapeRegex } from "@/lib/regex-utils";

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");
const ITEMS_PER_PAGE = 10;

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const canDeletePolicy = true; // allow all authenticated users to manage policies

  const params = await searchParams;
  const q = normalize(params.q).trim();
  const page = Math.max(1, parseInt(normalize(params.page)) || 1);
  const sortBy = normalize(params.sortBy) || "createdAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();

  const customerIds: string[] = [];
  if (q) {
    const escapedQuery = escapeRegex(q);
    const matches = await Customer.find({
      $or: [
        { firstName: { $regex: escapedQuery, $options: "i" } },
        { middleName: { $regex: escapedQuery, $options: "i" } },
        { lastName: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
        { contactNumber: { $regex: escapedQuery, $options: "i" } },
      ],
    })
    .select("_id")
    .limit(100) // Limit search results to prevent large result sets
    .lean();
    customerIds.push(...matches.map((m) => m._id.toString()));
  }

  const filter =
    q.length === 0
      ? {}
      : {
          $or: [
            { policyNumber: { $regex: escapeRegex(q), $options: "i" } },
            { coverageType: { $regex: escapeRegex(q), $options: "i" } },
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

  const [totalCount, policies, customers] = await Promise.all([
    Policy.countDocuments(filter as any),
    Policy.find(filter as any)
      .populate("customerId", "firstName middleName lastName email contactNumber")
      .populate("customerIds", "firstName middleName lastName email contactNumber")
      .sort(sortObject)
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE)
      .lean(),
    Customer.find()
      .select("_id firstName middleName lastName")
      .limit(1000) // Limit customer dropdown to 1000 most recent
      .sort({ firstName: 1 })
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const policyRows = policies.map((p: any) => {
    // Collect all customer IDs to deduplicate
    const customerIdSet = new Set<string>();
    const customerList: any[] = [];
    
    // Add primary customer
    if (p.customerId) {
      const primaryId = p.customerId._id?.toString() || p.customerId.toString();
      if (!customerIdSet.has(primaryId)) {
        customerIdSet.add(primaryId);
        customerList.push(p.customerId);
      }
    }
    
    // Add additional customers (avoiding duplicates)
    if (Array.isArray(p.customerIds)) {
      for (const customer of p.customerIds) {
        if (customer) {
          const customerId = customer._id?.toString() || customer.toString();
          if (!customerIdSet.has(customerId)) {
            customerIdSet.add(customerId);
            customerList.push(customer);
          }
        }
      }
    }
    
    const customerName = customerList
      .map(
        (c: any) =>
          `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim(),
      )
      .filter(Boolean)
      .join(", ");

    // Get primary customer ID for renewals
    const primaryCustomerId = p.customerId?._id?.toString() || p.customerId?.toString() || "";

    return {
      _id: p._id.toString(),
      policyNumber: p.policyNumber,
      coverageType: p.coverageType,
      totalPremiumDue: p.totalPremiumDue,
      outstandingBalance: p.outstandingBalance,
      customerName,
      coverageEndDate: p.coverageEndDate ? p.coverageEndDate.toISOString() : null,
      customerId: primaryCustomerId,
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
              <span className="badge success">{totalCount} records</span>
            </div>
            <form className="flex w-full max-w-md items-center gap-2" method="GET" action="/policies">
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
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>
                    <SortableHeader
                      field="policyNumber"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Policy #"
                      basePath="/policies"
                      searchParams={params}
                    />
                  </th>
                  <th>Customer</th>
                  <th>
                    <SortableHeader
                      field="coverageType"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Coverage"
                      basePath="/policies"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="totalPremiumDue"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Total"
                      basePath="/policies"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="outstandingBalance"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Outstanding"
                      basePath="/policies"
                      searchParams={params}
                    />
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
                        <PolicyRenewButton
                          policyId={p._id}
                          policyNumber={p.policyNumber}
                          coverageType={p.coverageType}
                          totalPremiumDue={p.totalPremiumDue}
                          coverageEndDate={p.coverageEndDate}
                          customerId={p.customerId}
                        />
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
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/policies"
            searchParams={params}
          />
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

