import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { findIdentityById } from "@/lib/identity";
import { getDeviceGraph } from "@/lib/cross-device";
import { getConversationsForIdentity } from "@/lib/ai-conversations";
import { getContactMessagesForIdentity, getRizzSubmissionsForIdentity, getChatRateLimitsForIps } from "@/lib/db";
import { getBookingsForIdentity } from "@/lib/booking";
import { getSessionsForIdentity } from "@/lib/analytics";
import { getRateLimitRecordsForIps } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/* GET — the unified per-identity hub: everything tied to this human across the
   whole system (devices, cross-device candidates, AI text+voice conversations,
   contact messages, bookings, rizz submissions, sessions+traffic, rate-limit hits). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const identity = await findIdentityById(id);
  if (!identity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const serials = identity.devices.map((d) => d.serial).filter(Boolean);
  const ips = Array.from(new Set(identity.devices.map((d) => d.ip).filter((x): x is string => !!x && x !== "unknown")));

  const [graph, convo, contactMessages, bookings, rizz, sessions, chatLimits, formLimits] = await Promise.all([
    getDeviceGraph(serials),
    getConversationsForIdentity(id, serials),
    getContactMessagesForIdentity(id, serials).catch(() => []),
    getBookingsForIdentity(id, serials).catch(() => []),
    getRizzSubmissionsForIdentity(id, serials).catch(() => []),
    getSessionsForIdentity(serials, ips).catch(() => []),
    getChatRateLimitsForIps(ips).catch(() => []),
    getRateLimitRecordsForIps(ips).catch(() => []),
  ]);

  return NextResponse.json({
    identity,
    registry: graph.devices,
    candidates: graph.candidates,
    conversations: convo.conversations,
    messages: convo.messages,
    contactMessages,
    bookings,
    rizz,
    sessions,
    rateLimits: { chat: chatLimits, forms: formLimits },
  });
}
