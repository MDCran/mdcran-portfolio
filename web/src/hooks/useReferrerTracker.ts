"use client";

import { useState, useEffect, useRef } from "react";
import { parseReferrerContext } from "@/lib/referrer";
import { computeFingerprint, type Fingerprint } from "@/lib/device-fingerprint";
import type { ReferrerContext, SessionIdentityContext } from "@/lib/types";

/** Build the /api/identity/resolve body, sending the full device signal set so
 *  the cross-device registry stays rich (hardware parity, behavioral landing) and
 *  the resolved traffic-source label so an auto-created anonymous identity gets a
 *  readable name (e.g. "Anonymous · LinkedIn · Orlando"). */
function resolveBody(fp: Fingerprint) {
  let sourceLabel: string | undefined;
  try {
    const raw = sessionStorage.getItem("mdcran_referrer_ctx");
    if (raw) sourceLabel = (JSON.parse(raw) as ReferrerContext)?.resolvedSourceLabel || undefined;
  } catch { /* */ }
  return {
    serial: fp.serial,
    gpu: fp.gpu,
    screen: fp.screen,
    timezone: fp.timezone,
    language: fp.language,
    colorScheme: fp.colorScheme,
    userAgent: fp.userAgent,
    currentPath: typeof window !== "undefined" ? window.location.pathname : undefined,
    sourceLabel,
  };
}

/** Map a /api/identity/resolve response into the session identity context. */
function mapIdentityContext(data: {
  state?: string;
  recognized?: boolean;
  identityId?: string;
  name?: string;
  autoNamed?: boolean;
  suggestions?: { id: string; name: string; certainty?: number }[];
  deniedIds?: string[];
  linkCandidate?: SessionIdentityContext["linkCandidate"];
}): SessionIdentityContext {
  return {
    state: (data.state as SessionIdentityContext["state"]) ?? "anonymous",
    suggestedIdentityId: data.suggestions?.[0]?.id,
    suggestedIdentityName: data.suggestions?.[0]?.name,
    suggestedCertainty: data.suggestions?.[0]?.certainty,
    confirmedIdentityId: data.recognized ? data.identityId : undefined,
    confirmedName: data.recognized ? data.name : undefined,
    autoNamed: Boolean(data.autoNamed),
    deniedIdentityIds: data.deniedIds ?? [],
    linkCandidate: data.linkCandidate,
  };
}

const REF_KEY = "mdcran_referrer_ctx";
const IDENTITY_KEY = "mdcran_identity_ctx";
const CAPTURED_KEY = "mdcran_ref_captured";
const SESSION_ID_KEY = "mdcran_session_id";
const VISITOR_ID_KEY = "mdcran_visitor_id";

function getOrCreateId(key: string): string {
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function readFromStorage<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: unknown): void {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* */ }
}

export interface ReferrerTrackerResult {
  referrerContext: ReferrerContext | null;
  identityContext: SessionIdentityContext | null;
  isLoading: boolean;
  refreshIdentity: () => Promise<void>;
}

export function useReferrerTracker(): ReferrerTrackerResult {
  const [referrerContext, setReferrerContext] = useState<ReferrerContext | null>(() => readFromStorage<ReferrerContext>(REF_KEY));
  const [identityContext, setIdentityContext] = useState<SessionIdentityContext | null>(() => readFromStorage<SessionIdentityContext>(IDENTITY_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const ranRef = useRef(false);

  const refreshIdentity = async () => {
    try {
      const fp = await computeFingerprint();
      const res = await fetch("/api/identity/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveBody(fp)),
      });
      if (!res.ok) return;
      const identCtx = mapIdentityContext(await res.json());
      writeToStorage(IDENTITY_KEY, identCtx);
      setIdentityContext(identCtx);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const alreadyCaptured = (() => { try { return !!sessionStorage.getItem(CAPTURED_KEY); } catch { return false; } })();

    if (alreadyCaptured) {
      // Already captured this session — just refresh identity
      refreshIdentity();
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        const refCtx = parseReferrerContext(window.location.search, document.referrer);
        writeToStorage(REF_KEY, refCtx);
        setReferrerContext(refCtx);

        const fp = await computeFingerprint();
        const sessionId = getOrCreateId(SESSION_ID_KEY);
        const visitorId = (() => {
          try {
            const v = localStorage.getItem("mdcran_visitor_id");
            if (v) return v;
            const nv = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
            localStorage.setItem("mdcran_visitor_id", nv);
            return nv;
          } catch { return getOrCreateId(VISITOR_ID_KEY); }
        })();

        // Send to analytics track endpoint — extend session with UTM/referrer
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            visitorId,
            events: [{ type: "heartbeat", path: window.location.pathname }],
            utm: {
              source: refCtx.utmSource || undefined,
              medium: refCtx.utmMedium || undefined,
              campaign: refCtx.utmCampaign || undefined,
              term: refCtx.utmTerm || undefined,
              content: refCtx.utmContent || undefined,
            },
            referrer: {
              raw: refCtx.referrerRaw || undefined,
              domain: refCtx.referrerDomain || undefined,
              resolvedSource: refCtx.resolvedSource,
              resolvedSourceLabel: refCtx.resolvedSourceLabel,
            },
          }),
        }).catch(() => {});

        // Resolve identity (also runs the cross-device scorer server-side)
        const idRes = await fetch("/api/identity/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolveBody(fp)),
        });
        if (idRes.ok) {
          const identCtx = mapIdentityContext(await idRes.json());
          writeToStorage(IDENTITY_KEY, identCtx);
          setIdentityContext(identCtx);
        }

        try { sessionStorage.setItem(CAPTURED_KEY, "1"); } catch { /* */ }
      } catch { /* non-fatal */ } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { referrerContext, identityContext, isLoading, refreshIdentity };
}

/** Update the stored identity context (call after confirm/deny). */
export function updateStoredIdentityContext(patch: Partial<SessionIdentityContext>): void {
  try {
    const current = readFromStorage<SessionIdentityContext>(IDENTITY_KEY) ?? { state: 'anonymous' as const, deniedIdentityIds: [] };
    writeToStorage(IDENTITY_KEY, { ...current, ...patch });
  } catch { /* */ }
}

/** Get the stored referrer context (call in ChatPanel before sending messages). */
export function getStoredReferrerContext(): ReferrerContext | null {
  return readFromStorage<ReferrerContext>(REF_KEY);
}

/** Get the stored identity context (call in ChatPanel before sending messages). */
export function getStoredIdentityContext(): SessionIdentityContext | null {
  return readFromStorage<SessionIdentityContext>(IDENTITY_KEY);
}
