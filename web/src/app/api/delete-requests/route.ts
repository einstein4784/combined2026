import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { json, handleRouteError } from "@/lib/utils";
import { requireSession } from "@/lib/auth";
import { guardPermission } from "@/lib/api-auth";
import { DeleteRequest } from "@/models/DeleteRequest";

const ALLOWED_ENTITY_TYPES = ["customer", "policy", "payment", "receipt", "user"];

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const auth = await guardPermission("approve_deletions");
    if ("response" in auth) return auth.response;

    await connectDb();
    const pending = await DeleteRequest.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return json({
      requests: pending.map((r) => ({
        _id: r._id.toString(),
        entityType: r.entityType,
        entityId: r.entityId,
        entityLabel: r.entityLabel || "",
        requestedBy: r.requestedBy?.toString() || "",
        status: r.status,
        createdAt: r.createdAt,
        reason: r.reason || null,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { entityType, entityId, entityLabel, reason } = body as {
      entityType?: string;
      entityId?: string;
      entityLabel?: string;
      reason?: string;
    };

    if (!entityType || !ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return json({ error: "Invalid entity type" }, { status: 400 });
    }
    if (!entityId || typeof entityId !== "string") {
      return json({ error: "entityId is required" }, { status: 400 });
    }

    await connectDb();
    const existing = await DeleteRequest.findOne({
      entityType,
      entityId,
      status: "pending",
    }).lean();
    if (existing) {
      return json({ success: true, duplicate: true });
    }

    const doc = await DeleteRequest.create({
      entityType,
      entityId,
      entityLabel,
      requestedBy: session.id,
      status: "pending",
      reason,
    });

    return json({ success: true, requestId: doc._id.toString() });
  } catch (error) {
    return handleRouteError(error);
  }
}



