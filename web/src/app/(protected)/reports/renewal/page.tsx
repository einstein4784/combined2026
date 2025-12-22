import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { formatDateOnly } from "@/lib/utils";
import { escapeRegex } from "@/lib/regex-utils";

type SearchParams = {
  q?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

function pickFirst(value?: string | string[] | null) {
  if (!value) return "";
  return Array.isArray(value) ? value[0] : value;
}

function toDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export default async function RenewalSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = pickFirst(params.q)?.trim();
  const from = toDate(pickFirst(params.from));
  const to = toDate(pickFirst(params.to));

  await connectDb();

  const escapedQuery = q ? escapeRegex(q) : "";
  const customerMatch = q
    ? {
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
          { lastName: { $regex: escapedQuery, $options: "i" } },
          { email: { $regex: escapedQuery, $options: "i" } },
          { idNumber: { $regex: escapedQuery, $options: "i" } },
        ],
      }
    : {};

  const customers = await Customer.find(customerMatch).select("_id").lean();
  const customerIds = customers.map((c: any) => c._id);

  const policies = await Policy.find({
    status: "Active", // Only show active policies in renewal reports
    ...(q
      ? {
          $or: [
            { policyNumber: { $regex: q, $options: "i" } },
            { customerId: { $in: customerIds } },
            { customerIds: { $in: customerIds } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          coverageEndDate: {
            ...(from ? { $gte: from } : {}),
            ...(to ? { $lte: to } : {}),
          },
        }
      : {}),
  })
    .populate("customerId", "firstName lastName email contactNumber idNumber")
    .populate("customerIds", "firstName lastName email contactNumber idNumber")
    .sort({ coverageEndDate: 1 })
    .lean();

  return (
    <div className="space-y-4 p-6 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">
            Renewal notices
          </p>
          <h1 className="text-2xl font-semibold text-[var(--ic-navy)]">
            {q ? `Search results for "${q}"` : "All matching policies"}
          </h1>
          {(from || to) && (
            <p className="text-sm text-[var(--ic-gray-600)]">
              Coverage end between {from ? from.toISOString().slice(0, 10) : "—"} and{" "}
              {to ? to.toISOString().slice(0, 10) : "—"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <Link href="/reports" className="btn print:hidden">
            Back to Reports
          </Link>
        </div>
      </div>

      <div className="card print:border-none print:shadow-none">
        <table className="mt-2">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Customer</th>
              <th>Coverage end</th>
              <th>Notice</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p: any) => {
              const allCustomers = [p.customerId, ...(Array.isArray(p.customerIds) ? p.customerIds : [])].filter(Boolean);
              // Deduplicate by _id
              const seen = new Set();
              const customers = allCustomers.filter((c: any) => {
                const id = c?._id?.toString() || c?.toString();
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
              });
              const customerName = customers
                .map((c: any) => `${c?.firstName ?? ""} ${c?.lastName ?? ""}`.trim())
                .filter(Boolean)
                .join(", ");
              
              return (
                <tr key={p._id.toString()}>
                  <td>{p.policyNumber}</td>
                  <td>{customerName || "—"}</td>
                  <td>
                    {formatDateOnly(p.coverageEndDate)}
                  </td>
                  <td>
                    <Link
                      href={`/policies/notice?policyId=${p._id.toString()}&policyNumber=${encodeURIComponent(
                        p.policyNumber || "",
                      )}`}
                      className="text-[var(--ic-navy)] underline"
                      target="_blank"
                    >
                      Open notice
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!policies.length && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                  No matching policies.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

