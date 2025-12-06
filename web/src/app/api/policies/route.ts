import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { policySchema } from "@/lib/validators";
import { Policy } from "@/models/Policy";
import { generatePolicyNumber } from "@/lib/ids";
import { logAuditAction } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const policies = await Policy.find()
      .populate("customerId", "firstName middleName lastName email contactNumber")
      .sort({ createdAt: -1 });

    return json(policies);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await guardPermission("create_edit_policy");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    const policyNumber = parsed.data.policyNumber || generatePolicyNumber();

    const created = await Policy.create({
      customerId: parsed.data.customerId,
      policyNumber,
      coverageType: parsed.data.coverageType,
      coverageStartDate: parsed.data.coverageStartDate,
      coverageEndDate: parsed.data.coverageEndDate,
      totalPremiumDue: parsed.data.totalPremiumDue,
      amountPaid: 0,
      outstandingBalance: parsed.data.totalPremiumDue,
      status: parsed.data.status || "Active",
      createdBy: auth.session.id,
    });

    await logAuditAction({
      userId: auth.session.id,
      action: "CREATE_POLICY",
      entityType: "Policy",
      entityId: created._id.toString(),
      details: { policyNumber: created.policyNumber, customerId: created.customerId },
    });

    return json(created);
  } catch (error) {
    return handleRouteError(error);
  }
}


