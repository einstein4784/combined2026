import mongoose from "mongoose";

// Helper function to extract database name from URI and normalize it
// Always removes database name from URI and uses dbName option to prevent namespace issues
function parseDatabaseUri(uri: string | undefined, defaultDbName: string): { uri: string; dbName: string } | undefined {
  if (!uri) return undefined;
  
  // Pattern: mongodb+srv://user:pass@host.net/DATABASE_NAME?params
  // or: mongodb://user:pass@host.net/DATABASE_NAME?params
  
  // Find the database name in the URI (between last / after @ and ?)
  const atIndex = uri.lastIndexOf("@");
  if (atIndex === -1) {
    // Invalid URI format, return as-is with default dbName
    return { uri, dbName: defaultDbName };
  }
  
  const afterHost = uri.substring(atIndex);
  const slashIndex = afterHost.indexOf("/");
  const queryIndex = afterHost.indexOf("?");
  
  if (slashIndex === -1) {
    // No database name in URI, use default
    return { uri, dbName: defaultDbName };
  }
  
  // Extract database name (between / and ? or end of string)
  const dbNameStart = slashIndex + 1;
  const dbNameEnd = queryIndex !== -1 ? queryIndex : afterHost.length;
  const dbName = afterHost.substring(dbNameStart, dbNameEnd).trim();
  
  // If database name is empty or just whitespace, use default
  const finalDbName = (!dbName || dbName === "") ? defaultDbName : dbName;
  
  // Remove database name from URI to prevent namespace conflicts
  // Calculate absolute positions in the full URI
  const hostEndIndex = atIndex + slashIndex; // Position right before the "/"
  const queryStartIndex = queryIndex !== -1 ? atIndex + queryIndex : uri.length;
  const queryString = queryIndex !== -1 ? uri.substring(queryStartIndex) : "";
  
  // Build clean URI - remove trailing slash before query params if no db name
  let cleanUri: string;
  if (queryIndex !== -1) {
    // Has query params
    if (!dbName || dbName === "") {
      // No database name, remove the slash before the query
      cleanUri = uri.substring(0, hostEndIndex) + queryString;
    } else {
      // Has database name, keep structure but remove db name
      cleanUri = uri.substring(0, hostEndIndex + 1) + queryString;
    }
  } else {
    // No query params
    if (!dbName || dbName === "") {
      // No database name, remove trailing slash
      cleanUri = uri.substring(0, hostEndIndex);
    } else {
      // Has database name, keep structure
      cleanUri = uri.substring(0, hostEndIndex + 1);
    }
  }
  
  return { uri: cleanUri, dbName: finalDbName };
}

// Default database name - change this to match your actual database name
const DB_NAME = "test";
const rawPrimaryUri = process.env.MONGODB_URI;
const primaryConfig = parseDatabaseUri(rawPrimaryUri, DB_NAME);
const fallbackConfig = parseDatabaseUri(
  process.env.MONGODB_URI_LOCAL || `mongodb://127.0.0.1:27017/${DB_NAME}`,
  DB_NAME
);

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

// Optimized connection pool for better performance and resource management
async function tryConnect(uri: string, dbName: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const options: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 20_000,
    waitQueueTimeoutMS: 5_000,
    // Larger pool in production for better concurrency
    maxPoolSize: isProduction ? 25 : 10,
    minPoolSize: isProduction ? 5 : 1,
    // Close idle connections after 60 seconds to free resources
    maxIdleTimeMS: 60_000,
    dbName: dbName, // Always set dbName explicitly to prevent namespace issues
  };
  
  return mongoose.connect(uri, options);
}

export async function connectDb() {
  if (!primaryConfig) {
    throw new Error("MONGODB_URI is not set. Please add it to your environment.");
  }

  if (cached?.conn) return cached.conn;

  if (!cached?.promise) {
    cached!.promise = (async () => {
      try {
        // Enable query logging in development for performance monitoring
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 Connecting with URI (masked):", primaryConfig.uri.replace(/:[^:@]+@/, ":****@"));
          console.log("🔍 Database name:", primaryConfig.dbName);
          
          // Enable mongoose debug mode to log queries
          mongoose.set('debug', (collectionName: string, method: string, query: any) => {
            const queryStr = JSON.stringify(query);
            if (queryStr.length > 200) {
              console.log(`📊 ${collectionName}.${method}`, queryStr.substring(0, 200) + '...');
            } else {
              console.log(`📊 ${collectionName}.${method}`, queryStr);
            }
          });
        }
        const connection = await tryConnect(primaryConfig.uri, primaryConfig.dbName);
        // Verify connection
        if (!connection.connection.db) {
          throw new Error("Database connection failed: db is undefined");
        }
        await connection.connection.db.admin().ping();
        return connection;
      } catch (err: any) {
        // Log error for debugging (only in development)
        if (process.env.NODE_ENV === "development") {
          console.error("Database connection error:", err?.message);
          console.error("Connection URI (masked):", primaryConfig.uri.replace(/:[^:@]+@/, ":****@"));
          console.error("Full URI (for debugging):", primaryConfig.uri);
          console.error("Database name:", primaryConfig.dbName);
        }
        
        // Fallback to local if primary host is unreachable
        if (fallbackConfig && primaryConfig.uri !== fallbackConfig.uri) {
          try {
            return await tryConnect(fallbackConfig.uri, fallbackConfig.dbName);
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

