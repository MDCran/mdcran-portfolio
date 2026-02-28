/**
 * One-time database seed script.
 * Run: npm run seed
 *
 * Loads all static data from data.ts into MongoDB.
 * Skips any collection that already has documents — safe to re-run.
 */

import fs from "fs";
import path from "path";
import { MongoClient } from "mongodb";

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// ─── Import seed data ─────────────────────────────────────────────────────────
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

// ─── Seed ─────────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB  = process.env.MONGODB_DB ?? "mdcran";

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not set. Check your .env.local file.");
  process.exit(1);
}

async function seedCollection(db: ReturnType<MongoClient["db"]>, name: string, data: unknown[]) {
  const col = db.collection(name);
  const existing = await col.countDocuments();
  if (existing > 0) {
    console.log(`⏭   ${name}: already has ${existing} documents — skipped`);
    return;
  }
  await col.insertMany(data as any[]);
  console.log(`✅  ${name}: inserted ${data.length} documents`);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  console.log(`\n🌱  Seeding database: ${MONGODB_DB}\n`);

  await seedCollection(db, "projects",       projects);
  await seedCollection(db, "articles",       articles);
  await seedCollection(db, "clients",        clients);
  await seedCollection(db, "experiences",    experiences);
  await seedCollection(db, "skills",         skills);
  await seedCollection(db, "certifications", certifications);
  await seedCollection(db, "awards",         awards);
  await seedCollection(db, "clubs",          clubs);

  console.log("\n✔   Seed complete.\n");
  await client.close();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
