import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import type { NextRequest } from "next/server";

type RouteContext =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

const resolveParams = async (context: RouteContext): Promise<{ id: string }> =>
  Promise.resolve(context.params);

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const params = await resolveParams(context);
    const auth = await guardPermission("receive_payment");
    if ("response" in auth) return auth.response;

    return json(
      { error: "Deletion now requires manager approval. Submit a delete request." },
      { status: 403 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}


