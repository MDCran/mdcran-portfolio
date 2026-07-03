import { NextRequest } from "next/server";
import { claimDevice, addIdentityDenial, getDeniedIdentityIds } from "@/lib/identity";
import { clientIp, apiRateLimit } from "@/lib/api-rate-limit";
import { rejectCandidateForSerial } from "@/lib/cross-device";

export const dynamic = "force-dynamic";

// POST body:
//   action: 'confirm' — user confirmed they ARE identityId (or create new with name)
//   action: 'deny'    — user denied being identityId; name may be provided for a new identity
//   action: 'provide' — user gave their name; create a new identity for this device
//   action: 'reject'  — user denied a probabilistic cross-device link candidate

interface UpdateStateBody {
  action: 'confirm' | 'deny' | 'provide' | 'reject';
  serial: string;
  identityId?: string;   // for confirm/deny
  name?: string;         // for deny (if user provides correct name) or provide
  targetSerial?: string; // for reject — the other device in the suspected pair
  ip?: string;
  browser?: string;
  os?: string;
  device?: string;
  gpu?: string;
  screen?: string;
  timezone?: string;
  language?: string;
  userAgent?: string;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const allowed = await apiRateLimit("identity-update-state:ip", ip, 30, 60 * 60 * 1000);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }

  const body = await req.json().catch(() => null) as UpdateStateBody | null;
  if (!body?.serial || !body?.action) {
    return new Response(JSON.stringify({ error: "Missing serial or action" }), { status: 400 });
  }

  const serial = body.serial.slice(0, 64);
  const deviceInput = {
    serial: serial,
    ip,
    browser: body.browser,
    os: body.os,
    device: body.device,
    gpu: body.gpu,
    screen: body.screen,
    timezone: body.timezone,
    language: body.language,
    userAgent: body.userAgent,
  };

  try {
    if (body.action === 'confirm') {
      if (!body.identityId && !body.name) {
        return new Response(JSON.stringify({ error: "identityId or name required for confirm" }), { status: 400 });
      }
      const identity = await claimDevice({
        serial: serial,
        identityId: body.identityId,
        name: body.name,
        device: deviceInput,
      });
      const deniedIds = await getDeniedIdentityIds(serial);
      return Response.json({ ok: true, action: 'confirmed', identity: identity ? { id: identity.id, name: identity.name } : null, deniedIds });
    }

    if (body.action === 'deny') {
      if (body.identityId) {
        await addIdentityDenial(serial, body.identityId);
      }
      // If user provided their real name, create a new identity for them
      let newIdentity = null;
      if (body.name?.trim()) {
        newIdentity = await claimDevice({
          serial: serial,
          name: body.name.trim(),
          device: deviceInput,
        });
      }
      const deniedIds = await getDeniedIdentityIds(serial);
      return Response.json({ ok: true, action: 'denied', deniedIds, newIdentity: newIdentity ? { id: newIdentity.id, name: newIdentity.name } : null });
    }

    if (body.action === 'provide') {
      if (!body.name?.trim()) {
        return new Response(JSON.stringify({ error: "name required for provide" }), { status: 400 });
      }
      const identity = await claimDevice({
        serial: serial,
        name: body.name.trim(),
        device: deviceInput,
      });
      return Response.json({ ok: true, action: 'provided', identity: identity ? { id: identity.id, name: identity.name } : null });
    }

    if (body.action === 'reject') {
      // User denied a suspected cross-device pairing — mark the candidate(s) REJECTED.
      const otherSerial = typeof body.targetSerial === "string" ? body.targetSerial.slice(0, 64) : undefined;
      const rejected = await rejectCandidateForSerial(serial, otherSerial);
      return Response.json({ ok: true, action: 'rejected', rejected });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
  } catch (err) {
    console.error("[identity/update-state]", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
}
