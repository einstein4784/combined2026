import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Receipt } from "@/models/Receipt";
import { logAuditAction } from "@/lib/audit";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    // Find all customers grouped by name
    const customers = await Customer.find({}).sort({ createdAt: 1 }).lean();
    
    // Group by customer name (normalize names for comparison)
    const normalizeName = (customer: typeof customers[0]) => {
      // Combine firstName, middleName, lastName and normalize
      const parts = [
        customer.firstName?.trim() || "",
        customer.middleName?.trim() || "",
        customer.lastName?.trim() || "",
      ].filter(Boolean);
      
      // Join and normalize: lowercase, remove extra spaces
      return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
    };

    const nameGroups: Record<string, typeof customers> = {};
    
    for (const customer of customers) {
      const normalizedName = normalizeName(customer);
      if (!normalizedName) continue;
      
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(customer);
    }

    // Find groups with duplicates (more than 1 customer)
    const duplicateGroups: Array<{
      name: string;
      customers: typeof customers;
      keep: typeof customers[0];
      delete: typeof customers;
    }> = [];

    for (const [name, group] of Object.entries(nameGroups)) {
      if (group.length > 1) {
        // Keep the oldest customer (first by createdAt)
        const sorted = [...group].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
        
        duplicateGroups.push({
          name,
          customers: group,
          keep: sorted[0],
          delete: sorted.slice(1),
        });
      }
    }

    // Collect all customer IDs that will be deleted
    const allDeleteIds = duplicateGroups.flatMap((group) =>
      group.delete.map((c) => new mongoose.Types.ObjectId(c._id.toString()))
    );

    // Find all policies associated with duplicate customers
    const policies = await Policy.find({
      $or: [
        { customerId: { $in: allDeleteIds } },
        { customerIds: { $in: allDeleteIds } },
      ],
    })
      .select("_id policyNumber policyIdNumber customerId customerIds coverageType outstandingBalance")
      .lean();

    // Group policies by customer ID
    const policiesByCustomer: Record<string, typeof policies> = {};
    
    for (const policy of policies) {
      // Check customerId field
      const customerId = policy.customerId?.toString();
      if (customerId && allDeleteIds.some((id) => id.toString() === customerId)) {
        if (!policiesByCustomer[customerId]) {
          policiesByCustomer[customerId] = [];
        }
        policiesByCustomer[customerId].push(policy);
      }

      // Check customerIds array
      if (Array.isArray(policy.customerIds)) {
        for (const cid of policy.customerIds) {
          const cidStr = cid?.toString();
          if (cidStr && allDeleteIds.some((id) => id.toString() === cidStr)) {
            if (!policiesByCustomer[cidStr]) {
              policiesByCustomer[cidStr] = [];
            }
            // Avoid duplicates if policy already added via customerId
            if (!policiesByCustomer[cidStr].some((p) => p._id.toString() === policy._id.toString())) {
              policiesByCustomer[cidStr].push(policy);
            }
          }
        }
      }
    }

    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.delete.length, 0);

    return json({
      duplicatesFound: duplicateGroups.length,
      customersToDelete: totalDuplicates,
      groups: duplicateGroups.map((group) => {
        const keepId = group.keep._id.toString();
        const deleteIds = group.delete.map((c) => c._id.toString());
        
        // Get policies for this group's customers
        const groupPolicies: Array<{
          policyId: string;
          policyNumber: string;
          policyIdNumber: string;
          coverageType: string;
          outstandingBalance: number;
          currentCustomerId: string;
        }> = [];

        for (const deleteId of deleteIds) {
          const customerPolicies = policiesByCustomer[deleteId] || [];
          for (const policy of customerPolicies) {
            groupPolicies.push({
              policyId: policy._id.toString(),
              policyNumber: policy.policyNumber,
              policyIdNumber: policy.policyIdNumber || "",
              coverageType: policy.coverageType || "",
              outstandingBalance: policy.outstandingBalance || 0,
              currentCustomerId: deleteId,
            });
          }
        }

        return {
          name: group.name,
          count: group.customers.length,
          keep: {
            id: keepId,
            name: `${group.keep.firstName} ${group.keep.middleName || ""} ${group.keep.lastName}`.trim(),
            email: group.keep.email || "",
            contactNumber: group.keep.contactNumber || "",
            createdAt: group.keep.createdAt,
          },
          delete: group.delete.map((c) => ({
            id: c._id.toString(),
            name: `${c.firstName} ${c.middleName || ""} ${c.lastName}`.trim(),
            email: c.email || "",
            contactNumber: c.contactNumber || "",
            createdAt: c.createdAt,
          })),
          policies: groupPolicies,
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    const body = await req.json().catch(() => ({}));
    // policyAssignments: { [policyId: string]: customerId: string }
    const policyAssignments: Record<string, string> = body.policyAssignments || {};

    // Find all customers grouped by name
    const customers = await Customer.find({}).sort({ createdAt: 1 }).lean();
    
    // Group by customer name (normalize names for comparison)
    const normalizeName = (customer: typeof customers[0]) => {
      // Combine firstName, middleName, lastName and normalize
      const parts = [
        customer.firstName?.trim() || "",
        customer.middleName?.trim() || "",
        customer.lastName?.trim() || "",
      ].filter(Boolean);
      
      // Join and normalize: lowercase, remove extra spaces
      return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
    };

    const nameGroups: Record<string, typeof customers> = {};
    
    for (const customer of customers) {
      const normalizedName = normalizeName(customer);
      if (!normalizedName) continue;
      
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(customer);
    }

    // Find groups with duplicates (more than 1 customer)
    const duplicateGroups: Array<{
      name: string;
      customers: typeof customers;
      keep: typeof customers[0];
      delete: typeof customers;
    }> = [];

    for (const [name, group] of Object.entries(nameGroups)) {
      if (group.length > 1) {
        // Keep the oldest customer (first by createdAt)
        const sorted = [...group].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
        
        duplicateGroups.push({
          name,
          customers: group,
          keep: sorted[0],
          delete: sorted.slice(1),
        });
      }
    }

    let deleted = 0;
    let policiesReassigned = 0;
    let receiptsReassigned = 0;
    const reassignmentDetails: Array<{
      policyId: string;
      policyNumber: string;
      fromCustomerId: string;
      toCustomerId: string;
    }> = [];

    // Collect all customer IDs that will be deleted
    const allDeleteIds = duplicateGroups.flatMap((group) =>
      group.delete.map((c) => new mongoose.Types.ObjectId(c._id.toString()))
    );

    // Collect all customer IDs that will be kept (for validation)
    const allKeepIds = new Set(
      duplicateGroups.map((group) => group.keep._id.toString())
    );

    // Find all policies associated with duplicate customers
    const policiesToReassign = await Policy.find({
      $or: [
        { customerId: { $in: allDeleteIds } },
        { customerIds: { $in: allDeleteIds } },
      ],
    }).lean();

    // Process each policy assignment
    for (const policy of policiesToReassign) {
      const policyId = policy._id.toString();
      const targetCustomerId = policyAssignments[policyId];

      // If no manual assignment, use the kept customer from the group
      let finalCustomerId: mongoose.Types.ObjectId;
      
      if (targetCustomerId && allKeepIds.has(targetCustomerId)) {
        // User manually assigned to a kept customer
        finalCustomerId = new mongoose.Types.ObjectId(targetCustomerId);
      } else {
        // Auto-assign to the kept customer from the duplicate group
        // Find which group this policy belongs to
        const policyCustomerId = policy.customerId?.toString();
        const policyCustomerIds = Array.isArray(policy.customerIds)
          ? policy.customerIds.map((cid) => cid?.toString()).filter(Boolean)
          : [];

        // Find the delete ID this policy is associated with
        let associatedDeleteId: string | null = null;
        if (policyCustomerId && allDeleteIds.some((id) => id.toString() === policyCustomerId)) {
          associatedDeleteId = policyCustomerId;
        } else {
          for (const cid of policyCustomerIds) {
            if (cid && allDeleteIds.some((id) => id.toString() === cid)) {
              associatedDeleteId = cid;
              break;
            }
          }
        }

        // Find the group and get the kept customer
        if (associatedDeleteId) {
          const group = duplicateGroups.find((g) =>
            g.delete.some((c) => c._id.toString() === associatedDeleteId)
          );
          if (group) {
            finalCustomerId = new mongoose.Types.ObjectId(group.keep._id.toString());
          } else {
            continue; // Skip if we can't find the group
          }
        } else {
          continue; // Skip if policy is not associated with a duplicate
        }
      }

      // Update policy customerId field
      await Policy.updateOne(
        { _id: policy._id },
        { $set: { customerId: finalCustomerId } }
      );

      // Update customerIds array - replace delete IDs with final customer ID
      const currentCustomerIds = (policy.customerIds || []) as mongoose.Types.ObjectId[];
      const updatedIds = currentCustomerIds
        .map((cid) => {
          const cidStr = cid.toString();
          // Replace any delete IDs with the final customer ID
          if (allDeleteIds.some((did) => did.toString() === cidStr)) {
            return finalCustomerId;
          }
          return cid;
        })
        .filter((cid) => {
          // Remove any remaining delete IDs
          const cidStr = cid.toString();
          return !allDeleteIds.some((did) => did.toString() === cidStr);
        });

      // Ensure final customer ID is in the array
      const finalIdStr = finalCustomerId.toString();
      if (!updatedIds.some((id) => id.toString() === finalIdStr)) {
        updatedIds.push(finalCustomerId);
      }

      // Ensure array has 1-3 entries
      const uniqueIds = Array.from(
        new Set(updatedIds.map((id) => id.toString()))
      )
        .slice(0, 3)
        .map((id) => new mongoose.Types.ObjectId(id));

      await Policy.updateOne(
        { _id: policy._id },
        { $set: { customerIds: uniqueIds } }
      );

      policiesReassigned++;
      reassignmentDetails.push({
        policyId,
        policyNumber: policy.policyNumber,
        fromCustomerId: policy.customerId?.toString() || "unknown",
        toCustomerId: finalCustomerId.toString(),
      });
    }

    // Reassign receipts from duplicates to their associated policies' customers
    // Receipts are linked to policies, so we need to update them based on policy assignments
    for (const group of duplicateGroups) {
      const deleteIds = group.delete.map((c) => new mongoose.Types.ObjectId(c._id.toString()));

      // Find receipts for duplicate customers
      const receipts = await Receipt.find({
        customerId: { $in: deleteIds },
      }).lean();

      for (const receipt of receipts) {
        // Find the policy this receipt is linked to
        if (receipt.policyId) {
          const policy = policiesToReassign.find(
            (p) => p._id.toString() === receipt.policyId?.toString()
          );
          if (policy) {
            const policyId = policy._id.toString();
            const targetCustomerId = policyAssignments[policyId];
            
            let finalCustomerId: mongoose.Types.ObjectId;
            if (targetCustomerId && allKeepIds.has(targetCustomerId)) {
              finalCustomerId = new mongoose.Types.ObjectId(targetCustomerId);
            } else {
              // Use the kept customer from the group
              finalCustomerId = new mongoose.Types.ObjectId(group.keep._id.toString());
            }

            await Receipt.updateOne(
              { _id: receipt._id },
              { $set: { customerId: finalCustomerId } }
            );
            receiptsReassigned++;
          }
        } else {
          // No policy link, assign to kept customer
          const keepId = new mongoose.Types.ObjectId(group.keep._id.toString());
          await Receipt.updateOne(
            { _id: receipt._id },
            { $set: { customerId: keepId } }
          );
          receiptsReassigned++;
        }
      }
    }

    // Delete duplicate customers
    for (const group of duplicateGroups) {
      const deleteIds = group.delete.map((c) => new mongoose.Types.ObjectId(c._id.toString()));
      await Customer.deleteMany({ _id: { $in: deleteIds } });
      deleted += deleteIds.length;
    }

    await logAuditAction({
      userId: auth.session.id,
      action: "DELETE_DUPLICATE_CUSTOMERS",
      entityType: "Customer",
      entityId: "bulk",
      details: {
        deleted,
        policiesReassigned,
        receiptsReassigned,
        groupsProcessed: duplicateGroups.length,
        reassignmentDetails,
      },
    });

    return json({
      success: true,
      deleted,
      policiesReassigned,
      receiptsReassigned,
      groupsProcessed: duplicateGroups.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

