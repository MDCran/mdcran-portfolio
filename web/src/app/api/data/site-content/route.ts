import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/db";
import { publicSiteContent } from "@/lib/public-site-content";

export async function GET() {
  return NextResponse.json(publicSiteContent(await getSiteContent()));
}
