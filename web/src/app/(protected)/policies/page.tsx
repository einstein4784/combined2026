import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import { PolicyForm } from "@/components/forms/PolicyForm";

export default async function PoliciesPage() {
  await connectDb();
  const [policies, customers] = await Promise.all([
    Policy.find()
      .populate("customerId", "firstName middleName lastName email contactNumber")
      .sort({ createdAt: -1 })
      .lean(),
    Customer.find().sort({ firstName: 1 }),
  ]);

  type PolicyRow = {
    _id: string;
    policyNumber: string;
    coverageType: string;
    totalPremiumDue: number;
    outstandingBalance: number;
    customerId?: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email?: string;
      contactNumber?: string;
    };
  };

  const policyRows = policies as unknown as PolicyRow[];

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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Active policies</h2>
            <span className="badge success">{policyRows.length} records</span>
          </div>
          <table className="mt-4">
            <thead>
              <tr>
                <th>Policy #</th>
                <th>Customer</th>
                <th>Coverage</th>
                <th>Total</th>
                <th>Outstanding</th>
                <th>Notice</th>
              </tr>
            </thead>
            <tbody>
              {policyRows.map((p) => (
                <tr key={p._id}>
                  <td>{p.policyNumber}</td>
                  <td>
                    {p.customerId?.firstName} {p.customerId?.lastName}
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
                      className="text-[var(--ic-navy)] underline"
                    >
                      Print notice
                    </a>
                  </td>
                </tr>
              ))}
              {!policyRows.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-sm text-slate-500">
                    No policies yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

