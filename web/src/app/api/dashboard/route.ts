import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const [customerCount, policyCount, paymentCount, payments] = await Promise.all([
      Customer.countDocuments(),
      Policy.countDocuments(),
      Payment.countDocuments(),
      Payment.find().sort({ createdAt: -1 }).limit(5),
    ]);

    return json({
      customerCount,
      policyCount,
      paymentCount,
      recentPayments: payments,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


