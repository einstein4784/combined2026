import { connectDb } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { json, handleRouteError } from "@/lib/utils";
import { policySchema } from "@/lib/validators";
import { Policy } from "@/models/Policy";
import { logAuditAction } from "@/lib/audit";
import mongoose from "mongoose";
import type { NextRequest } from "next/server";

const parseDateOnly = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

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
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

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
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    await connectDb();
    const existing = await Policy.findById(params.id);
    if (!existing) {
      return json({ error: "Not found" }, { status: 404 });
    }

    // Ensure customerIds is present for validation; updates may omit it from the UI.
    // Also normalize ObjectIds to strings so zod validation passes.
    const parsed = policySchema.safeParse({
      ...body,
      customerIds:
        Array.isArray(body.customerIds) && body.customerIds.length
          ? body.customerIds.map((id: any) => id?.toString?.() || id)
          : existing.customerIds?.length
            ? existing.customerIds.map((id: any) => id?.toString?.() || id)
            : body.customerId
              ? [body.customerId]
              : [],
    });
    if (!parsed.success) {
      return json({ error: "Invalid payload" }, { status: 400 });
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

    // Update customerIds if provided
    if (parsed.data.customerIds && Array.isArray(parsed.data.customerIds) && parsed.data.customerIds.length > 0) {
      // Validate all customer IDs are valid ObjectIds
      const validCustomerIds = parsed.data.customerIds.filter((id: any) => mongoose.isValidObjectId(id));
      if (validCustomerIds.length === 0) {
        return json({ error: "At least one valid customer ID is required" }, { status: 400 });
      }
      if (validCustomerIds.length > 3) {
        return json({ error: "Maximum 3 customers allowed" }, { status: 400 });
      }
      existing.customerIds = validCustomerIds;
      // Update primary customerId to first customer in the array
      existing.customerId = validCustomerIds[0];
    }

    existing.coverageType = coverageType;
    existing.registrationNumber = registrationNumber;
    existing.engineNumber = engineNumber;
    existing.chassisNumber = chassisNumber;
    existing.vehicleType = vehicleType;
    existing.policyNumber = parsed.data.policyNumber || existing.policyNumber;
    existing.policyIdNumber = parsed.data.policyIdNumber;
    existing.coverageStartDate = coverageStartDate;
    existing.coverageEndDate = coverageEndDate;
    existing.totalPremiumDue = parsed.data.totalPremiumDue;
    existing.status = parsed.data.status || existing.status;
    existing.outstandingBalance =
      parsed.data.totalPremiumDue - (existing.amountPaid || 0);
    existing.notes = notes;

    await existing.save();

    await logAuditAction({
      userId: session.id,
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
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

    return json(
      { error: "Deletion now requires manager approval. Submit a delete request." },
      { status: 403 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

