import { connectDb } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { DeleteCustomerButton } from "@/components/DeleteCustomerButton";
import { EditCustomerButton } from "@/components/EditCustomerButton";
import { Pagination } from "@/components/Pagination";
import { SortableHeader } from "@/components/SortableHeader";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

import { escapeRegex } from "@/lib/regex-utils";

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");
const ITEMS_PER_PAGE = 20;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const canEditCustomer = true; // all authenticated users can edit customers

  const params = await searchParams;
  const q = normalize(params.q).trim();
  const page = Math.max(1, parseInt(normalize(params.page)) || 1);
  const sortBy = normalize(params.sortBy) || "createdAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  const escapedQuery = escapeRegex(q);
  const filter =
    q.length === 0
      ? {}
      : {
          $or: [
            // Full name search - concatenate all name parts and search
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: [
                      { $ifNull: ["$firstName", ""] },
                      " ",
                      { $ifNull: ["$middleName", ""] },
                      " ",
                      { $ifNull: ["$lastName", ""] },
                    ],
                  },
                  regex: escapedQuery,
                  options: "i",
                },
              },
            },
            // Individual field searches (backward compatible)
            { firstName: { $regex: escapedQuery, $options: "i" } },
            { middleName: { $regex: escapedQuery, $options: "i" } },
            { lastName: { $regex: escapedQuery, $options: "i" } },
            { email: { $regex: escapedQuery, $options: "i" } },
            { contactNumber: { $regex: escapedQuery, $options: "i" } },
            { idNumber: { $regex: escapedQuery, $options: "i" } },
            { address: { $regex: escapedQuery, $options: "i" } },
          ],
        };

  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    name: "lastName", // Sort by lastName for name column
    contact: "contactNumber",
    email: "email",
    id: "idNumber",
    createdAt: "createdAt",
  };
  const dbSortField = sortFieldMap[sortBy] || "createdAt";
  sortObject[dbSortField] = sortOrder;

  const [totalCount, customers] = await Promise.all([
    Customer.countDocuments(filter),
    Customer.find(filter).sort(sortObject).skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE).lean(),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">CRM</p>
        <h4>Customers</h4>
        <p className="page-subtitle">Directory of insured clients with quick add-on the right.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Directory</h2>
              <span className="badge success">{totalCount} total</span>
            </div>
            <form className="flex w-full max-w-md items-center gap-2" method="GET" action="/customers">
              <input
                type="text"
                name="q"
                placeholder="Search name, email, Customer ID, contact, address…"
                defaultValue={q}
                className="w-full rounded-md border border-[var(--ic-gray-200)] px-3 py-2 text-sm shadow-sm focus:border-[var(--ic-navy)] focus:outline-none"
              />
              <button type="submit" className="btn">
                Search
              </button>
            </form>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>
                    <SortableHeader
                      field="name"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Name"
                      basePath="/customers"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="contact"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Contact"
                      basePath="/customers"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="email"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Email"
                      basePath="/customers"
                      searchParams={params}
                    />
                  </th>
                  <th>
                    <SortableHeader
                      field="id"
                      currentSort={sortBy}
                      currentOrder={sortOrder}
                      label="Customer ID"
                      basePath="/customers"
                      searchParams={params}
                    />
                  </th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const safeCustomer = {
                    _id: c._id.toString(),
                    firstName: c.firstName || "",
                    middleName: c.middleName || "",
                    lastName: c.lastName || "",
                    address: c.address || "",
                    contactNumber: c.contactNumber || "",
                    email: c.email || "",
                    sex: (c as any).sex || "Male",
                    idNumber: c.idNumber || "",
                  };
                  return (
                    <tr
                      key={c._id.toString()}
                      className="hover:bg-[var(--ic-gray-100)] transition cursor-pointer"
                    >
                      <td>
                        <Link
                          href={`/customers/${c._id.toString()}`}
                          className="text-[var(--ic-navy)] underline"
                        >
                          {c.firstName} {c.middleName} {c.lastName}
                        </Link>
                      </td>
                      <td>{c.contactNumber}</td>
                      <td>{c.email}</td>
                      <td>{c.idNumber}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEditCustomer && <EditCustomerButton customer={safeCustomer} />}
                          {canEditCustomer && (
                            <DeleteCustomerButton
                              customerId={c._id.toString()}
                              name={[c.firstName, c.lastName].filter(Boolean).join(" ")}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!customers.length && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sm text-slate-500">
                      No customers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/customers"
            searchParams={params}
          />
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Add customer</h2>
          <p className="text-sm text-[var(--ic-gray-600)]">Capture full details. ID number is unique.</p>
          <div className="mt-3">
            <CustomerForm />
          </div>
        </div>
      </div>
    </div>
  );
}

