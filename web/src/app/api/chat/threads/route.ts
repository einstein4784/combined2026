import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { ChatThread } from "@/models/ChatThread";
import { ChatMessage } from "@/models/ChatMessage";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("view_dashboard"); // allow all authenticated roles
    if ("response" in auth) return auth.response;

    await connectDb();
    const threads = await ChatThread.find({
      participants: { $in: [new Types.ObjectId(auth.session.id)] },
    })
      .select("participants title isGroup lastMessageAt")
      .sort({ lastMessageAt: -1 })
      .populate("participants", "username fullName")
      .lean();

    // attach last message preview
    const threadIds = threads.map((t: any) => t._id);
    const lastMessages = await ChatMessage.find({
      threadId: { $in: threadIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const lastByThread = new Map<string, any>();
    lastMessages.forEach((m) => {
      const id = m.threadId?.toString?.() || "";
      if (!id) return;
      if (!lastByThread.has(id)) {
        lastByThread.set(id, m);
      }
    });

    const serialized = threads.map((t: any) => {
      const tId = t._id.toString();
      const last = lastByThread.get(tId);
      const lastMessageAt = last?.createdAt || t.lastMessageAt || null;
      return {
        _id: tId,
        title: t.title,
        isGroup: t.isGroup,
        participants: (t.participants || []).map((p: any) => p._id?.toString?.() || p.toString?.() || p),
        participantUsers: (t.participants || []).map((p: any) => ({
          id: p._id?.toString?.() || "",
          username: p.username,
          fullName: p.fullName,
        })),
        lastMessageText: last?.body || "",
        lastMessageSenderId: last?.senderId ? last.senderId.toString() : undefined,
        lastMessageAt,
      };
    });

    return json({ threads: serialized });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    const { participantIds = [], title, isGroup } = await req.json().catch(() => ({}));
    const ids = Array.isArray(participantIds) ? participantIds.filter(Boolean) : [];
    if (!ids.length) return json({ error: "participantIds required" }, { status: 400 });

    const selfId = auth.session.id;
    const uniqueIds = [...new Set([selfId, ...ids])].map((id) => new Types.ObjectId(id));

    await connectDb();

    if (!isGroup && uniqueIds.length === 2) {
      const existing = await ChatThread.findOne({
        isGroup: false,
        participants: { $all: uniqueIds, $size: 2 },
      }).lean();
      if (existing) return json({ thread: { _id: existing._id.toString() } });
    }

    const thread = await ChatThread.create({
      participants: uniqueIds,
      title: title || undefined,
      isGroup: !!isGroup,
      createdBy: selfId,
      lastMessageAt: new Date(),
    });

    return json({ thread: { _id: thread._id.toString() } });
  } catch (error) {
    return handleRouteError(error);
  }
}


