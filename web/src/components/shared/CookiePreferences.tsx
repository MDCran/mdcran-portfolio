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
    <div className="rounded-sm border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div>
        <h3 className="font-nord text-base text-white mb-1">Your Privacy Choices</h3>
        <p className="text-sm text-white/50 leading-relaxed">
          By using this site you agree to our Terms of Service and essential site cookies regardless of the choice
          below. Essential cookies (consent preference, session management, security) are required for the site to
          function and cannot be disabled.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => toggle(false)}
            className={`px-3 h-9 text-xs rounded-sm border transition-colors ${!optedOut ? "border-[#ef4242]/40 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/15 text-white/50 hover:text-white"}`}
          >
            Accept All
          </button>
          <button
            onClick={() => toggle(true)}
            className={`px-3 h-9 text-xs rounded-sm border transition-colors ${optedOut ? "border-[#ef4242]/40 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/15 text-white/50 hover:text-white"}`}
          >
            Essential Only
          </button>
        </div>

        {optedOut ? (
          <p className="text-xs text-white/35 leading-relaxed">
            <span className="text-[#ef4242]">Essential Only</span> — optional analytics, heatmaps, and device
            personalisation are disabled for this device. Essential cookies and server-side logging (IP, rate-limiting,
            security) still occur as described in the Privacy Policy.
          </p>
        ) : (
          <p className="text-xs text-white/35 leading-relaxed">
            <span className="text-[#ef4242]">Accept All</span> — analytics, scroll/click heatmaps, page-view tracking,
            and optional device personalisation are active. You can change this at any time.
          </p>
        )}
      </div>
    </div>
  );
}
