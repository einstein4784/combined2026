import { connectDb } from "@/lib/db";
import { guardPermission, guardSession } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { paymentSchema } from "@/lib/validators";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import "@/models/Customer";
import { generateReceiptNumber } from "@/lib/ids";
import { logAuditAction } from "@/lib/audit";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    await connectDb();
    const payments = await Payment.find()
      .populate({
        path: "policyId",
        select: "policyNumber customerId",
        populate: { path: "customerId", select: "firstName lastName email" },
      })
      .sort({ paymentDate: -1 });

    return json(payments);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await guardSession();
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    const amount = Number(parsed.data.amount ?? 0);
    const refundAmount = Number(parsed.data.refundAmount ?? 0);

    await connectDb();
    const user = await User.findById(auth.session.id).select("fullName users_location").lean();
    const receivedByName = user?.fullName;
    const userLocation = (user as any)?.users_location || null;
    const policy = await Policy.findById(parsed.data.policyId).populate(
      "customerId",
      "firstName lastName email contactNumber",
    );
    if (!policy) return json({ error: "Policy not found" }, { status: 404 });

    const totalPremiumDue = Number(policy.totalPremiumDue ?? 0);
    const amountPaidSoFar = Number((policy as any).amountPaid ?? 0);
    const outstanding = Math.max(totalPremiumDue - amountPaidSoFar, 0);
    const appliedToOutstanding = amount + refundAmount; // refunds reduce outstanding directly

    if (appliedToOutstanding > outstanding) {
      if (!parsed.data.arrearsOverrideUsed) {
        return json({ error: "Payment exceeds outstanding balance" }, { status: 400 });
      }
      const overrideCheck = await guardPermission("override_outstanding_balance");
      if ("response" in overrideCheck) return overrideCheck.response;
    }

    const receiptNumber = generateReceiptNumber();
    const newAmountPaid = Math.max(amountPaidSoFar + appliedToOutstanding, 0);
    policy.amountPaid = newAmountPaid;
    policy.outstandingBalance = Math.max(totalPremiumDue - newAmountPaid, 0);
    await policy.save();

    const payment = await Payment.create({
      policyId: policy._id,
      amount: amount, // store the payment received
      refundAmount,
      paymentDate: new Date(),
      paymentMethod: parsed.data.paymentMethod || "Cash",
      receiptNumber,
      receivedBy: auth.session.id,
      arrearsOverrideUsed: parsed.data.arrearsOverrideUsed || false,
      notes: parsed.data.notes,
    });

    const receipt = await Receipt.create({
      receiptNumber,
      paymentId: payment._id,
      policyId: policy._id,
      customerId: policy.customerId,
      amount: amount, // cash received
      paymentDate: payment.paymentDate,
      generatedBy: auth.session.id,
      generatedByName: receivedByName,
      paymentMethod: parsed.data.paymentMethod || "Cash",
      notes: parsed.data.notes,
      location: userLocation || undefined,
      registrationNumber: (policy as any).registrationNumber || "TBA",
      policyNumberSnapshot: policy.policyNumber,
      policyIdNumberSnapshot: policy.policyIdNumber,
      customerNameSnapshot: `${(policy as any).customerId?.firstName ?? ""} ${
        (policy as any).customerId?.lastName ?? ""
      }`.trim(),
      customerEmailSnapshot: (policy as any).customerId?.email,
      customerContactSnapshot: (policy as any).customerId?.contactNumber,
      outstandingBalanceAfter: policy.outstandingBalance,
    });

    await logAuditAction({
      userId: auth.session.id,
      action: "RECEIVE_PAYMENT",
      entityType: "Payment",
      entityId: payment._id.toString(),
      details: { policyId: policy._id, amount: parsed.data.amount, receivedByName },
    });

    return json({ payment, receipt });
  } catch (error) {
    return handleRouteError(error);
  }
}


