import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/db";

export async function GET() {
  return NextResponse.json(await getSiteContent());
}
