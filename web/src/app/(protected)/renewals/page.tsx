import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function toDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export const dynamic = "force-dynamic";

type Props = { searchParams?: SearchParams | Promise<SearchParams> };

export default async function RenewalsPage({ searchParams }: Props) {
  const auth = await guardPermission("view_dashboard");
  if ("response" in auth) {
    redirect("/login");
  }

  const resolvedParams = (await Promise.resolve(searchParams)) || {};
  const safeParams = resolvedParams || {};
  const normalize = (val?: string | string[]) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return val[0] ?? "";
    return "";
  };

  const q = normalize(safeParams.q).trim();
  const fromParam = toDate(normalize(safeParams.from));
  const toParam = toDate(normalize(safeParams.to));

  const today = new Date();
  const tenDays = new Date();
  tenDays.setDate(today.getDate() + 10);

  const from = fromParam ?? today;
  const to = toParam ?? tenDays;

  await connectDb();

  const customerMatch = q
    ? {
        $or: [
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const customerIds =
    q?.length && Object.keys(customerMatch).length
      ? (await Customer.find(customerMatch).select("_id").lean()).map((c: any) => c._id)
      : [];

  const policies = await Policy.find({
    coverageEndDate: { $gte: from, $lte: to },
    ...(q
      ? {
          $or: [
            { policyNumber: { $regex: q, $options: "i" } },
            { customerId: { $in: customerIds } },
          ],
        }
      : {}),
  })
    .populate("customerId", "firstName lastName email contactNumber")
    .sort({ coverageEndDate: 1 })
    .lean();

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Renewals</p>
        <h4>Upcoming renewals</h4>
        <p className="page-subtitle">
          Default shows renewals due in the next 10 days. Search by customer or policy, or pick a date range.
        </p>
      </div>

      <div className="card space-y-3">
        <form className="grid gap-3 md:grid-cols-4" action="/renewals" method="GET">
          <div className="md:col-span-2">
            <label>Search (customer or policy)</label>
            <input
              name="q"
              placeholder="POL-123 or Jane Doe"
              defaultValue={q}
              className="mt-1"
            />
          </div>
          <div>
            <label>From</label>
            <input
              type="date"
              name="from"
              defaultValue={from.toISOString().slice(0, 10)}
              className="mt-1"
            />
          </div>
          <div>
            <label>To</label>
            <input
              type="date"
              name="to"
              defaultValue={to.toISOString().slice(0, 10)}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            <Link href="/renewals" className="btn btn-ghost border-[var(--ic-gray-200)]">
              Clear
            </Link>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Results</h3>
          <span className="badge success">{policies.length} records</span>
        </div>
        <table className="mt-4">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Customer</th>
              <th>Coverage end</th>
              <th>Outstanding</th>
              <th>Notice</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p: any) => (
              <tr key={p._id.toString()}>
                <td>{p.policyNumber}</td>
                <td>
                  {[p.customerId?.firstName, p.customerId?.lastName].filter(Boolean).join(" ")}
                </td>
                <td>
                  {p.coverageEndDate
                    ? new Date(p.coverageEndDate).toLocaleDateString()
                    : "—"}
                </td>
                <td>${(p.outstandingBalance || 0).toFixed(2)}</td>
                <td>
                  <Link
                    href={`/policies/notice?policyId=${p._id.toString()}&policyNumber=${encodeURIComponent(
                      p.policyNumber || "",
                    )}`}
                    target="_blank"
                    className="text-[var(--ic-navy)] underline"
                  >
                    Open notice
                  </Link>
                </td>
              </tr>
            ))}
            {!policies.length && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-sm text-slate-500">
                  No renewals in range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

