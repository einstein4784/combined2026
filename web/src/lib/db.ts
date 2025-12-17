import mongoose from "mongoose";

// Helper function to ensure database name is set in URI
function ensureDatabaseName(uri: string | undefined, defaultDbName: string): string | undefined {
  if (!uri) return undefined;
  
  // If URI already has a database name, return as-is
  if (uri.includes("/") && !uri.includes("?")) {
    // Has db name but no query params
    return uri;
  }
  if (uri.includes("/") && uri.includes("?")) {
    // Has db name and query params - check if it's just "/?"
    const [base, query] = uri.split("?");
    if (base.endsWith("/") || base.split("/").length === 1) {
      // No database name, add it
      return `${base}${defaultDbName}?${query}`;
    }
    return uri; // Already has db name
  }
  
  // No database name, add it before query params
  if (uri.includes("?")) {
    return uri.replace("?", `/${defaultDbName}?`);
  }
  return `${uri}/${defaultDbName}`;
}

const DB_NAME = "CISLDB";
const rawPrimaryUri = process.env.MONGODB_URI;
const primaryUri = ensureDatabaseName(rawPrimaryUri, DB_NAME);
const fallbackUri = process.env.MONGODB_URI_LOCAL || `mongodb://127.0.0.1:27017/${DB_NAME}`;

declare global {
  var mongooseConn:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const globalWithMongoose = global as typeof global & {
  mongooseConn:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
};

let cached = globalWithMongoose.mongooseConn;

if (!cached) {
  cached = globalWithMongoose.mongooseConn = { conn: null, promise: null };
}

// Prefer a small, responsive pool to reduce connection churn while keeping latency low
async function tryConnect(uri: string) {
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 20_000,
    waitQueueTimeoutMS: 5_000,
    maxPoolSize: 10,
    minPoolSize: 1,
  });
}

export async function connectDb() {
  if (!primaryUri) {
    throw new Error("MONGODB_URI is not set. Please add it to your environment.");
  }

  if (cached?.conn) return cached.conn;

  if (!cached?.promise) {
    cached!.promise = (async () => {
      try {
        return await tryConnect(primaryUri!);
      } catch (err) {
        // Fallback to local if primary host is unreachable
        if (primaryUri !== fallbackUri) {
          return await tryConnect(fallbackUri);
        }
        throw err;
      }
    })();
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

