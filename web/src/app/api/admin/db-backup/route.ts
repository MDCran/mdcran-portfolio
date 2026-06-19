import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// Collections included in backup — excludes large ephemeral ones (visitors, translationCache, chatRateLimits)
const BACKUP_COLLECTIONS = [
  "projects",
  "articles",
  "clients",
  "experiences",
  "educations",
  "skills",
  "skillCategories",
  "certifications",
  "awards",
  "clubs",
  "contacts",
  "campaigns",
  "rizz",
  "siteContent",
  "resumeProfile",
  "settings",
  "chatConfig",
  "statusServices",
  "statusIncidents",
  "visitorAdjustments",
];

function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get("mdcran_admin_token")?.value;
  return !!token && token.split(".").length === 3;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const backup: Record<string, unknown[]> = {};

  await Promise.all(
    BACKUP_COLLECTIONS.map(async (col) => {
      try {
        const docs = await db.collection(col).find({}, { projection: { _id: 0 } }).toArray();
        backup[col] = docs;
      } catch {
        backup[col] = [];
      }
    })
  );

  const meta = {
    exportedAt: new Date().toISOString(),
    collections: Object.fromEntries(
      Object.entries(backup).map(([k, v]) => [k, v.length])
    ),
  };

  const payload = JSON.stringify({ __meta: meta, ...backup }, null, 2);
  const filename = `mdcran-db-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Strip meta key, only process known collection names
  const { __meta: _meta, ...rawCollections } = body;
  const db = await getDb();
  const results: Record<string, { restored: number; error?: string }> = {};

  for (const [col, docs] of Object.entries(rawCollections)) {
    if (!BACKUP_COLLECTIONS.includes(col)) {
      results[col] = { restored: 0, error: "unknown collection — skipped" };
      continue;
    }
    if (!Array.isArray(docs)) {
      results[col] = { restored: 0, error: "not an array — skipped" };
      continue;
    }
    try {
      await db.collection(col).deleteMany({});
      if (docs.length > 0) {
        await db.collection(col).insertMany(docs as Record<string, unknown>[]);
      }
      results[col] = { restored: docs.length };
    } catch (err) {
      results[col] = { restored: 0, error: (err as Error).message };
    }
  }

  return NextResponse.json({ success: true, results });
}
