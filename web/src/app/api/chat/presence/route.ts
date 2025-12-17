import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { ChatPresence } from "@/models/ChatPresence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    const cutoff = new Date(Date.now() - 2 * 60 * 1000); // last 2 minutes
    const online = await ChatPresence.find({ lastSeen: { $gte: cutoff } })
      .select("userId lastSeen")
      .lean();

    return json({
      online: online.map((o) => ({
        userId: o.userId.toString(),
        lastSeen: o.lastSeen,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST() {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    await connectDb();
    await ChatPresence.findOneAndUpdate(
      { userId: auth.session.id },
      { lastSeen: new Date() },
      { upsert: true, new: true },
    );
    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


