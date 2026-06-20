import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { isAdminAuthenticated } from "@/lib/auth";
import { getUtmLinks, saveUtmLink, deleteUtmLink } from "@/lib/db";
import type { UtmLink } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const links = await getUtmLinks();
  return Response.json({ links });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.label || !body?.baseUrl || !body?.source || !body?.medium || !body?.campaign || !body?.url) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }
  try {
    new URL(body.baseUrl.toString());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid baseUrl" }), { status: 400 });
  }
  const now = new Date().toISOString();
  const link: UtmLink = {
    id: body.id ?? randomUUID(),
    label: body.label.toString().slice(0, 200),
    baseUrl: body.baseUrl.toString(),
    source: body.source.toString().slice(0, 200),
    medium: body.medium.toString().slice(0, 200),
    campaign: body.campaign.toString().slice(0, 200),
    term: body.term?.toString().slice(0, 200) ?? undefined,
    content: body.content?.toString().slice(0, 200) ?? undefined,
    url: body.url.toString(),
    createdAt: body.createdAt ?? now,
    updatedAt: now,
  };
  await saveUtmLink(link);
  return Response.json({ ok: true, link });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }
  await deleteUtmLink(body.id);
  return Response.json({ ok: true });
}
