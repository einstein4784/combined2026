import Link from "next/link";
import { connectDb } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";

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
      <div className="page-title-box">
        <p className="section-heading">Overview</p>
        <h4>Dashboard</h4>
        <div className="page-subtitle">Live snapshot of customers, policies, and payments.</div>
      </div>

      <div className="card flex flex-wrap items-center gap-4 bg-gradient-to-r from-[#e8f1fb] via-white to-[#e8f1fb]">
        <img
          src="/IC-LOGO-NEW.png"
          alt="Combined Insurance Services"
          className="h-14 w-auto object-contain"
        />
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Welcome</p>
          <h3 className="text-xl font-semibold text-[var(--ic-navy)]">
            Combined Insurance Services (St. Lucia) Ltd.
          </h3>
          <p className="text-sm text-[var(--ic-gray-600)]">
            Quick glance at customers, policies, and payments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Customers" value={customerCount} />
        <StatCard title="Policies" value={policyCount} />
        <StatCard title="Payments" value={paymentCount} />
      </div>
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Recent Customers</h2>
          <span className="badge success">Latest</span>
        </div>
        <table className="mt-4">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id}>
                <td>
                  <Link href={`/customers/${p._id}`} className="text-[var(--ic-navy)] underline">
                    {`${p.firstName} ${p.lastName}`}
                  </Link>
                </td>
                <td>{p.email || "—"}</td>
                <td>{p.contactNumber || "—"}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#d5e3f7] bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="text-xs uppercase tracking-[0.1em] text-[var(--ic-gray-600)]">{title}</div>
      <div className="text-3xl font-semibold text-[var(--ic-navy)] mt-2">{value}</div>
    </div>
  );
}

