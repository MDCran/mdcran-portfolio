import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
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

// Seed a collection from data.ts ONLY if it is currently empty.
// Never overwrites existing data.
async function seedIfEmpty(
  collName: string,
  data: unknown[],
  force: boolean
): Promise<{ collection: string; seeded: number; skipped: boolean }> {
  const db = await getDb();
  const coll = db.collection(collName);
  const count = await coll.countDocuments();

  if (count > 0 && !force) {
    return { collection: collName, seeded: 0, skipped: true };
  }

  if (force) {
    await coll.deleteMany({});
  }

  if (data.length > 0) {
    await coll.insertMany(data as Record<string, unknown>[]);
  }

  return { collection: collName, seeded: data.length, skipped: false };
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const force = body.force === true;

  const results = await Promise.all([
    seedIfEmpty("projects", projects, force),
    seedIfEmpty("articles", articles, force),
    seedIfEmpty("clients", clients, force),
    seedIfEmpty("experiences", experiences, force),
    seedIfEmpty("skills", skills, force),
    seedIfEmpty("certifications", certifications, force),
    seedIfEmpty("awards", awards, force),
    seedIfEmpty("clubs", clubs, force),
  ]);

  return NextResponse.json({ ok: true, results });
}
