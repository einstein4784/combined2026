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

    // Find all customers with SF prefix first
    const sfCustomers = await Customer.find({
      idNumber: { $regex: /^SF/i }
    }).select("_id idNumber").lean();

    if (sfCustomers.length === 0) {
      return json({
        success: true,
        policies: {
          total: 0,
          updated: 0,
          skipped: 0,
        },
        receipts: {
          total: 0,
          updated: 0,
        },
        message: "No customers with SF prefix found",
      });
    }

    const sfCustomerIds = sfCustomers.map(c => c._id);

    // Find policies for SF customers
    const policies = await Policy.find({
      customerId: { $in: sfCustomerIds }
    }).lean();
    
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const policy of policies) {
      try {
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

    // Update receipt locations for policies with SF prefix
    const receiptsUpdated = await Receipt.updateMany(
      { 
        policyId: { $in: policies.map(p => p._id) }
      },
      { 
        $set: { location: "Soufriere" } 
      }
    );

    return json({
      success: true,
      policies: {
        total: policies.length,
        updated,
        skipped,
      },
      receipts: {
        total: receiptsUpdated.matchedCount || 0,
        updated: receiptsUpdated.modifiedCount || 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

