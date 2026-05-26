"use client";

import React, { useState } from "react";
import { Tag as TagIcon } from "lucide-react";
import type { ImageTag } from "@/lib/types";

/** Wraps an image and overlays positioned tags (people/links). Tags hidden by default; toggle top-right. */
export default function TaggableImage({ tags, children }: { tags?: ImageTag[]; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  if (!tags || tags.length === 0) return <>{children}</>;

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow((s) => !s); }}
        className={`absolute top-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-sm border backdrop-blur-sm transition-colors ${show ? "border-[#ef4242]/60 bg-[#ef4242]/20 text-[#ef4242]" : "border-white/15 bg-black/40 text-white/70 hover:text-white"}`}
        title={show ? "Hide tags" : `Show ${tags.length} tag${tags.length === 1 ? "" : "s"}`}
        aria-label="Toggle image tags"
      >
        <TagIcon size={13} />
      </button>
      {show && tags.map((t) => {
        const inner = (
          <span className="inline-flex items-center rounded-full bg-black/80 border border-white/25 px-2 py-0.5 text-[11px] text-white whitespace-nowrap shadow-lg backdrop-blur-sm">
            {t.label}
          </span>
        );
        return (
          <div
            key={t.id}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <span className="h-3 w-3 rounded-full bg-white/90 border-2 border-[#ef4242] shadow-[0_0_8px_rgba(239,66,66,0.7)]" />
            {t.link ? (
              <a href={t.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:opacity-80">{inner}</a>
            ) : inner}
          </div>
        );
      })}
    </div>
  );
}
