import { connectDb } from "@/lib/db";
import { Receipt } from "@/models/Receipt";
import "@/models/Payment";
import "@/models/Policy";
import "@/models/Customer";
import { notFound } from "next/navigation";
import { ReceiptViewer } from "@/components/ReceiptViewer";

type Params = { params: Promise<{ id: string }> };

export default async function ReceiptDetailPage({ params }: Params) {
  await connectDb();

  const { id } = await params;

  const receipt = await Receipt.findById(id)
    .populate({
      path: "paymentId",
      select: "amount paymentMethod paymentDate notes receiptNumber policyId receivedBy",
      populate: { path: "receivedBy", select: "fullName email users_location" },
    })
    .populate({
      path: "policyId",
      select:
        "policyNumber policyIdNumber coverageType coverageStartDate coverageEndDate outstandingBalance customerId",
      populate: {
        path: "customerId",
        select: "firstName lastName email contactNumber address",
      },
    })
    .populate("customerId", "firstName lastName email contactNumber")
    .populate("generatedBy", "fullName email")
    .lean();

  if (!receipt) {
    return notFound();
  }

  const payment = receipt.paymentId as any;
  const policy = receipt.policyId as any;
  const customer = receipt.customerId as any;
  const generatedBy = receipt.generatedBy as any;

  const customerName =
    receipt.customerNameSnapshot ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    "";

  const viewModel = {
    id: receipt._id.toString(),
    receiptNumber: receipt.receiptNumber,
    paymentDate: new Date(receipt.paymentDate).toISOString(),
    amount: receipt.amount,
    paymentMethod: receipt.paymentMethod || payment?.paymentMethod,
    notes: receipt.notes || payment?.notes,
    policyNumber: receipt.policyNumberSnapshot || policy?.policyNumber,
    policyIdNumber: policy?.policyIdNumber,
    registrationNumber: (receipt as any).registrationNumber || policy?.registrationNumber || "TBA",
    coverageType: policy?.coverageType,
    coverageStartDate: policy?.coverageStartDate
      ? new Date(policy.coverageStartDate).toISOString()
      : undefined,
    coverageEndDate: policy?.coverageEndDate
      ? new Date(policy.coverageEndDate).toISOString()
      : undefined,
    outstandingBalanceAfter:
      typeof receipt.outstandingBalanceAfter === "number"
        ? receipt.outstandingBalanceAfter
        : policy?.outstandingBalance,
    customerName: customerName || receipt.customerNameSnapshot,
    customerEmail: receipt.customerEmailSnapshot || customer?.email,
    customerContact: receipt.customerContactSnapshot || customer?.contactNumber,
    generatedByName: generatedBy?.fullName || payment?.receivedBy?.fullName || (receipt as any).generatedByName,
    location:
      (receipt as any).location ||
      generatedBy?.users_location ||
      payment?.receivedBy?.users_location ||
      null,
  };

  return (
    <div className="space-y-6">
      <div className="page-title-box print:hidden">
        <p className="section-heading">Receipt</p>
        <h4>{viewModel.receiptNumber}</h4>
        <p className="page-subtitle">Payment confirmation</p>
      </div>
      <ReceiptViewer receipt={viewModel} backHref="/payments" />
    </div>
  );
}

