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
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    const onTour = (e: Event) => setTourActive((e as CustomEvent).detail?.active === true);
    window.addEventListener("mdcran:tour-active", onTour);
    return () => window.removeEventListener("mdcran:tour-active", onTour);
  }, []);

  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    if (!getConsent()) {
      const t = setTimeout(() => setShow(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show || tourActive) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[120] w-[min(calc(100vw-2rem),36rem)]">
      <div className="rounded-sm border border-white/12 bg-[#0b0b0b]/95 backdrop-blur-xl px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <p className="text-xs text-white/60 leading-relaxed">
          This site uses cookies for analytics and personalization. See the{" "}
          <Link href="/legal" className="text-[#ef4242] underline underline-offset-2 hover:text-[#ff6060]">
            Privacy Policy
          </Link>
          . &ldquo;Essential Only&rdquo; opts out of optional tracking.
        </p>
        <div className="flex items-center justify-end gap-3 mt-3">
          <button
            onClick={() => { setConsent("opted_out"); setShow(false); }}
            className="px-3 h-8 text-[11px] tracking-wide border border-white/15 text-white/45 rounded-sm hover:text-white/70 hover:border-white/30 transition-colors cursor-pointer"
          >
            Essential Only
          </button>
          <button
            onClick={() => { setConsent("accepted"); setShow(false); }}
            className="px-4 h-8 text-[11px] tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors cursor-pointer"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
