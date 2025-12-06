import { getSession } from "@/lib/auth";
import { json } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  return json(session);
}


