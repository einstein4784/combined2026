import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { Policy } from "@/models/Policy";
import { Customer } from "@/models/Customer";
import { Receipt } from "@/models/Receipt";
import { json, handleRouteError } from "@/lib/utils";

export const dynamic = "force-dynamic";

function splitPrefix(value: string): { prefix: string; suffix: string } {
  if (!value) return { prefix: "", suffix: "" };
  const [first, ...rest] = value.split("-");
  return { prefix: first || "", suffix: rest.join("-") || "" };
}

function addSFPrefix(value: string): string {
  if (!value) return "SF";
  const trimmed = value.trim();
  
  // If already starts with SF (case-insensitive), return as is
  if (trimmed.toUpperCase().startsWith("SF")) {
    return trimmed;
  }
  
  // If has a prefix, replace it with SF
  const parts = splitPrefix(trimmed);
  if (parts.prefix && parts.suffix) {
    return `SF-${parts.suffix}`;
  }
  
  // If no prefix, add SF-
  return `SF-${trimmed}`;
}

export async function POST(req: NextRequest) {
  try {
    // Ensure user has admin permissions (manage_permissions is admin-only)
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) {
      return auth.response;
    }

    await connectDb();

    // Find all policies and populate customer information
    const policies = await Policy.find({}).populate("customerId").lean();
    
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const policy of policies) {
      try {
        // Check if the customer's idNumber begins with "SF"
        const customer = policy.customerId as any;
        if (!customer || !customer.idNumber) {
          skipped++;
          continue;
        }

        const customerIdNumber = customer.idNumber.toString().trim().toUpperCase();
        
        // Only process if customer ID starts with "SF"
        if (!customerIdNumber.startsWith("SF")) {
          skipped++;
          continue;
        }

        const currentPolicyIdNumber = policy.policyIdNumber || "";
        const currentPolicyNumber = policy.policyNumber || "";
        
        const newPolicyIdNumber = addSFPrefix(currentPolicyIdNumber);
        const newPolicyNumber = addSFPrefix(currentPolicyNumber);
        
        // Skip if both already have SF prefix and haven't changed
        if (
          currentPolicyIdNumber.toUpperCase().startsWith("SF") &&
          currentPolicyNumber.toUpperCase().startsWith("SF") &&
          newPolicyIdNumber === currentPolicyIdNumber &&
          newPolicyNumber === currentPolicyNumber
        ) {
          skipped++;
          continue;
        }

        await Policy.updateOne(
          { _id: policy._id },
          {
            $set: {
              policyIdNumber: newPolicyIdNumber,
              policyNumber: newPolicyNumber,
            },
          }
        );
        
        updated++;
      } catch (err: any) {
        errors.push(`Policy ${policy._id}: ${err.message}`);
      }
    }

    // Update receipt locations for all policies that now have SF prefix
    let receiptsUpdated = 0;
    const receipts = await Receipt.find({}).lean();
    for (const receipt of receipts) {
      try {
        const policy = await Policy.findById(receipt.policyId).select("policyIdNumber").lean();
        if (policy?.policyIdNumber && policy.policyIdNumber.trim().toUpperCase().startsWith("SF")) {
          // Set location for SF prefix - you can customize this location name
          await Receipt.updateOne(
            { _id: receipt._id },
            { $set: { location: "Soufriere" } }
          );
          receiptsUpdated++;
        }
      } catch (err: any) {
        errors.push(`Receipt ${receipt._id}: ${err.message}`);
      }
    }

    return json({
      success: true,
      policies: {
        total: policies.length,
        updated,
        skipped,
      },
      receipts: {
        total: receipts.length,
        updated: receiptsUpdated,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

