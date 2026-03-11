import { NextResponse } from "next/server";
import { getVisitorCountsByCountry, getTotalVisitorCount } from "@/lib/db";

export async function GET() {
  try {
    const [countries, total] = await Promise.all([
      getVisitorCountsByCountry(),
      getTotalVisitorCount(),
    ]);
    return NextResponse.json({ countries, total });
  } catch {
    return NextResponse.json({ countries: [], total: 0 });
  }
}
