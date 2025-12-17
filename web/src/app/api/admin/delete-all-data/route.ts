import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();

    // Delete all business data collections
    const [customersDeleted, policiesDeleted, paymentsDeleted, receiptsDeleted] = await Promise.all([
      Customer.deleteMany({}),
      Policy.deleteMany({}),
      Payment.deleteMany({}),
      Receipt.deleteMany({}),
    ]);

    await logAuditAction({
      userId: auth.session.id,
      action: "DELETE_ALL_BUSINESS_DATA",
      entityType: "System",
      entityId: "system",
      details: {
        customersDeleted: customersDeleted.deletedCount,
        policiesDeleted: policiesDeleted.deletedCount,
        paymentsDeleted: paymentsDeleted.deletedCount,
        receiptsDeleted: receiptsDeleted.deletedCount,
      },
    });

    return json({
      success: true,
      deleted: {
        customers: customersDeleted.deletedCount,
        policies: policiesDeleted.deletedCount,
        payments: paymentsDeleted.deletedCount,
        receipts: receiptsDeleted.deletedCount,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


