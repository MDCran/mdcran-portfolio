import { NextRequest, NextResponse } from "next/server";
import { createHandshake, claimHandshake } from "@/lib/handshake";
import { findIdentityBySerial } from "@/lib/identity";
import { clientIp, apiRateLimit } from "@/lib/api-rate-limit";
import { notifyDeviceLink } from "@/lib/discord";

export const dynamic = "force-dynamic";

type Body =
  | { action?: "create"; serial?: string; name?: string }
  | {
      action?: "claim";
      handshakeId?: string;
      serial?: string;
      gpu?: string;
      screen?: string;
      timezone?: string;
      language?: string;
      userAgent?: string;
    };

/* POST — cross-device handshake bridge (public).
   action "create": desktop mints a QR handshake token.
   action "claim": the phone that scanned the QR links itself to the desktop's identity. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as (Body & { action?: string }) | null;
    const action = body?.action;

    if (action === "create") {
      const serial = typeof body?.serial === "string" ? body.serial : "";
      if (!serial) return NextResponse.json({ error: "Missing serial" }, { status: 400 });

      const allowed = await apiRateLimit("handshake-create:ip", clientIp(req), 30, 60 * 60 * 1000);
      if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

      const sourceSerial = serial.slice(0, 64);
      const idn = await findIdentityBySerial(sourceSerial);
      // Derive the name ONLY from an already-known identity — never from client
      // body input, so a caller can't seed an arbitrary display name onto a serial.
      const hs = await createHandshake({
        sourceSerial,
        sourceIdentityId: idn?.id ?? null,
        sourceName: idn?.name ?? null,
      });
      if (!hs) return NextResponse.json({ error: "Could not create handshake" }, { status: 500 });

      return NextResponse.json({ ok: true, handshakeId: hs.handshakeId, expiresAt: hs.expiresAt });
    }

    if (action === "claim") {
      const b = body as Extract<Body, { action?: "claim" }>;
      const handshakeId = typeof b?.handshakeId === "string" ? b.handshakeId : "";
      const serial = (typeof b?.serial === "string" ? b.serial : "").slice(0, 64);
      if (!handshakeId || !serial) {
        return NextResponse.json({ error: "Missing handshakeId or serial" }, { status: 400 });
      }

      const allowed = await apiRateLimit("handshake-claim:ip", clientIp(req), 40, 60 * 60 * 1000);
      if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

      const ip = clientIp(req);
      const ua = b.userAgent || req.headers.get("user-agent") || "";

      const result = await claimHandshake({
        handshakeId,
        serial,
        ip,
        userAgent: ua,
        gpu: b.gpu,
        screen: b.screen,
        timezone: b.timezone,
        language: b.language,
      });

      if (result.ok) {
        void notifyDeviceLink({
          method: "handshake",
          sourceSerial: result.sourceSerial || "",
          targetSerial: serial,
          identityId: result.identityId ?? null,
          name: result.name ?? null,
        });
      }

      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Handshake failed" }, { status: 500 });
  }
}
