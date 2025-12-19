import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { json, handleRouteError } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    console.log("[Renew] Starting policy renewal request");
    
    // Guard permission - require renew_policy permission
    const auth = await guardPermission("renew_policy");
    if ("response" in auth) {
      console.log("[Renew] Auth failed");
      return auth.response;
    }
    
    console.log("[Renew] Auth successful, session ID:", auth.session.id);

    await connectDb();
    console.log("[Renew] DB connected");

    const body = await req.json();
    console.log("[Renew] Request body:", JSON.stringify(body));
    
    const {
      originalPolicyId,
      customerId,
      coverageStartDate,
      coverageEndDate,
      totalPremiumDue,
    } = body;

    // Validate required fields
    if (!originalPolicyId || !customerId || !coverageStartDate || !coverageEndDate || !totalPremiumDue) {
      console.log("[Renew] Missing required fields");
      return json({ error: "Missing required fields" }, 400);
    }

    // Find the original policy
    console.log("[Renew] Finding original policy:", originalPolicyId);
    const originalPolicy = await Policy.findById(originalPolicyId).lean();
    if (!originalPolicy) {
      console.log("[Renew] Original policy not found");
      return json({ error: "Original policy not found" }, 404);
    }
    console.log("[Renew] Original policy found");

    // Create the renewal policy with copied details
    const policyData = {
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
      status: "Active" as const,
      createdBy: auth.session.id,
    };
    
    console.log("[Renew] Creating new policy with data:", JSON.stringify({
      ...policyData,
      createdBy: auth.session.id,
      createdByType: typeof auth.session.id
    }));
    
    const renewalPolicy = await Policy.create(policyData);
    console.log("[Renew] Policy created successfully:", renewalPolicy._id);

    return json({
      success: true,
      message: "Policy renewed successfully",
      policyId: renewalPolicy._id.toString(),
      policy: renewalPolicy,
    });
  } catch (error) {
    console.error("[Renew] Error during policy renewal:", error);
    return handleRouteError(error);
  }
}

