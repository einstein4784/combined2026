import mongoose from "mongoose";

// Helper function to ensure database name is set in URI
function ensureDatabaseName(uri: string | undefined, defaultDbName: string): string | undefined {
  if (!uri) return undefined;
  
  // Check if URI already has a database name
  // Pattern: mongodb+srv://user:pass@host.net/DATABASE_NAME?params
  // or: mongodb://user:pass@host.net/DATABASE_NAME?params
  
  // Extract the part between the last @ and the ? (or end of string)
  const atIndex = uri.lastIndexOf("@");
  const queryIndex = uri.indexOf("?", atIndex);
  
  if (atIndex === -1) {
    // Invalid URI format, return as-is
    return uri;
  }
  
  // Get the part after @host.net/ and before ?
  const afterHost = queryIndex !== -1 
    ? uri.substring(atIndex, queryIndex)
    : uri.substring(atIndex);
  
  // Check if there's a database name (something after the last /)
  const lastSlash = afterHost.lastIndexOf("/");
  
  if (lastSlash === -1 || lastSlash === afterHost.length - 1) {
    // No database name found, add it
    if (queryIndex !== -1) {
      // Has query params, insert before ?
      return uri.substring(0, queryIndex) + `/${defaultDbName}` + uri.substring(queryIndex);
    } else {
      // No query params, append
      return uri + `/${defaultDbName}`;
    }
  }
  
  // Database name exists, return as-is
  return uri;
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
        const connection = await tryConnect(primaryUri!);
        // Verify connection
        await connection.connection.db.admin().ping();
        return connection;
      } catch (err: any) {
        // Log error for debugging (only in development)
        if (process.env.NODE_ENV === "development") {
          console.error("Database connection error:", err?.message);
          console.error("Connection URI (masked):", primaryUri?.replace(/:[^:@]+@/, ":****@"));
        }
        
        // Fallback to local if primary host is unreachable
        if (primaryUri !== fallbackUri) {
          try {
            return await tryConnect(fallbackUri);
          } catch (fallbackErr: any) {
            // If both fail, throw original error with helpful message
            throw new Error(
              `Failed to connect to database: ${err?.message || "Unknown error"}. ` +
              `Please check your MONGODB_URI environment variable and ensure the database exists.`
            );
          }
        }
        throw err;
      }
    })();
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

