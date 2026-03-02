import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? "mdcran";
const CDN_BASE_URL = (process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "https://cdn.mdcran.com").replace(/\/+$/, "");

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI. Set it before running the migration.");
}

function normalizeAssetUrl(value: string): string {
  if (value.startsWith("/cdn/")) {
    return `${CDN_BASE_URL}/${value.slice(5)}`;
  }

  if (value.startsWith("cdn/")) {
    return `${CDN_BASE_URL}/${value.slice(4)}`;
  }

  return value.replace(/^https?:\/\/[^/]+\/cdn\//i, `${CDN_BASE_URL}/`);
}

function rewriteNode<T>(value: T): [T, boolean] {
  if (typeof value === "string") {
    const next = normalizeAssetUrl(value);
    return [next as T, next !== value];
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const [rewritten, didChange] = rewriteNode(entry);
      changed ||= didChange;
      return rewritten;
    });
    return [next as T, changed];
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    let changed = false;
    const next = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        const [rewritten, didChange] = rewriteNode(entry);
        changed ||= didChange;
        return [key, rewritten];
      })
    );
    return [next as T, changed];
  }

  return [value, false];
}

async function main() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();

    let updatedCount = 0;

    for (const { name } of collections) {
      const collection = db.collection(name);
      const docs = await collection.find({}).toArray();

      for (const doc of docs) {
        const { _id, ...rest } = doc as Record<string, unknown> & { _id: unknown };
        const [rewritten, changed] = rewriteNode(rest);
        if (!changed) continue;

        await collection.replaceOne({ _id }, rewritten);
        updatedCount += 1;
      }
    }

    console.log(`[done] Updated ${updatedCount} document(s) with the new CDN base URL.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("CDN URL migration failed.");
  console.error(error);
  process.exit(1);
});
