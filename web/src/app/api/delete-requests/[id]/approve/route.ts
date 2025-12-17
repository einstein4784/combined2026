import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { DeleteRequest } from "@/models/DeleteRequest";
import { performDeletion } from "@/lib/delete-actions";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (context: RouteContext) => {
  const params = "params" in context ? context.params : null;
  if (!params) throw new Error("Missing params");
  return "then" in params ? await params : params;
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await resolveParams(context);
    const auth = await guardPermission("approve_deletions");
    if ("response" in auth) return auth.response;

    await connectDb();
    const requestDoc = await DeleteRequest.findById(id);
    if (!requestDoc) {
      return json({ error: "Request not found" }, { status: 404 });
    }
    if (requestDoc.status !== "pending") {
      return json({ error: "Request already processed" }, { status: 400 });
    }

    await performDeletion(requestDoc.entityType, requestDoc.entityId, {
      actingUserId: auth.session.id,
      reason: requestDoc.reason || undefined,
    });

    requestDoc.status = "approved";
    requestDoc.decidedBy = auth.session.id;
    requestDoc.decidedAt = new Date();
    await requestDoc.save();

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}



