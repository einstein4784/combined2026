import { connectDb } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { CustomerForm } from "@/components/forms/CustomerForm";

export default async function CustomersPage() {
  await connectDb();
  const customers = await Customer.find().sort({ createdAt: -1 });

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">CRM</p>
        <h4>Customers</h4>
        <p className="page-subtitle">Directory of insured clients with quick add-on the right.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Directory</h2>
            <span className="badge success">{customers.length} total</span>
          </div>
          <table className="mt-3">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id.toString()}>
                  <td>
                    {c.firstName} {c.middleName} {c.lastName}
                  </td>
                  <td>{c.contactNumber}</td>
                  <td>{c.email}</td>
                  <td>{c.idNumber}</td>
                </tr>
              ))}
              {!customers.length && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-slate-500">
                    No customers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

