import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import { connectDb } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";

async function main() {
  await connectDb();

  const [cDel, pDel, payDel, rDel] = await Promise.all([
    Customer.deleteMany({}),
    Policy.deleteMany({}),
    Payment.deleteMany({}),
    Receipt.deleteMany({}),
  ]);

  // eslint-disable-next-line no-console
  console.log("Deleted counts:", {
    customers: cDel.deletedCount,
    policies: pDel.deletedCount,
    payments: payDel.deletedCount,
    receipts: rDel.deletedCount,
  });

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

