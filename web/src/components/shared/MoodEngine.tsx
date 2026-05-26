"use client";

import { useEffect, useState } from "react";
import { recordVisit, getDaypart, type Daypart } from "@/lib/visitor-memory";

/* Records one visit per browser session and drives a time-of-day "mood":
   the assistant's ambient glow dims into the evening and night, giving the
   site a calmer presence after hours. Purely cosmetic + memory bookkeeping. */
export default function MoodEngine() {
  const [daypart, setDaypart] = useState<Daypart>("day");

  useEffect(() => {
    // Count one visit per session (not per route change).
    try {
      if (!sessionStorage.getItem("mdcran_visit_recorded")) {
        recordVisit();
        sessionStorage.setItem("mdcran_visit_recorded", "1");
      }
    } catch { /* */ }

    const apply = () => {
      const part = getDaypart();
      setDaypart(part);
      const root = document.documentElement;
      root.dataset.daypart = part;
      // Glow multiplier other components can read if they want to react.
      const glow = part === "night" ? "0.5" : part === "evening" ? "0.72" : "1";
      root.style.setProperty("--mood-glow", glow);
    };
    apply();
    const iv = setInterval(apply, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  if (daypart !== "night" && daypart !== "evening") return null;

  // Subtle warm vignette that deepens at night — never covers the readable center.
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[5] pointer-events-none"
      style={{
        background:
          daypart === "night"
            ? "radial-gradient(ellipse at 50% 38%, transparent 52%, rgba(6,6,14,0.30) 100%)"
            : "radial-gradient(ellipse at 50% 38%, transparent 62%, rgba(18,10,6,0.14) 100%)",
        mixBlendMode: "multiply",
        transition: "background 1.5s ease",
      }}
    />
  );
}
