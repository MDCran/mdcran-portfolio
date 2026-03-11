import { NextResponse } from "next/server";
import { computeServiceHealth, getActiveIncidents, getStatusIncidents } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [services, activeIncidents, allIncidents] = await Promise.all([
      computeServiceHealth(),
      getActiveIncidents(),
      getStatusIncidents(),
    ]);
    // Return the 20 most recent resolved incidents as history
    const history = allIncidents
      .filter((i) => i.status === "resolved")
      .slice(0, 20);
    return NextResponse.json({ services, activeIncidents, history });
  } catch (err) {
    console.error("Status API error:", err);
    return NextResponse.json({ services: [], activeIncidents: [], history: [] });
  }
}
