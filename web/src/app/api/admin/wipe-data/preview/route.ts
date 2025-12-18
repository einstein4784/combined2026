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

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    // Get counts for all collections
    const [
      customersCount,
      policiesCount,
      paymentsCount,
      receiptsCount,
      deleteRequestsCount,
      financialPeriodsCount,
      activePoliciesCount,
      outstandingBalance,
    ] = await Promise.all([
      Customer.countDocuments({}),
      Policy.countDocuments({}),
      Payment.countDocuments({}),
      Receipt.countDocuments({}),
      DeleteRequest.countDocuments({ 
        entityType: { $in: ["customer", "policy", "payment", "receipt"] } 
      }),
      FinancialPeriod.countDocuments({}),
      Policy.countDocuments({ status: "Active" }),
      Policy.aggregate([
        { $group: { _id: null, total: { $sum: "$outstandingBalance" } } }
      ]),
    ]);

    const totalOutstanding = outstandingBalance[0]?.total || 0;

    // Generate warnings based on data state
    const warnings = [];
    if (activePoliciesCount > 0) {
      warnings.push(`${activePoliciesCount} active policies will be deleted`);
    }
    if (totalOutstanding > 0) {
      warnings.push(`Outstanding balance of $${totalOutstanding.toFixed(2)} will be lost`);
    }
    if (deleteRequestsCount > 0) {
      warnings.push(`${deleteRequestsCount} pending delete requests will be removed`);
    }

    return json({
      success: true,
      counts: {
        transactional: {
          customers: customersCount,
          policies: policiesCount,
          payments: paymentsCount,
          receipts: receiptsCount,
        },
        workflow: {
          deleteRequests: deleteRequestsCount,
        },
        financial: {
          financialPeriods: financialPeriodsCount,
        },
      },
      totals: {
        transactional: customersCount + policiesCount + paymentsCount + receiptsCount,
        workflow: deleteRequestsCount,
        financial: financialPeriodsCount,
        grandTotal: customersCount + policiesCount + paymentsCount + receiptsCount + 
                    deleteRequestsCount + financialPeriodsCount,
      },
      warnings,
      metadata: {
        activePolicies: activePoliciesCount,
        outstandingBalance: totalOutstanding,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

