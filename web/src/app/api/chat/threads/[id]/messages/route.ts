import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { ChatMessage } from "@/models/ChatMessage";
import { ChatThread } from "@/models/ChatThread";
import { Types } from "mongoose";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (context: RouteContext): Promise<{ id: string }> =>
  Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
    const before = searchParams.get("before");

    await connectDb();

    const thread = await ChatThread.findById(params.id).select("participants").lean();
    if (!thread) return json({ error: "Not found" }, { status: 404 });
    if (!thread.participants.some((p: any) => p.toString() === auth.session.id)) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const filter: any = { threadId: new Types.ObjectId(params.id) };
    if (before) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const serialized = messages
      .reverse()
      .map((m) => ({
        ...m,
        _id: m._id.toString(),
        threadId: m.threadId.toString(),
        senderId: (m as any).senderId?.toString?.() || "",
        createdAt: m.createdAt,
        type: m.type,
        body: typeof m.body === "string" ? m.body : m.body?.toString?.(),
        file: m.file || undefined,
      }));

    return json({ messages: serialized });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { type = "text", text, file } = body;

    if (type === "text" && (!text || typeof text !== "string" || !text.trim())) {
      return json({ error: "Message text required" }, { status: 400 });
    }
    if (type === "file") {
      if (!file || typeof file !== "object") {
        return json({ error: "File required" }, { status: 400 });
      }
      const { name, size, mime, data } = file as any;
      if (!name || typeof name !== "string") return json({ error: "File name required" }, { status: 400 });
      if (typeof size !== "number" || size <= 0) return json({ error: "File size required" }, { status: 400 });
      if (size > 2 * 1024 * 1024) return json({ error: "File too large (max 2MB)" }, { status: 400 });
      if (!mime || typeof mime !== "string") return json({ error: "File mime required" }, { status: 400 });
      if (!data || typeof data !== "string" || !data.startsWith("data:")) {
        return json({ error: "File data must be a data URL" }, { status: 400 });
      }
    }

    await connectDb();

    const thread = await ChatThread.findById(params.id).select("participants").lean();
    if (!thread) return json({ error: "Not found" }, { status: 404 });
    if (!thread.participants.some((p: any) => p.toString() === auth.session.id)) {
      return json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await ChatMessage.create({
      threadId: new Types.ObjectId(params.id),
      senderId: new Types.ObjectId(auth.session.id),
      type,
      body: type === "text" ? text?.toString() : undefined,
      file: type === "file" ? file : undefined,
    });

    await ChatThread.findByIdAndUpdate(params.id, { lastMessageAt: new Date() });

    return json({ message: { _id: message._id.toString() } });
  } catch (error) {
    return handleRouteError(error);
  }
}


