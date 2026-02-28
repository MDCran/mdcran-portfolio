import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";
import type { Collection } from "mongodb";
import {
  projects,
  articles,
  clients,
  experiences,
  skills,
  certifications,
  awards,
  clubs,
} from "../src/lib/data";

loadEnvConfig(process.cwd());

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB ?? "mdcran";
const force = process.argv.includes("--force");

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI. Set it before running the seed script.");
}

const mongoUri = MONGODB_URI;

type SeedDoc = Record<string, unknown>;

type SeedCollection = {
  name: string;
  docs: SeedDoc[];
  uniqueIndex: Record<string, 1>;
  getFilter: (doc: SeedDoc) => Record<string, unknown>;
};

const collections: SeedCollection[] = [
  { name: "projects", docs: projects as unknown as SeedDoc[], uniqueIndex: { id: 1 }, getFilter: (doc) => ({ id: doc.id }) },
  { name: "articles", docs: articles as unknown as SeedDoc[], uniqueIndex: { id: 1 }, getFilter: (doc) => ({ id: doc.id }) },
  { name: "clients", docs: clients as unknown as SeedDoc[], uniqueIndex: { id: 1 }, getFilter: (doc) => ({ id: doc.id }) },
  { name: "experiences", docs: experiences as unknown as SeedDoc[], uniqueIndex: { id: 1 }, getFilter: (doc) => ({ id: doc.id }) },
  {
    name: "skills",
    docs: skills as unknown as SeedDoc[],
    uniqueIndex: { name: 1, category: 1 },
    getFilter: (doc) => ({ name: doc.name, category: doc.category }),
  },
  {
    name: "certifications",
    docs: certifications as unknown as SeedDoc[],
    uniqueIndex: { id: 1 },
    getFilter: (doc) => ({ id: doc.id }),
  },
  { name: "awards", docs: awards as unknown as SeedDoc[], uniqueIndex: { id: 1 }, getFilter: (doc) => ({ id: doc.id }) },
  { name: "clubs", docs: clubs as unknown as SeedDoc[], uniqueIndex: { id: 1 }, getFilter: (doc) => ({ id: doc.id }) },
];

async function ensureUniqueIndex(collection: Collection<SeedDoc>, entry: SeedCollection) {
  try {
    await collection.createIndex(entry.uniqueIndex, { unique: true });
  } catch (error) {
    console.warn(`[warn] ${entry.name}: could not ensure unique index`, error);
  }
}

async function seedCollection(client: MongoClient, entry: SeedCollection): Promise<void> {
  const collection = client.db(DB_NAME).collection(entry.name);

  if (entry.docs.length === 0) {
    console.log(`[skip] ${entry.name}: no seed documents available`);
    return;
  }

  if (force) {
    await collection.deleteMany({});
    await ensureUniqueIndex(collection, entry);
    await collection.insertMany(entry.docs);
    console.log(`[reset] ${entry.name}: inserted ${entry.docs.length} document(s)`);
    return;
  }

  await ensureUniqueIndex(collection, entry);

  let inserted = 0;
  let existing = 0;

  for (const doc of entry.docs) {
    const result = await collection.updateOne(
      entry.getFilter(doc),
      { $setOnInsert: doc },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
    } else {
      existing += 1;
    }
  }

  console.log(`[seed] ${entry.name}: inserted ${inserted}, kept ${existing} existing`);
}

async function main(): Promise<void> {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    for (const entry of collections) {
      await seedCollection(client, entry);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Seed failed.");
  console.error(error);
  process.exit(1);
});
