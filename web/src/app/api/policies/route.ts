import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { policySchema } from "@/lib/validators";
import { Policy } from "@/models/Policy";
import { generatePolicyNumber } from "@/lib/ids";
import { logAuditAction } from "@/lib/audit";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const parseDateOnly = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function GET() {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const policies = await Policy.find()
      .populate("customerId", "firstName middleName lastName email contactNumber")
      .populate("customerIds", "firstName middleName lastName email contactNumber")
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

    const customerIds = parsed.data.customerIds || [];
    if (
      !Array.isArray(customerIds) ||
      customerIds.length < 1 ||
      customerIds.length > 3 ||
      !customerIds.every((id) => mongoose.isValidObjectId(id))
    ) {
      return json({ error: "Invalid customers" }, { status: 400 });
    }

    const policyIdNumber = parsed.data.policyIdNumber.trim();
    if (!policyIdNumber) {
      return json({ error: "Policy ID number is required" }, { status: 400 });
    }

    const coverageType = parsed.data.coverageType.trim();
    if (!coverageType) {
      return json({ error: "Coverage type is required" }, { status: 400 });
    }

    const registrationNumber =
      parsed.data.registrationNumber?.toString().trim() || "TBA";
    const engineNumber = parsed.data.engineNumber?.toString().trim() || null;
    const chassisNumber = parsed.data.chassisNumber?.toString().trim() || null;
    const vehicleType = parsed.data.vehicleType?.toString().trim() || null;
    const notes = parsed.data.notes?.toString().trim() || null;

    const coverageStartDate = parseDateOnly(parsed.data.coverageStartDate);
    const coverageEndDate = parseDateOnly(parsed.data.coverageEndDate);
    if (!coverageStartDate || !coverageEndDate) {
      return json({ error: "Invalid coverage dates" }, { status: 400 });
    }
    if (coverageEndDate < coverageStartDate) {
      return json({ error: "Coverage end date cannot be before start date" }, { status: 400 });
    }

    await connectDb();
    const policyNumber = parsed.data.policyNumber?.trim() || generatePolicyNumber();

    const primaryCustomerId = customerIds[0];

    const created = await Policy.create({
      customerId: primaryCustomerId,
      customerIds,
      policyNumber,
      policyIdNumber,
      coverageType,
      registrationNumber,
      engineNumber,
      chassisNumber,
      vehicleType,
      coverageStartDate,
      coverageEndDate,
      totalPremiumDue: parsed.data.totalPremiumDue,
      amountPaid: 0,
      outstandingBalance: parsed.data.totalPremiumDue,
      status: parsed.data.status || "Active",
      createdBy: auth.session.id,
      notes,
    });

    await logAuditAction({
      userId: auth.session.id,
      action: "CREATE_POLICY",
      entityType: "Policy",
      entityId: created._id.toString(),
      details: { policyNumber: created.policyNumber, customerIds },
    });

    return json(created);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as any).code === 11000) {
      return json({ error: "Policy number already exists" }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const first = Object.values(error.errors)[0];
      const message = first?.message || "Invalid policy data";
      return json({ error: message }, { status: 400 });
    }
    if (error instanceof mongoose.Error.CastError) {
      return json({ error: `Invalid value for ${error.path}` }, { status: 400 });
    }
    return handleRouteError(error);
  }
}


