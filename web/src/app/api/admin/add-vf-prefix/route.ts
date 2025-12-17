import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { Policy } from "@/models/Policy";
import { Receipt } from "@/models/Receipt";
import { json, handleRouteError } from "@/lib/utils";

export const dynamic = "force-dynamic";

function splitPrefix(value: string): { prefix: string; suffix: string } {
  if (!value) return { prefix: "", suffix: "" };
  const [first, ...rest] = value.split("-");
  return { prefix: first || "", suffix: rest.join("-") || "" };
}

function addVFPrefix(value: string): string {
  if (!value) return "VF";
  const trimmed = value.trim();
  
  // If already starts with VF (case-insensitive), return as is
  if (trimmed.toUpperCase().startsWith("VF")) {
    return trimmed;
  }
  
  // If has a prefix, replace it with VF
  const parts = splitPrefix(trimmed);
  if (parts.prefix && parts.suffix) {
    return `VF-${parts.suffix}`;
  }
  
  // If no prefix, add VF-
  return `VF-${trimmed}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { User } = await import("@/models/User");
    await connectDb();
    const user = await User.findById(session.id).lean();
    if (!user || (user as any).role !== "admin") {
      return json({ error: "Admin access required" }, { status: 403 });
    }

    const policies = await Policy.find({}).lean();
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const policy of policies) {
      try {
        const currentPolicyIdNumber = policy.policyIdNumber || "";
        const currentPolicyNumber = policy.policyNumber || "";
        
        const newPolicyIdNumber = addVFPrefix(currentPolicyIdNumber);
        const newPolicyNumber = addVFPrefix(currentPolicyNumber);
        
        // Skip if both already have VF prefix and haven't changed
        if (
          currentPolicyIdNumber.toUpperCase().startsWith("VF") &&
          currentPolicyNumber.toUpperCase().startsWith("VF") &&
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

    // Update receipt locations for all policies that now have VF prefix
    let receiptsUpdated = 0;
    const receipts = await Receipt.find({}).lean();
    for (const receipt of receipts) {
      try {
        const policy = await Policy.findById(receipt.policyId).select("policyIdNumber").lean();
        if (policy?.policyIdNumber && policy.policyIdNumber.trim().toUpperCase().startsWith("VF")) {
          await Receipt.updateOne(
            { _id: receipt._id },
            { $set: { location: "Vieux Fort" } }
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

