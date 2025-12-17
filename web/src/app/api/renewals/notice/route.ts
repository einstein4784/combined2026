import { connectDb } from "@/lib/db";
import { guardSession } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Policy } from "@/models/Policy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await guardSession();
    if ("response" in auth) return auth.response;

    const body = await request.json().catch(() => ({}));
    const policyId = body?.policyId as string | undefined;
    if (!policyId) {
      return json({ error: "policyId is required" }, { status: 400 });
    }

    await connectDb();
    const policy = await Policy.findById(policyId);
    if (!policy) {
      return json({ error: "Policy not found" }, { status: 404 });
    }

    policy.renewalNoticeSentAt = new Date();
    policy.renewalNoticeSentBy = auth.session.id;
    await policy.save();

    return json({ ok: true, renewalNoticeSentAt: policy.renewalNoticeSentAt });
  } catch (error) {
    return handleRouteError(error);
  }
}



