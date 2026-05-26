import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAnalyticsOverview } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getAnalyticsOverview());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
