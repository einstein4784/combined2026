import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Receipt } from "@/models/Receipt";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    await connectDb();
    const receipts = await Receipt.find()
      .populate("customerId", "firstName lastName email")
      .populate("policyId", "policyNumber")
      .sort({ generatedAt: -1 })
      .lean();

    return json(receipts);
  } catch (error) {
    return handleRouteError(error);
  }
}


