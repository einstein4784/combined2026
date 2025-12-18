import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { json, handleRouteError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    // Guard permission - allow all logged-in users to renew policies
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();

    const body = await req.json();
    const {
      originalPolicyId,
      customerId,
      coverageStartDate,
      coverageEndDate,
      totalPremiumDue,
    } = body;

    // Validate required fields
    if (!originalPolicyId || !customerId || !coverageStartDate || !coverageEndDate || !totalPremiumDue) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Find the original policy
    const originalPolicy = await Policy.findById(originalPolicyId).lean();
    if (!originalPolicy) {
      return json({ error: "Original policy not found" }, 404);
    }

    // Create the renewal policy with copied details
    const renewalPolicy = await Policy.create({
      policyNumber: originalPolicy.policyNumber, // Same policy number for tracking
      policyIdNumber: originalPolicy.policyIdNumber,
      customerId: customerId,
      customerIds: originalPolicy.customerIds || [customerId],
      coverageType: originalPolicy.coverageType,
      registrationNumber: originalPolicy.registrationNumber,
      engineNumber: originalPolicy.engineNumber,
      chassisNumber: originalPolicy.chassisNumber,
      vehicleType: originalPolicy.vehicleType,
      coverageStartDate: new Date(coverageStartDate),
      coverageEndDate: new Date(coverageEndDate),
      totalPremiumDue: parseFloat(totalPremiumDue),
      amountPaid: 0,
      outstandingBalance: parseFloat(totalPremiumDue),
      status: "Active",
      createdBy: auth.session.id,
    });

    return json({
      success: true,
      message: "Policy renewed successfully",
      policyId: renewalPolicy._id.toString(),
      policy: renewalPolicy,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

