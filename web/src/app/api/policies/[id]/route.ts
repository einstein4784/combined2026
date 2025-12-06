import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { policySchema } from "@/lib/validators";
import { Policy } from "@/models/Policy";
import { logAuditAction } from "@/lib/audit";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (
  context: RouteContext
): Promise<{ id: string }> => Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const policy = await Policy.findById(params.id).populate(
      "customerId",
      "firstName middleName lastName address email contactNumber sex idNumber",
    );
    if (!policy) return json({ error: "Not found" }, { status: 404 });
    return json(policy);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_policy");
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const parsed = policySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDb();
    const existing = await Policy.findById(params.id);
    if (!existing) {
      return json({ error: "Not found" }, { status: 404 });
    }

    existing.coverageType = parsed.data.coverageType;
    existing.coverageStartDate = parsed.data.coverageStartDate;
    existing.coverageEndDate = parsed.data.coverageEndDate;
    existing.totalPremiumDue = parsed.data.totalPremiumDue;
    existing.status = parsed.data.status || existing.status;
    existing.outstandingBalance =
      parsed.data.totalPremiumDue - (existing.amountPaid || 0);

    await existing.save();

    await logAuditAction({
      userId: auth.session.id,
      action: "UPDATE_POLICY",
      entityType: "Policy",
      entityId: params.id,
      details: parsed.data,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("create_edit_policy");
    if ("response" in auth) return auth.response;

    await connectDb();
    await Policy.findByIdAndDelete(params.id);

    await logAuditAction({
      userId: auth.session.id,
      action: "DELETE_POLICY",
      entityType: "Policy",
      entityId: params.id,
    });

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

