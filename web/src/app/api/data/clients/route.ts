import { NextResponse } from "next/server";
import { getClients } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getClients();
  return NextResponse.json(data);
}
