import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { EditCustomerButton } from "@/components/EditCustomerButton";
import { CustomerPoliciesView } from "@/components/CustomerPoliciesView";

type PageParams = { params: { id: string } } | { params: Promise<{ id: string }> };

const resolveParams = async (context: PageParams) => Promise.resolve(context.params);

export default async function CustomerDetailPage(context: PageParams) {
  const { id } = await resolveParams(context);

  await connectDb();

  const customer = await Customer.findById(id).lean();
  if (!customer) {
    notFound();
  }

  const policies = await Policy.find({
    $or: [{ customerId: id }, { customerIds: id }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const policyIds = policies.map((p) => p._id);
  const payments =
    policyIds.length === 0
      ? []
      : await Payment.find({ policyId: { $in: policyIds } })
          .sort({ paymentDate: -1 })
          .lean();

  // Serialize policies and payments for client component
  const safePolicies = policies.map((p) => ({
    _id: p._id.toString(),
    policyNumber: p.policyNumber,
    policyIdNumber: p.policyIdNumber,
    coverageType: p.coverageType,
    status: p.status,
    totalPremiumDue: Number(p.totalPremiumDue || 0),
    amountPaid: Number(p.amountPaid || 0),
    outstandingBalance: Number(p.outstandingBalance || 0),
    registrationNumber: p.registrationNumber,
    engineNumber: p.engineNumber,
    chassisNumber: p.chassisNumber,
    vehicleType: p.vehicleType,
    coverageStartDate: p.coverageStartDate ? p.coverageStartDate.toISOString() : undefined,
    coverageEndDate: p.coverageEndDate ? p.coverageEndDate.toISOString() : undefined,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  }));

  const safePayments = payments.map((pay) => ({
    _id: pay._id.toString(),
    policyId: pay.policyId.toString(),
    amount: Number(pay.amount || 0),
    refundAmount: Number(pay.refundAmount || 0),
    paymentDate: pay.paymentDate.toISOString(),
    paymentMethod: pay.paymentMethod,
    receiptNumber: pay.receiptNumber,
    notes: pay.notes || "",
  }));

  const safeCustomer = {
    _id: customer._id.toString(),
    firstName: customer.firstName || "",
    middleName: customer.middleName || "",
    lastName: customer.lastName || "",
    address: customer.address || "",
    contactNumber: customer.contactNumber || "",
    email: customer.email || "",
    sex: (customer as any).sex || "Male",
    idNumber: customer.idNumber || "",
    hasArrears: (customer as any).hasArrears ?? false,
    arrearsOverride: (customer as any).arrearsOverride ?? false,
    createdAt: customer.createdAt,
  };

  return (
    <div className="space-y-6">
      <div className="page-title-box flex items-start justify-between">
        <div>
          <p className="section-heading">Customer</p>
          <h4>
            {safeCustomer.firstName} {safeCustomer.middleName} {safeCustomer.lastName}
          </h4>
          <p className="page-subtitle">Full details and payment history.</p>
        </div>
        <EditCustomerButton customer={safeCustomer} />
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Customer Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Detail label="Name" value={`${safeCustomer.firstName} ${safeCustomer.middleName} ${safeCustomer.lastName}`} />
          <Detail label="Email" value={safeCustomer.email} />
          <Detail label="Contact" value={safeCustomer.contactNumber} />
          <Detail label="ID Number" value={safeCustomer.idNumber} />
          <Detail label="Sex" value={safeCustomer.sex || "—"} />
          <Detail label="Address" value={safeCustomer.address} />
          <Detail
            label="Created"
            value={new Date(safeCustomer.createdAt).toLocaleDateString()}
          />
          <Detail
            label="Arrears"
            value={safeCustomer.hasArrears ? "Yes" : "No"}
          />
          <Detail
            label="Arrears Override"
            value={safeCustomer.arrearsOverride ? "Enabled" : "Disabled"}
          />
        </div>
      </div>

      <CustomerPoliciesView 
        policies={safePolicies}
        payments={safePayments}
        customerId={id}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--ic-navy)]">{value || "—"}</p>
    </div>
  );
}






