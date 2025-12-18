import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Payment } from "@/models/Payment";
import { Policy } from "@/models/Policy";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    // Find all payments
    const payments = await Payment.find({}).lean();

    // Group payments by policy + date + amount to find duplicates
    const groups = new Map<string, any[]>();

    for (const payment of payments) {
      const date = new Date(payment.paymentDate);
      date.setHours(0, 0, 0, 0);
      const key = `${payment.policyId.toString()}_${date.getTime()}_${payment.amount}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(payment);
    }

    // Filter to only groups with duplicates
    const duplicateGroups = Array.from(groups.entries())
      .filter(([, paymentList]) => paymentList.length > 1)
      .map(([key, paymentList]) => {
        // Sort by createdAt to identify oldest
        const sorted = [...paymentList].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return {
          policyId: paymentList[0].policyId,
          amount: paymentList[0].amount,
          paymentDate: paymentList[0].paymentDate,
          count: paymentList.length,
          payments: sorted.map(p => ({
            _id: p._id.toString(),
            receiptNumber: p.receiptNumber,
            amount: p.amount,
            paymentDate: p.paymentDate,
            createdAt: p.createdAt,
          })),
          keepId: sorted[0]._id.toString(), // Keep the oldest
          deleteIds: sorted.slice(1).map(p => p._id.toString()),
        };
      });

    // Get policy information for each group
    const policyIds = [...new Set(duplicateGroups.map(g => g.policyId.toString()))];
    const policies = await Policy.find({ 
      _id: { $in: policyIds } 
    })
      .select("policyNumber policyIdNumber")
      .lean();

    const policyMap = new Map(policies.map(p => [p._id.toString(), p]));

    // Add policy info to groups
    const duplicatesWithPolicy = duplicateGroups.map(group => ({
      ...group,
      policyNumber: policyMap.get(group.policyId.toString())?.policyNumber || "Unknown",
      policyIdNumber: policyMap.get(group.policyId.toString())?.policyIdNumber || "",
    }));

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + (g.count - 1), 0);

    return json({
      success: true,
      totalDuplicateGroups: duplicateGroups.length,
      totalDuplicatePayments: totalDuplicates,
      duplicates: duplicatesWithPolicy,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    const body = await req.json();
    const { action } = body;

    if (action !== "delete") {
      return json({ error: "Invalid action" }, 400);
    }

    // Find all payments
    const payments = await Payment.find({}).lean();

    // Group payments by policy + date + amount to find duplicates
    const groups = new Map<string, any[]>();

    for (const payment of payments) {
      const date = new Date(payment.paymentDate);
      date.setHours(0, 0, 0, 0);
      const key = `${payment.policyId.toString()}_${date.getTime()}_${payment.amount}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(payment);
    }

    // Find duplicate groups
    const duplicateGroups = Array.from(groups.entries())
      .filter(([, paymentList]) => paymentList.length > 1)
      .map(([key, paymentList]) => {
        // Sort by createdAt to keep oldest
        const sorted = [...paymentList].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return {
          keep: sorted[0],
          delete: sorted.slice(1),
        };
      });

    // Collect all IDs to delete
    const idsToDelete = duplicateGroups.flatMap(group => 
      group.delete.map(p => new mongoose.Types.ObjectId(p._id.toString()))
    );

    // Delete duplicate payments
    const deleteResult = await Payment.deleteMany({
      _id: { $in: idsToDelete }
    });

    return json({
      success: true,
      duplicateGroupsFound: duplicateGroups.length,
      paymentsDeleted: deleteResult.deletedCount,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

