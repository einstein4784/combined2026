import { NextRequest } from "next/server";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await guardPermission("view_dashboard");
    if ("response" in auth) return auth.response;

    const { to, subject, html, text } = await req.json().catch(() => ({}));
    if (!to || !subject) {
      return json({ error: "to and subject are required" }, { status: 400 });
    }

    try {
      await sendEmail({
        to,
        subject,
        html: html || text || "Message from CISL System",
        text: text || undefined,
      });
    } catch (err: any) {
      const message = err?.message || "Failed to send email";
      return json({ error: message, detail: err?.response || err?.code || null }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}


