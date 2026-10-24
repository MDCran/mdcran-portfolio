import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb, getMongoClient } from "@/lib/mongodb";
import {
  projects,
  articles,
  clients,
  experiences,
  skills,
  certifications,
  awards,
  clubs,
} from "@/lib/data";

import type { ClientSession } from "mongodb";
import { readAdminObject } from "@/lib/admin-api-validation";
import { adminError } from "@/lib/admin-content";
import { invalidatePublicContent } from "@/lib/invalidate-public-content";

// Seed a collection from data.ts ONLY if it is currently empty.
// Never overwrites existing data.
async function seedIfEmpty(
  collName: string,
  data: unknown[],
  session: ClientSession
): Promise<{ collection: string; seeded: number; skipped: boolean }> {
  const db = await getDb();
  const coll = db.collection(collName);
  const count = await coll.countDocuments({}, { session });

  if (count > 0) {
    return { collection: collName, seeded: 0, skipped: true };
  }

  if (data.length > 0) {
    await coll.insertMany((data as Record<string, unknown>[]).map(record => ({ ...record })), { session });
  }

  return { collection: collName, seeded: data.length, skipped: false };
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await readAdminObject(req);
    if (body.force === true) return NextResponse.json({ error: "Replacing existing content requires a staged backup restore." }, { status: 409 });
    const session = (await getMongoClient()).startSession();
    try {
      const results = await session.withTransaction(async () => {
        const rows = [];
        for (const [collection, records] of Object.entries({ projects, articles, clients, experiences, skills, certifications, awards, clubs })) {
          rows.push(await seedIfEmpty(collection, records, session));
        }
        return rows;
      });
      invalidatePublicContent();
      return NextResponse.json({ ok: true, results });
    } finally { await session.endSession(); }
  } catch (error) { return adminError(error); }
}
