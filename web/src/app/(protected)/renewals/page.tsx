import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import Link from "next/link";
import { redirect } from "next/navigation";
import RenewalsClient from "./RenewalsClient";

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
  const preset = normalize(safeParams.preset);
  const fromParam = toDate(normalize(safeParams.from));
  const toParam = toDate(normalize(safeParams.to));
  const page = Math.max(1, parseInt(normalize(safeParams.page)) || 1);
  const perPage = 20;

  const today = new Date();
  const presetDays = (() => {
    if (preset === "7") return 7;
    if (preset === "14") return 14;
    if (preset === "21") return 21;
    if (preset === "30") return 30;
    return 10;
  })();
  const presetEnd = new Date(today);
  presetEnd.setDate(today.getDate() + presetDays);

  const useSearch = q.length > 0;
  const hasDateInput = Boolean(normalize(safeParams.from) || normalize(safeParams.to));

  // Exclusive logic: if searching, ignore date filters; otherwise use provided dates or default window.
  const from = useSearch ? null : hasDateInput ? fromParam : today;
  const to = useSearch ? null : hasDateInput ? toParam : presetEnd;

  await connectDb();

  const customerMatch = useSearch
    ? {
        $or: [
          { firstName: { $regex: q, $options: "i" } },
          { lastName: { $regex: q, $options: "i" } },
          { middleName: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { contactNumber: { $regex: q, $options: "i" } },
          { idNumber: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const customerIds =
    q?.length && Object.keys(customerMatch).length
      ? (await Customer.find(customerMatch)
          .select("_id")
          .limit(100) // Limit to prevent large result sets
          .lean()).map((c: any) => c._id)
      : [];

  const dateFilter =
    from || to
      ? {
          coverageEndDate: {
            ...(from ? { $gte: from } : {}),
            ...(to ? { $lte: to } : {}),
          },
        }
      : {};

  // Get total count for pagination
  const totalCount = await Policy.countDocuments({
    ...(useSearch ? {} : dateFilter),
    ...(useSearch
      ? {
          $or: [
            { policyNumber: { $regex: q, $options: "i" } },
            { policyIdNumber: { $regex: q, $options: "i" } },
            { coverageType: { $regex: q, $options: "i" } },
            ...(customerIds.length
              ? [{ $or: [{ customerId: { $in: customerIds } }, { customerIds: { $in: customerIds } }] }]
              : []),
          ],
        }
      : {}),
  });

  const totalPages = Math.ceil(totalCount / perPage);
  const skip = (page - 1) * perPage;

  const policies = await Policy.find({
    ...(useSearch ? {} : dateFilter),
    ...(useSearch
      ? {
          $or: [
            { policyNumber: { $regex: q, $options: "i" } },
            { policyIdNumber: { $regex: q, $options: "i" } },
            { coverageType: { $regex: q, $options: "i" } },
            ...(customerIds.length
              ? [{ $or: [{ customerId: { $in: customerIds } }, { customerIds: { $in: customerIds } }] }]
              : []),
          ],
        }
      : {}),
  })
    .populate("customerId", "firstName lastName middleName email contactNumber idNumber")
    .populate("customerIds", "firstName middleName lastName email contactNumber idNumber")
    .sort({ coverageEndDate: 1 })
    .skip(skip)
    .limit(perPage)
    .lean();

  const policyRows = policies.map((p: any) => {
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
      .map((c: any) => `${c?.firstName ?? ""} ${c?.middleName ?? ""} ${c?.lastName ?? ""}`.trim())
      .filter(Boolean)
      .join(", ");
    const customerEmail = customers.map((c: any) => c?.email).find((e: string) => !!e) || "";
    const customerContact = customers.map((c: any) => c?.contactNumber).find((e: string) => !!e) || "";
    const customerIdNumber = customers.map((c: any) => c?.idNumber).find((e: string) => !!e) || "";
    return {
      id: p._id.toString(),
      policyNumber: p.policyNumber,
      policyIdNumber: p.policyIdNumber,
      coverageStartDate: p.coverageStartDate ? new Date(p.coverageStartDate).toISOString() : null,
      coverageEndDate: p.coverageEndDate ? new Date(p.coverageEndDate).toISOString() : null,
      outstandingBalance: p.outstandingBalance ?? 0,
    totalPremiumDue: p.totalPremiumDue ?? 0,
    amountPaid: p.amountPaid ?? 0,
      coverageType: p.coverageType,
      registrationNumber: p.registrationNumber || null,
      customerName,
      customerEmail,
      customerContact,
      customerIdNumber,
      renewalNoticeSentAt: p.renewalNoticeSentAt ? new Date(p.renewalNoticeSentAt).toISOString() : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Renewals</p>
        <h4>Upcoming renewals</h4>
        <p className="page-subtitle">
          Quickly filter upcoming renewals and email notices individually or in bulk.
        </p>
      </div>

      <div className="card space-y-3">
        <form className="grid gap-3 md:grid-cols-4" action="/renewals" method="GET">
          <div className="md:col-span-2">
            <label>Search (customer, policy number, or prefix)</label>
            <input
              name="q"
              placeholder="VF, SF, POL-123, or Jane Doe"
              defaultValue={q}
              className="mt-1"
            />
          </div>
          <div>
            <label>From</label>
            <input
              type="date"
              name="from"
              defaultValue={!useSearch && from ? from.toISOString().slice(0, 10) : ""}
              className="mt-1"
            />
          </div>
          <div>
            <label>To</label>
            <input
              type="date"
              name="to"
              defaultValue={!useSearch && to ? to.toISOString().slice(0, 10) : ""}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            <Link href="/renewals" className="btn btn-ghost border-[var(--ic-gray-200)]">
              Clear
            </Link>
            {!useSearch && (
              <div className="flex flex-wrap gap-2">
                {[7, 14, 21, 30].map((d) => {
                  const toDate = new Date(today);
                  toDate.setDate(today.getDate() + d);
                  const params = new URLSearchParams({
                    preset: String(d),
                    from: today.toISOString().slice(0, 10),
                    to: toDate.toISOString().slice(0, 10),
                  });
                  return (
                    <Link
                      key={d}
                      href={`/renewals?${params.toString()}`}
                      className={`btn btn-ghost border-[var(--ic-gray-200)] ${
                        presetDays === d ? "bg-[var(--ic-teal)]/10 text-[var(--ic-navy)] border-[var(--ic-teal)]" : ""
                      }`}
                    >
                      Next {d} days
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </div>

      <RenewalsClient 
        policies={policyRows} 
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
        perPage={perPage}
        searchParams={{
          q: q || undefined,
          from: !useSearch && from ? from.toISOString().slice(0, 10) : undefined,
          to: !useSearch && to ? to.toISOString().slice(0, 10) : undefined,
        }}
      />
    </div>
  );
}

