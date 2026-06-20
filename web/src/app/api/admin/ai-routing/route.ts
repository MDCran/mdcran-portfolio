import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAiRoutingConditions, saveAiRoutingCondition, deleteAiRoutingCondition } from "@/lib/db";
import type { AiRoutingCondition } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const conditions = await getAiRoutingConditions();
  return Response.json({ conditions });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await req.json().catch(() => null);
  // Normalize a multi-value list for the 'is_any_of' operator.
  const triggerValues: string[] | undefined = Array.isArray(body?.triggerValues)
    ? (body.triggerValues as unknown[]).map((s) => String(s).toLowerCase().trim()).filter(Boolean)
    : undefined;
  const hasValue = !!body?.triggerValue || (triggerValues && triggerValues.length > 0);
  if (!body?.triggerField || !hasValue || !body?.suggestionText) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }
  const now = new Date().toISOString();
  const condition: AiRoutingCondition = {
    id: body.id ?? randomUUID(),
    name: (body.name ?? "Unnamed Condition").toString().slice(0, 100),
    triggerField: body.triggerField,
    triggerOperator: body.triggerOperator ?? "equals",
    // Keep triggerValue populated for back-compat (joined list when multi-value).
    triggerValue: (body.triggerValue ?? (triggerValues ?? []).join(", ")).toString().toLowerCase().trim(),
    ...(triggerValues && triggerValues.length ? { triggerValues } : {}),
    guardrailField: body.guardrailField ?? undefined,
    guardrailOperator: body.guardrailOperator ?? undefined,
    guardrailValue: body.guardrailValue?.toString().toLowerCase().trim() ?? undefined,
    suggestionText: body.suggestionText.toString().slice(0, 2000),
    active: body.active !== false,
    createdAt: body.createdAt ?? now,
    updatedAt: now,
  };
  await saveAiRoutingCondition(condition);
  return Response.json({ ok: true, condition });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.id) {
    return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
  }
  await deleteAiRoutingCondition(body.id);
  return Response.json({ ok: true });
}
