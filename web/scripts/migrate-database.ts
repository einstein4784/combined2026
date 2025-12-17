import mongoose from "mongoose";

// Database connection strings with database name
const DB_NAME = "CISLDB";
const OLD_DB_URI = "mongodb+srv://Vercel-Admin-combined:EBcnh1jKwGiuDGtR@combined.fovp4y8.mongodb.net/CISLDB?retryWrites=true&w=majority";
const NEW_DB_URI = "mongodb+srv://Vercel-Admin-CISL2026NEW:cYRhWcHcNispLKYp@cisl2026new.izson30.mongodb.net/CISLDB?retryWrites=true&w=majority";

// Collection names in order (respecting dependencies)
const COLLECTIONS = [
  "users",
  "rolepermissions",
  "customers",
  "coveragetypes",
  "financialperiods",
  "statementrecipients",
  "policies",
  "payments",
  "receipts",
  "auditlogs",
  "chatthreads",
  "chatmessages",
  "chatpresences",
  "deleterequests",
];

async function migrateDatabase() {
  console.log("🚀 Starting database migration...\n");

  let oldConnection: mongoose.Connection | null = null;
  let newConnection: mongoose.Connection | null = null;

  try {
    // Connect to old database
    console.log("📡 Connecting to OLD database...");
    oldConnection = mongoose.createConnection(OLD_DB_URI);
    await oldConnection.asPromise();
    console.log("✅ Connected to OLD database\n");

    // Connect to new database
    console.log("📡 Connecting to NEW database...");
    newConnection = mongoose.createConnection(NEW_DB_URI);
    await newConnection.asPromise();
    console.log("✅ Connected to NEW database\n");

    // Get database instances
    const oldDb = oldConnection.db;
    const newDb = newConnection.db;
    
    if (!oldDb || !newDb) {
      throw new Error("Failed to get database instances from connections");
    }
    
    console.log(`📊 Old database: ${oldDb.databaseName}`);
    console.log(`📊 New database: ${newDb.databaseName}\n`);

    let totalDocuments = 0;
    let totalMigrated = 0;

    // Get list of collections from old database
    const existingCollections = await oldDb.listCollections().toArray();
    const collectionNames = existingCollections.map((c) => c.name);

    console.log(`📋 Found ${collectionNames.length} collections in old database\n`);

    // Migrate each collection
    for (const collectionName of COLLECTIONS) {
      // Check if collection exists (case-insensitive)
      const actualCollectionName = collectionNames.find(
        (name) => name.toLowerCase() === collectionName.toLowerCase()
      );

      if (!actualCollectionName) {
        console.log(`⏭️  Skipping ${collectionName} (not found in old database)`);
        continue;
      }

      try {
        const oldCollection = oldDb.collection(actualCollectionName);
        const newCollection = newDb.collection(collectionName);

        // Count documents
        const count = await oldCollection.countDocuments();
        totalDocuments += count;

        if (count === 0) {
          console.log(`📦 ${collectionName}: 0 documents (skipping)`);
          continue;
        }

        console.log(`📦 Migrating ${collectionName}... (${count} documents)`);

        // Get all documents
        const documents = await oldCollection.find({}).toArray();

        if (documents.length === 0) {
          console.log(`   ✅ ${collectionName}: No documents to migrate\n`);
          continue;
        }

        // Insert documents into new database
        // Use insertMany with ordered: false to continue on errors
        let inserted = 0;
        let errors = 0;

        // Process in batches to avoid memory issues
        const batchSize = 1000;
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          try {
            // Remove _id temporarily if it causes conflicts, then restore it
            const batchWithIds = batch.map((doc) => {
              const { _id, ...rest } = doc;
              return { _id, ...rest };
            });

            await newCollection.insertMany(batchWithIds, { ordered: false });
            inserted += batch.length;
          } catch (err: any) {
            // Handle duplicate key errors
            if (err.code === 11000 || err.writeErrors) {
              // Try inserting one by one
              for (const doc of batch) {
                try {
                  await newCollection.insertOne(doc);
                  inserted++;
                } catch (e: any) {
                  if (e.code !== 11000) {
                    // Not a duplicate error
                    errors++;
                    console.log(`   ⚠️  Error inserting document: ${e.message}`);
                  } else {
                    // Duplicate - skip
                    inserted++;
                  }
                }
              }
            } else {
              errors += batch.length;
              console.log(`   ⚠️  Batch error: ${err.message}`);
            }
          }
        }

        totalMigrated += inserted;
        console.log(`   ✅ ${collectionName}: ${inserted} documents migrated${errors > 0 ? ` (${errors} errors)` : ""}\n`);
      } catch (error: any) {
        console.error(`   ❌ Error migrating ${collectionName}: ${error.message}\n`);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✨ Migration completed!`);
    console.log(`   Total documents: ${totalDocuments}`);
    console.log(`   Successfully migrated: ${totalMigrated}`);
    console.log("=".repeat(50) + "\n");

    // Verify migration
    console.log("🔍 Verifying migration...\n");
    for (const collectionName of COLLECTIONS) {
      const actualCollectionName = collectionNames.find(
        (name) => name.toLowerCase() === collectionName.toLowerCase()
      );
      if (actualCollectionName) {
        const oldCount = await oldDb.collection(actualCollectionName).countDocuments();
        const newCount = await newDb.collection(collectionName).countDocuments();
        const status = oldCount === newCount ? "✅" : "⚠️";
        console.log(`   ${status} ${collectionName}: ${oldCount} → ${newCount}`);
      }
    }
    console.log("");

  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Close connections
    if (oldConnection) {
      await oldConnection.close();
      console.log("🔌 Closed connection to OLD database");
    }
    if (newConnection) {
      await newConnection.close();
      console.log("🔌 Closed connection to NEW database");
    }
  }
}

// Run migration
migrateDatabase()
  .then(() => {
    console.log("✅ Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });

