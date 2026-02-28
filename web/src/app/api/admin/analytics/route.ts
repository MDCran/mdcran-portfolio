import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getArticles, getProjects } from "@/lib/db";
import { getDb } from "@/lib/mongodb";
import type { TapRecord } from "@/lib/types";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const [articles, projects, taps] = await Promise.all([
    getArticles(),
    getProjects(),
    db.collection("taps").find({}, { projection: { _id: 0 } }).toArray() as unknown as Promise<TapRecord[]>,
  ]);

  const labelById = new Map<string, { label: string; type: "article" | "project" }>();

  for (const article of articles) {
    labelById.set(article.id, { label: article.title, type: "article" });
  }

  for (const project of projects) {
    labelById.set(project.id, { label: project.title, type: "project" });
  }

  const tapChart = taps
    .map((record) => {
      const meta = labelById.get(record.id);

      return {
        id: record.id,
        label: meta?.label ?? record.id,
        type: meta?.type ?? "project",
        taps: record.count ?? 0,
      };
    })
    .sort((a, b) => b.taps - a.taps)
    .slice(0, 8);

  return NextResponse.json({
    totalTaps: taps.reduce((sum, record) => sum + (record.count ?? 0), 0),
    taps: tapChart,
  });
}
