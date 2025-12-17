import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { ChatThread } from "@/models/ChatThread";
import { ChatMessage } from "@/models/ChatMessage";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (
  context: RouteContext,
): Promise<{ id: string }> => Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    await ChatMessage.deleteMany({ threadId: params.id });
    await ChatThread.findByIdAndDelete(params.id);
    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


