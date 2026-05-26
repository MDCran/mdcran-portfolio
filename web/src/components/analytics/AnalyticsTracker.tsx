"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const VISITOR_KEY = "mdcran_vid";
const SESSION_KEY = "mdcran_sid";
const RETURNING_KEY = "mdcran_seen";

type QueuedEvent = Record<string, unknown> & { type: string };

declare global {
  interface Window {
    mdcranTrack?: (name: string, meta?: Record<string, unknown>) => void;
  }
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function getOrCreate(storage: Storage, key: string): string {
  let v = storage.getItem(key);
  if (!v) {
    v = uid();
    storage.setItem(key, v);
  }
  return v;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const queue = useRef<QueuedEvent[]>([]);
  const idsRef = useRef<{ visitorId: string; sessionId: string; returning: boolean } | null>(null);
  const stoppedRef = useRef(false);
  const [overlay, setOverlay] = useState<null | "kill" | "block">(null);

  const handleCommands = useRef((cmds: { action: string; path?: string }[]) => {
    if (!Array.isArray(cmds)) return;
    for (const c of cmds) {
      if (c.action === "refresh") { window.location.reload(); return; }
      if (c.action === "redirect" && c.path) { window.location.href = c.path; return; }
      if (c.action === "kill") { stoppedRef.current = true; setOverlay("kill"); return; }
      if (c.action === "block") { stoppedRef.current = true; setOverlay("block"); return; }
    }
  });
  const pageRef = useRef<{ pageviewId: string; path: string; startedAt: number; maxScroll: number } | null>(null);
  // rage-click detection
  const recentClicks = useRef<{ x: number; y: number; t: number }[]>([]);
  const lastMoveRef = useRef(0);
  const lastYRef = useRef(0);
  const dirRef = useRef(0);
  const reversalsRef = useRef<number[]>([]);
  const lastHesitationRef = useRef(0);

  /* Init ids once */
  useEffect(() => {
    // Don't track inside an iframe (e.g. the admin heatmap preview), admin pages, or if opted out.
    if (window.self !== window.top || window.location.pathname.startsWith("/admin")) return;
    if (/(?:^|; )mdcran_cookie_consent=opted_out/.test(document.cookie)) { stoppedRef.current = true; return; }
    try {
      const visitorId = getOrCreate(localStorage, VISITOR_KEY);
      const sessionId = getOrCreate(sessionStorage, SESSION_KEY);
      const returning = localStorage.getItem(RETURNING_KEY) === "1";
      localStorage.setItem(RETURNING_KEY, "1");
      idsRef.current = { visitorId, sessionId, returning };
    } catch {
      idsRef.current = { visitorId: uid(), sessionId: uid(), returning: false };
    }
  }, []);

  const flush = useRef((useBeacon = false) => {
    const ids = idsRef.current;
    if (!ids || stoppedRef.current) return;
    // Always poll for commands even with an empty queue (keeps admin control responsive).
    const body = JSON.stringify({ ...ids, events: queue.current });
    queue.current = [];
    try {
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/analytics/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d?.commands?.length) handleCommands.current(d.commands); })
          .catch(() => {});
      }
    } catch {
      /* ignore */
    }
  });

  const enqueue = useRef((ev: QueuedEvent) => {
    if (stoppedRef.current) return;
    queue.current.push(ev);
    if (queue.current.length >= 25) flush.current(false);
  });

  /* expose named-event API + periodic flush + unload flush + global listeners */
  useEffect(() => {
    if (window.self !== window.top || window.location.pathname.startsWith("/admin")) return;
    if (/(?:^|; )mdcran_cookie_consent=opted_out/.test(document.cookie)) return;
    window.mdcranTrack = (name, meta) => {
      enqueue.current({ type: "event", name, path: window.location.pathname, meta: meta ?? {} });
    };

    const interval = window.setInterval(() => {
      const p = pageRef.current;
      if (p) enqueue.current({ type: "heartbeat", path: p.path });
      flush.current(false); // polls for admin commands even with an empty queue
    }, 7_000);

    const onScroll = () => {
      const p = pageRef.current;
      if (!p) return;
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const pct = total > 0 ? Math.round((y / total) * 100) : 100;
      if (pct > p.maxScroll) p.maxScroll = Math.min(100, pct);

      // Scroll-hesitation: many up/down reversals in a short window without progress.
      const dir = y > lastYRef.current ? 1 : y < lastYRef.current ? -1 : dirRef.current;
      if (dir !== 0 && dirRef.current !== 0 && dir !== dirRef.current) {
        const now2 = Date.now();
        reversalsRef.current = reversalsRef.current.filter((t) => now2 - t < 4500);
        reversalsRef.current.push(now2);
        if (reversalsRef.current.length >= 5 && now2 - lastHesitationRef.current > 45000) {
          lastHesitationRef.current = now2;
          reversalsRef.current = [];
          window.dispatchEvent(new CustomEvent("mdcran:hesitation"));
        }
      }
      dirRef.current = dir;
      lastYRef.current = y;
    };

    const docPct = (clientX: number, pageY: number) => ({
      x: Math.round((clientX / Math.max(window.innerWidth, 1)) * 1000) / 10,
      y: Math.round((pageY / Math.max(document.documentElement.scrollHeight, 1)) * 1000) / 10,
    });

    const onClick = (e: MouseEvent) => {
      const path = window.location.pathname;
      const { x, y } = docPct(e.clientX, e.pageY);

      // rage detection: 3+ clicks within 45px and 900ms
      const now = Date.now();
      recentClicks.current = recentClicks.current.filter((c) => now - c.t < 900);
      recentClicks.current.push({ x: e.clientX, y: e.pageY, t: now });
      const near = recentClicks.current.filter((c) => Math.hypot(c.x - e.clientX, c.y - e.pageY) < 45);
      const isRage = near.length >= 3;
      enqueue.current({ type: "heat", path, points: [{ type: isRage ? "rage" : "click", x, y }] });
      if (isRage) window.dispatchEvent(new CustomEvent("mdcran:rage"));

      // explicit [data-track] elements
      const tagged = (e.target as HTMLElement)?.closest?.("[data-track]") as HTMLElement | null;
      if (tagged?.dataset.track) {
        let meta: Record<string, unknown> = {};
        try { meta = tagged.dataset.trackMeta ? JSON.parse(tagged.dataset.trackMeta) : {}; } catch { /* */ }
        enqueue.current({ type: "event", name: tagged.dataset.track, path, meta });
      }

      // recruiter-intent auto-detection on links
      const anchor = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || anchor.href || "";
      const location = anchor.closest("footer") ? "footer" : anchor.closest("nav,header") ? "header" : "body";
      const fire = (name: string, meta: Record<string, unknown> = {}) =>
        enqueue.current({ type: "event", name, path, meta: { location, href, ...meta } });

      if (/^mailto:/i.test(href)) fire("mailto_click");
      else if (/github\.com/i.test(href)) fire("github_click");
      else if (/linkedin\.com/i.test(href)) fire("linkedin_click");
      else if (/(instagram|twitter|x\.com|youtube|tiktok|twitch\.tv|discord)/i.test(href)) {
        const network = href.match(/(instagram|twitter|x\.com|youtube|tiktok|twitch|discord)/i)?.[1]?.toLowerCase() ?? "social";
        fire("social_click", { network });
      } else if (anchor.hasAttribute("download") || /\.pdf($|\?)/i.test(href)) {
        if (/resume/i.test(href) || window.location.pathname === "/resume") fire("resume_download");
      }
    };

    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMoveRef.current < 350) return; // sample
      lastMoveRef.current = now;
      const { x, y } = docPct(e.clientX, e.pageY);
      enqueue.current({ type: "heat", path: window.location.pathname, points: [{ type: "move", x, y }] });
    };

    const onHide = () => {
      const p = pageRef.current;
      if (p) {
        enqueue.current({ type: "pageend", pageviewId: p.pageviewId, path: p.path, durationMs: Date.now() - p.startedAt, maxScrollPct: p.maxScroll });
      }
      flush.current(true);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick, true);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") onHide(); });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pagehide", onHide);
      delete window.mdcranTrack;
    };
  }, []);

  /* Record a pageview on every route change; close out the previous one */
  useEffect(() => {
    if (!idsRef.current) return;

    // close previous page
    const prev = pageRef.current;
    if (prev) {
      enqueue.current({ type: "pageend", pageviewId: prev.pageviewId, path: prev.path, durationMs: Date.now() - prev.startedAt, maxScrollPct: prev.maxScroll });
    }

    const pageviewId = uid();
    pageRef.current = { pageviewId, path: pathname, startedAt: Date.now(), maxScroll: 0 };
    enqueue.current({ type: "pageview", pageviewId, path: pathname, title: document.title });

    // explicit recruiter-intent pageviews
    if (pathname === "/resume") enqueue.current({ type: "event", name: "resume_view", path: pathname, meta: {} });
    if (pathname === "/contact") enqueue.current({ type: "event", name: "contact_open", path: pathname, meta: {} });

    flush.current(false);
  }, [pathname]);

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-md text-center px-6">
        <div>
          <div className="font-nord text-2xl text-white mb-3">{overlay === "block" ? "Access Restricted" : "Session Ended"}</div>
          <p className="text-sm text-white/50 max-w-sm mx-auto">
            {overlay === "block"
              ? "Your access to this site has been restricted by the administrator."
              : "This session was ended by the administrator."}
          </p>
        </div>
      </div>
    );
  }
  return null;
}
