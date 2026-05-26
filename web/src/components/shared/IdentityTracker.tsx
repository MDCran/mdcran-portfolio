"use client";

import { useEffect } from "react";
import { computeFingerprint } from "@/lib/device-fingerprint";

/* If the page is opened with ?identity=<id>, attach this device to that identity.
   (Lets the admin generate a link for someone's device.) */
export default function IdentityTracker() {
  useEffect(() => {
    let id: string | null = null;
    try { id = new URLSearchParams(window.location.search).get("identity"); } catch { /* */ }
    if (!id) return;
    (async () => {
      try {
        const fp = await computeFingerprint();
        await fetch("/api/identity/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serial: fp.serial, identityId: id, gpu: fp.gpu, screen: fp.screen, timezone: fp.timezone, language: fp.language, userAgent: fp.userAgent }),
        });
      } catch { /* */ }
    })();
  }, []);
  return null;
}
