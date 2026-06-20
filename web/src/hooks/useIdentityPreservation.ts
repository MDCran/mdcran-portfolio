"use client";
/* ─────────────────────────────────────────────────────────────────────────────
   useIdentityPreservation — Token Recycler hook.

   Phase A — Injection: On page load, checks URL for tracking params (?uid=,
   ?identity=, ?name=, ?company=, ?utm_*). If found, resolves the identity
   against the DB (via device fingerprint), stores the token in localStorage +
   cookie, and removes the params from the URL (clean redirect).

   Phase B — Recycler: On subsequent clean-URL visits, reads the stored token
   from localStorage (or falls back to the cookie), syncs it to the DB session,
   and returns the recycled identity so the page can greet the user by name.
   ──────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { computeFingerprint } from "@/lib/device-fingerprint";
import {
  IdentityToken,
  writeIdentityToken,
  readIdentityToken,
  parseIdentityFromUrl,
  TRACKING_PARAM_KEYS,
} from "@/lib/identity-token";

export interface RecycledIdentity extends IdentityToken {
  recycledAt: number;
  /** true when captured from URL this visit; false when recycled from storage */
  isNew: boolean;
}

interface UseIdentityPreservationResult {
  identity: RecycledIdentity | null;
  loading: boolean;
}

export function useIdentityPreservation(): UseIdentityPreservationResult {
  const [identity, setIdentity] = useState<RecycledIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function stripTrackingParams() {
      const clean = new URL(window.location.href);
      TRACKING_PARAM_KEYS.forEach((k) => clean.searchParams.delete(k));
      window.history.replaceState({}, "", clean.pathname + (clean.search || "") + (clean.hash || ""));
    }

    async function run() {
      try {
        // ── Phase A: Injection from URL params ─────────────────────────────
        const urlSignals = parseIdentityFromUrl(window.location.search);

        // ── Deterministic bridge: a phone landed from a desktop's QR handshake ──
        if (urlSignals?.handshakeId) {
          try {
            const fp = await computeFingerprint();
            const res = await fetch("/api/identity/handshake", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "claim",
                handshakeId: urlSignals.handshakeId,
                serial: fp.serial,
                gpu: fp.gpu,
                screen: fp.screen,
                timezone: fp.timezone,
                language: fp.language,
                userAgent: fp.userAgent,
              }),
            });
            const data = await res.json().catch(() => null);
            if (data?.ok && data.identityId) {
              const token: IdentityToken = {
                id: data.identityId,
                name: data.name || "Guest",
                source: urlSignals.source || "handshake",
                company: urlSignals.company,
                campaign: urlSignals.campaign,
                medium: urlSignals.medium,
                capturedAt: Date.now(),
              };
              writeIdentityToken(token);
              stripTrackingParams();
              if (!cancelled) {
                setIdentity({ ...token, recycledAt: Date.now(), isNew: true });
                setLoading(false);
              }
              return;
            }
          } catch { /* non-fatal — fall through to normal handling */ }
        }

        if (urlSignals && (urlSignals.id || urlSignals.name)) {
          const fp = await computeFingerprint();

          // If it looks like an admin identity UUID, resolve it to get the name
          let resolvedName = urlSignals.name || "";
          let resolvedId = urlSignals.id || "";

          if (resolvedId && !urlSignals.name) {
            // Try to resolve the id as a known identity UUID
            try {
              const res = await fetch("/api/identity/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serial: fp.serial }),
              });
              const data = await res.json();
              if (data.recognized && data.name) resolvedName = data.name;
              if (data.recognized && data.identityId) resolvedId = data.identityId;
            } catch { /* non-fatal */ }
          }

          // Claim/attach this device to the identity so the DB records this visit
          try {
            const claimRes = await fetch("/api/identity/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...fp,
                identityId: resolvedId || undefined,
                name: resolvedName || urlSignals.source || "Guest",
              }),
            });
            const claimed = await claimRes.json();
            if (claimed.identityId) resolvedId = claimed.identityId;
            if (claimed.name) resolvedName = claimed.name;
          } catch { /* non-fatal — store token even if claim fails */ }

          const token: IdentityToken = {
            id: resolvedId || fp.serial,
            name: resolvedName || "Guest",
            source: urlSignals.source || "direct",
            company: urlSignals.company,
            campaign: urlSignals.campaign,
            medium: urlSignals.medium,
            capturedAt: Date.now(),
          };

          writeIdentityToken(token);

          // Clean the tracking params from the URL without triggering a reload
          stripTrackingParams();

          if (!cancelled) {
            setIdentity({ ...token, recycledAt: Date.now(), isNew: true });
            setLoading(false);
          }
          return;
        }

        // ── Phase B: Recycler — check storage for a prior token ─────────────
        const stored = readIdentityToken();
        if (stored) {
          // Sync to DB so the backend knows this returning visitor is active
          try {
            const fp = await computeFingerprint();
            await fetch("/api/identity/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: stored, serial: fp.serial }),
            });
          } catch { /* non-fatal — token is still valid client-side */ }

          if (!cancelled) {
            setIdentity({ ...stored, recycledAt: Date.now(), isNew: false });
            setLoading(false);
          }
          return;
        }

        // No tracking params, no stored token → anonymous visitor
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  return { identity, loading };
}
