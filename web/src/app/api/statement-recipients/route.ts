import { NextRequest } from "next/server";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { connectDb } from "@/lib/db";
import { StatementRecipient } from "@/models/StatementRecipient";

export async function GET() {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    await connectDb();
    const rows = await StatementRecipient.find().sort({ email: 1 }).lean();
    return json({ recipients: rows });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { email, name } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return json({ error: "A valid email is required" }, { status: 400 });
    }

    await connectDb();
    const doc = await StatementRecipient.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { email: email.toLowerCase().trim(), name: name || undefined } },
      { upsert: true, new: true },
    );

    return json({ recipient: doc });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await guardPermission("manage_permissions");
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return json({ error: "id is required" }, { status: 400 });

    await connectDb();
    await StatementRecipient.findByIdAndDelete(id);
    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


