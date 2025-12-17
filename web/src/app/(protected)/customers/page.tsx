import { connectDb } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { DeleteCustomerButton } from "@/components/DeleteCustomerButton";
import { EditCustomerButton } from "@/components/EditCustomerButton";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  label,
  basePath = "/customers",
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
  
  // Preserve other URL parameters
  Object.entries(preserveParams).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  
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

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const canEditCustomer = true; // all authenticated users can edit customers

  const params = await searchParams;
  const q = normalize(params.q).trim();
  const page = Math.max(1, parseInt(normalize(params.page) || "1", 10));
  const perPage = 30;
  const skip = (page - 1) * perPage;
  
  // Sort parameters
  const sortBy = normalize(params.sortBy) || "createdAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  const filter =
    q.length === 0
      ? {}
      : {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { middleName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { contactNumber: { $regex: q, $options: "i" } },
            { idNumber: { $regex: q, $options: "i" } },
            { address: { $regex: q, $options: "i" } },
          ],
        };

  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    name: "firstName",
    lastName: "lastName",
    email: "email",
    contact: "contactNumber",
    idNumber: "idNumber",
    createdAt: "createdAt",
  };
  
  const dbSortField = sortFieldMap[sortBy] || "createdAt";
  sortObject[dbSortField] = sortOrder;

  // Get total count for pagination
  const totalCount = await Customer.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / perPage);

  // Get paginated customers
  const customers = await Customer.find(filter).sort(sortObject).skip(skip).limit(perPage).lean();

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
              <span className="badge success">
                {q.length === 0
                  ? `Page ${page} of ${totalPages} (${totalCount} total)`
                  : `${customers.length} found`}
              </span>
            </div>
            <form className="flex w-full max-w-md items-center gap-2" method="GET" action="/customers">
              <input type="hidden" name="page" value="1" />
              <input
                type="text"
                name="q"
                placeholder="Search name, email, ID, contact, address…"
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
                      preserveParams={{ page: page.toString(), q }}
                    />
                  </th>
                  <th>
                    <SortableHeader 
                      field="contact" 
                      currentSort={sortBy} 
                      currentOrder={sortOrder} 
                      label="Contact"
                      preserveParams={{ page: page.toString(), q }}
                    />
                  </th>
                  <th>
                    <SortableHeader 
                      field="email" 
                      currentSort={sortBy} 
                      currentOrder={sortOrder} 
                      label="Email"
                      preserveParams={{ page: page.toString(), q }}
                    />
                  </th>
                  <th>
                    <SortableHeader 
                      field="idNumber" 
                      currentSort={sortBy} 
                      currentOrder={sortOrder} 
                      label="ID"
                      preserveParams={{ page: page.toString(), q }}
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
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-[var(--ic-gray-200)] pt-4">
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/customers?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      page: String(page - 1),
                    }).toString()}`}
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
                    href={`/customers?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      page: String(page + 1),
                    }).toString()}`}
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
                      href={`/customers?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        page: String(pageNum),
                      }).toString()}`}
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
          <h2 className="text-lg font-semibold text-[var(--ic-navy)] mb-2">Add customer</h2>
          <p className="text-sm text-[var(--ic-gray-600)] mb-4">Capture full details. ID number is unique.</p>
          <CustomerForm />
        </div>
      </div>
    </div>
  );
}

