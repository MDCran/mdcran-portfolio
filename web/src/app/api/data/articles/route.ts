import { NextResponse } from "next/server";
import { getArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getArticles();
  return NextResponse.json(data);
}
