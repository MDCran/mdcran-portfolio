import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getHeatmap, getHeatmapPages } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const path = req.nextUrl.searchParams.get("path");
  try {
    if (!path) {
      return NextResponse.json({ pages: await getHeatmapPages() });
    }
    return NextResponse.json(await getHeatmap(path));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load heatmap" },
      { status: 500 }
    );
  }
}
