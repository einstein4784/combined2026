import mongoose from "mongoose";

const primaryUri = process.env.MONGODB_URI;
const fallbackUri = process.env.MONGODB_URI_LOCAL || "mongodb://127.0.0.1:27017/drezoc";

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

