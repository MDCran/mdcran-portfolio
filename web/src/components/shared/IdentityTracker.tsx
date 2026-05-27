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
        const res = await fetch("/api/identity/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serial: fp.serial, identityId: id, gpu: fp.gpu, screen: fp.screen, timezone: fp.timezone, language: fp.language, userAgent: fp.userAgent }),
        });
        const data = await res.json().catch(() => null);
        // Tell the accessibility menu to re-resolve so the name shows right away
        // (no refresh needed). Also strip ?identity from the URL so re-shares don't
        // re-bind someone else's device.
        if (data?.name) window.dispatchEvent(new CustomEvent("mdcran:identity-claimed", { detail: data }));
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("identity");
          window.history.replaceState({}, "", url.toString());
        } catch { /* */ }
      } catch { /* */ }
    })();
  }, []);
  return null;
}
