import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { DeleteRequest } from "@/models/DeleteRequest";
import { FinancialPeriod } from "@/models/FinancialPeriod";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

type DataTier = "TRANSACTIONAL" | "WORKFLOW" | "FINANCIAL";

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    const body = await req.json();
    const { confirmation, selectedTiers, dryRun } = body as {
      confirmation?: string;
      selectedTiers: DataTier[];
      dryRun?: boolean;
    };

    // Validate confirmation text (unless dry run)
    if (!dryRun && confirmation?.trim().toUpperCase() !== "PERMANENTLY DELETE ALL DATA") {
      return json(
        { error: "Invalid confirmation text. Must type exactly: PERMANENTLY DELETE ALL DATA" },
        400
      );
    }

    if (!selectedTiers || !Array.isArray(selectedTiers) || selectedTiers.length === 0) {
      return json({ error: "At least one data tier must be selected" }, 400);
    }

    const results: Record<string, any> = {};

    // Dry run mode - just preview what would be deleted
    if (dryRun) {
      const preview: Record<string, number> = {};

      if (selectedTiers.includes("TRANSACTIONAL")) {
        preview.customers = await Customer.countDocuments({});
        preview.policies = await Policy.countDocuments({});
        preview.payments = await Payment.countDocuments({});
        preview.receipts = await Receipt.countDocuments({});
      }

      if (selectedTiers.includes("WORKFLOW")) {
        preview.deleteRequests = await DeleteRequest.countDocuments({
          entityType: { $in: ["customer", "policy", "payment", "receipt"] },
        });
      }

      if (selectedTiers.includes("FINANCIAL")) {
        preview.financialPeriods = await FinancialPeriod.countDocuments({});
      }

      return json({
        preview: true,
        wouldDelete: preview,
        message: "This is a preview. No data has been deleted.",
      });
    }

    // Execute actual deletion with proper cascade order
    const deletedCounts: Record<string, number> = {};

    if (selectedTiers.includes("TRANSACTIONAL")) {
      // Delete in proper order: children first, then parents
      const [receiptsDeleted, paymentsDeleted, policiesDeleted, customersDeleted] = await Promise.all([
        Receipt.deleteMany({}),
        Payment.deleteMany({}),
        Policy.deleteMany({}),
        Customer.deleteMany({}),
      ]);

      deletedCounts.receipts = receiptsDeleted.deletedCount || 0;
      deletedCounts.payments = paymentsDeleted.deletedCount || 0;
      deletedCounts.policies = policiesDeleted.deletedCount || 0;
      deletedCounts.customers = customersDeleted.deletedCount || 0;
    }

    if (selectedTiers.includes("WORKFLOW")) {
      // Delete workflow data related to business entities
      const deleteRequestsDeleted = await DeleteRequest.deleteMany({
        entityType: { $in: ["customer", "policy", "payment", "receipt"] },
      });
      deletedCounts.deleteRequests = deleteRequestsDeleted.deletedCount || 0;
    }

    if (selectedTiers.includes("FINANCIAL")) {
      const financialPeriodsDeleted = await FinancialPeriod.deleteMany({});
      deletedCounts.financialPeriods = financialPeriodsDeleted.deletedCount || 0;
    }

    // Comprehensive audit log
    await logAuditAction({
      userId: auth.session.id,
      action: "WIPE_TRANSACTIONAL_DATA",
      entityType: "System",
      entityId: "bulk-deletion",
      details: {
        selectedTiers,
        deletedCounts,
        executedAt: new Date(),
        userEmail: auth.session.email,
        userName: auth.session.fullName,
      },
    });

    const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

    return json({
      success: true,
      deleted: deletedCounts,
      totalDeleted,
      message: `Successfully deleted ${totalDeleted} records across ${Object.keys(deletedCounts).length} collections`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}




