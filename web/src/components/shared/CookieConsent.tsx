"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const CONSENT_COOKIE = "mdcran_cookie_consent";

export function getConsent(): "accepted" | "opted_out" | "dismissed" | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`));
  return (m?.[1] as "accepted" | "opted_out" | "dismissed") ?? null;
}

export function setConsent(value: "accepted" | "opted_out" | "dismissed") {
  try {
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("mdcran:consent", { detail: value }));
  } catch { /* */ }
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    if (!getConsent()) {
      const t = setTimeout(() => setShow(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] w-[min(calc(100vw-2rem),34rem)]">
      <div className="rounded-sm border border-white/12 bg-[#0b0b0b]/95 backdrop-blur-xl px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <p className="text-xs text-white/60 leading-relaxed">
          We use cookies and similar tech for analytics, performance, and to power site features (including the AI chat &amp; voice assistant).
          See our <Link href="/legal" className="text-[#ef4242] underline underline-offset-2">Legal &amp; Privacy</Link> page for details and to opt out anytime.
        </p>
        <div className="flex items-center justify-end gap-4 mt-3">
          <button
            onClick={() => { setConsent("dismissed"); setShow(false); }}
            className="text-[11px] text-white/35 hover:text-white/70 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          <button
            onClick={() => { setConsent("accepted"); setShow(false); }}
            className="px-4 h-8 text-[11px] tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
