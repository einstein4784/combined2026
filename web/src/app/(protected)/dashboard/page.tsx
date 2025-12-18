import Link from "next/link";
import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await connectDb();
  const [customerCount, policyCount, paymentCount, customers] = await Promise.all([
    Customer.countDocuments(),
    Policy.countDocuments(),
    Payment.countDocuments(),
    Customer.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  type CustomerRow = {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    contactNumber: string;
    createdAt: Date;
  };

  const rows = customers as unknown as CustomerRow[];

  return (
    <div className="space-y-6">
      {/* Enhanced Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-[var(--ic-gray-200)] p-8 shadow-lg">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--ic-gray-50)] border border-[var(--ic-gray-200)] p-3">
            <img
              src="/IC-LOGO-NEW.png"
              alt="Combined Insurance Services"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Welcome Back</p>
            <h1 className="text-3xl font-bold text-[var(--ic-navy)] lg:text-4xl">
              Combined Insurance Services
            </h1>
            <p className="text-base text-[var(--ic-gray-700)]">
              St. Lucia Ltd. • Your comprehensive management dashboard
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/policies"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--ic-navy)] bg-white px-5 py-3 text-sm font-bold text-[var(--ic-navy)] shadow-md transition hover:bg-[var(--ic-navy)] hover:text-white hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Policies
            </Link>
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ic-teal)] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--ic-teal-dark)] hover:shadow-lg"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              View Customers
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard 
          title="Total Customers" 
          value={customerCount}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          gradient="from-blue-500 to-blue-600"
          linkHref="/customers"
          linkText="View all"
        />
        <StatCard 
          title="Active Policies" 
          value={policyCount}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          gradient="from-emerald-500 to-teal-600"
          linkHref="/policies"
          linkText="Manage"
        />
        <StatCard 
          title="Total Payments" 
          value={paymentCount}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          gradient="from-violet-500 to-purple-600"
          linkHref="/payments"
          linkText="View all"
        />
      </div>

      {/* Enhanced Recent Customers Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--ic-gray-200)] bg-white shadow-sm">
        <div className="border-b border-[var(--ic-gray-200)] bg-gradient-to-r from-[var(--ic-gray-50)] to-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--ic-navy)]">Recent Customers</h2>
                <p className="text-sm text-[var(--ic-gray-600)]">Latest additions to your database</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                Live
              </span>
              <Link
                href="/customers"
                className="text-sm font-semibold text-[var(--ic-teal)] hover:text-[var(--ic-navy)] transition"
              >
                View all →
              </Link>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[var(--ic-gray-50)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Added</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ic-gray-200)]">
              {rows.map((p, idx) => (
                <tr key={p._id} className="group hover:bg-[var(--ic-gray-50)] transition-colors">
                  <td className="px-6 py-4">
                    <Link 
                      href={`/customers/${p._id}`} 
                      className="flex items-center gap-3 font-semibold text-[var(--ic-navy)] hover:text-[var(--ic-teal)] transition"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-sm font-bold text-blue-700">
                        {(p.firstName?.[0] || '?').toUpperCase()}{(p.lastName?.[0] || '?').toUpperCase()}
                      </div>
                      {`${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--ic-gray-700)]">{p.email || "—"}</td>
                  <td className="px-6 py-4 text-sm text-[var(--ic-gray-700)]">{p.contactNumber || "—"}</td>
                  <td className="px-6 py-4 text-sm text-[var(--ic-gray-600)]">
                    {new Date(p.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/customers/${p._id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--ic-navy)] opacity-0 ring-1 ring-[var(--ic-gray-300)] transition hover:bg-[var(--ic-navy)] hover:text-white group-hover:opacity-100"
                    >
                      View
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ic-gray-100)]">
                        <svg className="h-6 w-6 text-[var(--ic-gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[var(--ic-gray-600)]">No customers yet</p>
                      <p className="text-xs text-[var(--ic-gray-500)]">Get started by adding your first customer</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon,
  gradient,
  linkHref,
  linkText 
}: { 
  title: string; 
  value: number;
  icon: React.ReactNode;
  gradient: string;
  linkHref: string;
  linkText: string;
}) {
  return (
    <Link href={linkHref}>
      <div className="group relative overflow-hidden rounded-2xl border border-[var(--ic-gray-200)] bg-white p-6 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02]">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
              {icon}
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-500)]">{title}</div>
              <div className="mt-1 text-3xl font-bold text-[var(--ic-navy)]">
                {value.toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between border-t border-[var(--ic-gray-100)] pt-4">
            <span className="text-xs font-medium text-[var(--ic-gray-600)]">
              {linkText}
            </span>
            <svg className="h-4 w-4 text-[var(--ic-gray-400)] transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

