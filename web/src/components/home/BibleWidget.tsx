"use client";

import React from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import useSWR from "swr";
import type { BibleVerse } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BibleWidget() {
  const { data, isLoading, mutate } = useSWR<BibleVerse>("/api/bible", fetcher, {
    revalidateOnFocus: false,
  });

  const refreshVerse = async () => {
    const res = await fetch("/api/bible", { method: "POST" });
    if (res.ok) {
      const verse = await res.json();
      mutate(verse, false);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl p-4 group hover:border-white/15 transition-all duration-300"
    >
      {/* Gold accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#d4a853] via-[#d4a853]/50 to-transparent" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={12} className="text-[#d4a853]" />
          <span className="text-[10px] tracking-widest uppercase text-white/30">
            Verse of the Day
          </span>
        </div>
        <button
          onClick={refreshVerse}
          className="cursor-pointer p-1 text-white/20 transition-colors hover:text-[#d4a853]"
          aria-label="Refresh verse"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3 bg-white/8 rounded animate-pulse" />
          <div className="h-3 bg-white/8 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-white/8 rounded animate-pulse w-4/6" />
          <div className="h-2 bg-white/5 rounded animate-pulse w-1/3 mt-3" />
        </div>
      ) : data ? (
        <div>
          <p className="text-xs text-white/65 leading-relaxed italic mb-2">
            &ldquo;{data.text}&rdquo;
          </p>
          <div className="text-[11px] text-[#d4a853]">
            — {data.reference}
            {data.translation && (
              <span className="text-white/25 ml-1">({data.translation})</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/25">Could not load verse.</p>
      )}
    </div>
  );
}
