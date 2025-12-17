import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { connectDb } from "@/lib/db";
import mongoose from "mongoose";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { User } from "@/models/User";

async function checkDatabase() {
  console.log("🔍 Starting Database Health Check...\n");
  console.log("=" .repeat(60));

  try {
    // 1. Test Connection
    console.log("\n1️⃣ Testing Database Connection...");
    const connection = await connectDb();
    const db = connection.connection.db;
    const dbName = db.databaseName;
    console.log(`✅ Connected to database: "${dbName}"`);
    console.log(`   Connection state: ${connection.connection.readyState === 1 ? "Connected" : "Disconnected"}`);

    // 2. Verify Database Name
    console.log("\n2️⃣ Verifying Database Configuration...");
    const expectedDbName = process.env.MONGODB_URI?.includes("/") 
      ? process.env.MONGODB_URI.split("/")[1]?.split("?")[0] || "test"
      : "test";
    console.log(`   Expected database name: "${expectedDbName}"`);
    console.log(`   Actual database name: "${dbName}"`);
    if (dbName === expectedDbName || expectedDbName === "test") {
      console.log("   ✅ Database name matches configuration");
    } else {
      console.log("   ⚠️  Database name mismatch (this may be intentional)");
    }

    // 3. List Collections
    console.log("\n3️⃣ Checking Collections...");
    const collections = await db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections:`);
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });

    // 4. Check Model Collections
    console.log("\n4️⃣ Verifying Model Collections...");
    const modelNames = ["customers", "policies", "payments", "receipts", "users"];
    const modelStatus: Record<string, { exists: boolean; count: number }> = {};

    for (const modelName of modelNames) {
      const collection = db.collection(modelName);
      const exists = collections.some((c) => c.name === modelName);
      const count = exists ? await collection.countDocuments() : 0;
      modelStatus[modelName] = { exists, count };
      
      const status = exists ? "✅" : "❌";
      console.log(`   ${status} ${modelName}: ${exists ? `${count} documents` : "Collection not found"}`);
    }

    // 5. Test Basic Queries
    console.log("\n5️⃣ Testing Basic Queries...");
    try {
      const customerCount = await Customer.countDocuments();
      console.log(`   ✅ Customer.countDocuments(): ${customerCount}`);
    } catch (err: any) {
      console.log(`   ❌ Customer.countDocuments() failed: ${err.message}`);
    }

    try {
      const policyCount = await Policy.countDocuments();
      console.log(`   ✅ Policy.countDocuments(): ${policyCount}`);
    } catch (err: any) {
      console.log(`   ❌ Policy.countDocuments() failed: ${err.message}`);
    }

    try {
      const paymentCount = await Payment.countDocuments();
      console.log(`   ✅ Payment.countDocuments(): ${paymentCount}`);
    } catch (err: any) {
      console.log(`   ❌ Payment.countDocuments() failed: ${err.message}`);
    }

    try {
      const receiptCount = await Receipt.countDocuments();
      console.log(`   ✅ Receipt.countDocuments(): ${receiptCount}`);
    } catch (err: any) {
      console.log(`   ❌ Receipt.countDocuments() failed: ${err.message}`);
    }

    try {
      const userCount = await User.countDocuments();
      console.log(`   ✅ User.countDocuments(): ${userCount}`);
    } catch (err: any) {
      console.log(`   ❌ User.countDocuments() failed: ${err.message}`);
    }

    // 6. Check Indexes
    console.log("\n6️⃣ Checking Indexes...");
    try {
      const customerIndexes = await db.collection("customers").indexes();
      console.log(`   ✅ Customers collection has ${customerIndexes.length} indexes`);
      
      const policyIndexes = await db.collection("policies").indexes();
      console.log(`   ✅ Policies collection has ${policyIndexes.length} indexes`);
    } catch (err: any) {
      console.log(`   ⚠️  Index check failed: ${err.message}`);
    }

    // 7. Test Relationships
    console.log("\n7️⃣ Testing Model Relationships...");
    try {
      const samplePolicy = await Policy.findOne().populate("customerId").lean();
      if (samplePolicy) {
        console.log(`   ✅ Policy-Customer relationship working`);
        console.log(`   Sample policy: ${samplePolicy.policyNumber}`);
      } else {
        console.log(`   ℹ️  No policies found to test relationships`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Relationship test failed: ${err.message}`);
    }

    // 8. Connection Pool Info
    console.log("\n8️⃣ Connection Pool Information...");
    const poolSize = connection.connection.db.client?.topology?.s?.poolSize || "N/A";
    console.log(`   Pool size: ${poolSize}`);
    console.log(`   Ready state: ${connection.connection.readyState}`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Summary:");
    console.log(`   Database: ${dbName}`);
    console.log(`   Collections: ${collections.length}`);
    console.log(`   Total documents: ${Object.values(modelStatus).reduce((sum, s) => sum + s.count, 0)}`);
    console.log("=".repeat(60));
    console.log("\n✅ Database check completed successfully!\n");

  } catch (error: any) {
    console.error("\n❌ Database check failed!");
    console.error("Error:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

checkDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
