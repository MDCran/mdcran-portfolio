import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB ?? "mdcran";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!MONGODB_URI) throw new Error("Add MONGODB_URI to .env.local");

// maxIdleTimeMS: recycle idle connections before Atlas force-closes them (ECONNRESET).
// heartbeatFrequencyMS: detect server recovery fast after a transient outage.
// serverSelectionTimeoutMS: generous window so a brief blip doesn't immediately fail.
const MONGO_OPTIONS = {
  maxIdleTimeMS: 25_000,
  serverSelectionTimeoutMS: 15_000,
  heartbeatFrequencyMS: 2_000,
  retryReads: true,
  retryWrites: true,
  maxPoolSize: 5,
  minPoolSize: 0,
};

function createClientPromise(): Promise<MongoClient> {
  return new MongoClient(MONGODB_URI, MONGO_OPTIONS).connect();
}

let clientPromise: Promise<MongoClient>;
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

/** Replace the shared client with a fresh one. Call after topology errors so
 *  the next getDb() starts clean rather than re-using a broken connection. */
export function resetMongoClient(): void {
  clientPromise = createClientPromise();
  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise = clientPromise;
  }
}

export default clientPromise;
