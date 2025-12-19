import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Customer } from "@/models/Customer";
import { generateCustomerId } from "@/lib/ids";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await guardPermission("create_edit_customer");
    if ("response" in auth) return auth.response;

    await connectDb();
    const customerId = await generateCustomerId(Customer);
    
    return json({ customerId });
  } catch (error) {
    return handleRouteError(error);
  }
}

