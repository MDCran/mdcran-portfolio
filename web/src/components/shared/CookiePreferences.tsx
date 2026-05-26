"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/components/shared/CookieConsent";

export default function CookiePreferences() {
  const [optedOut, setOptedOut] = useState(false);

  useEffect(() => { setOptedOut(getConsent() === "opted_out"); }, []);

  const toggle = (out: boolean) => {
    setConsent(out ? "opted_out" : "accepted");
    setOptedOut(out);
  };

  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-nord text-base text-white mb-1">Your Privacy Choices</h3>
      <p className="text-sm text-white/50 mb-4">
        By using this site you are opted in to analytics &amp; performance cookies. You can opt out at any time —
        we&apos;ll stop recording analytics for your visits on this device.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => toggle(false)}
          className={`px-3 h-9 text-xs rounded-sm border transition-colors ${!optedOut ? "border-[#ef4242]/40 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/15 text-white/50 hover:text-white"}`}
        >
          Opted In
        </button>
        <button
          onClick={() => toggle(true)}
          className={`px-3 h-9 text-xs rounded-sm border transition-colors ${optedOut ? "border-[#ef4242]/40 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/15 text-white/50 hover:text-white"}`}
        >
          Opt Out
        </button>
        <span className="text-xs text-white/35">{optedOut ? "You are opted out." : "You are opted in."}</span>
      </div>
    </div>
  );
}
