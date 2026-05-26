"use client";

import { useState } from "react";
import useSWR from "swr";
import { Eye, Info } from "lucide-react";
import type { Project } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : []));

/**
 * Live-feeling YouTube view counter: blinking red dot, an info tooltip, and a
 * ~60s refresh that re-reads the (server-refreshed) project feed. SWR dedupes
 * so every video on the page shares a single poll.
 */
export default function LiveVideoViews({
  youtubeId,
  initial,
  compact = false,
}: {
  youtubeId?: string;
  initial?: number;
  compact?: boolean;
}) {
  const { data } = useSWR<Project[]>("/api/data/projects", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const [showTip, setShowTip] = useState(false);

  let count = initial ?? 0;
  if (data && youtubeId) {
    for (const p of data) {
      const v = p.videos?.find((vid) => vid.youtubeId === youtubeId);
      if (v?.viewCount != null) { count = v.viewCount; break; }
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-white/35 relative">
      <span className="relative flex h-1.5 w-1.5" title="Live">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef4242] opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4242]" />
      </span>
      <Eye size={11} className="shrink-0" />
      <span className="tabular-nums">{count.toLocaleString("en-US")}</span>
      {!compact && (
        <span
          className="relative inline-flex"
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
        >
          <Info size={11} className="text-white/25 hover:text-white/50 cursor-help" />
          {showTip && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 w-48 rounded-sm px-2.5 py-1.5 text-[10px] leading-snug text-white/80 pointer-events-none" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
              Live view count — counted toward the total Project Views statistic on the home page.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
