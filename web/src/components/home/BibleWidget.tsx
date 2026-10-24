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
      data-highlight-id="verse-of-the-day"
      className="relative flex h-full min-h-56 flex-col overflow-hidden rounded-sm border border-white/8 bg-white/3 p-5 backdrop-blur-xl group hover:border-white/15 transition-all duration-300"
    >
      {/* Gold accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#d4a853] via-[#d4a853]/50 to-transparent" />

      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[#d4a853]" />
          <span className="text-[11px] font-medium tracking-wider uppercase text-white/45">
            Verse of the Day
          </span>
        </div>
        <button
          onClick={refreshVerse}
          className="cursor-pointer p-1 text-white/20 transition-colors hover:text-[#d4a853]"
          aria-label="Refresh verse"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 flex-col gap-3">
          <div className="h-5 bg-white/8 rounded animate-pulse" />
          <div className="h-5 bg-white/8 rounded animate-pulse w-5/6" />
          <div className="h-5 bg-white/8 rounded animate-pulse w-4/6" />
          <div className="mt-auto h-3 w-1/2 self-end rounded bg-white/5 animate-pulse" />
        </div>
      ) : data ? (
        <figure className="flex flex-1 flex-col gap-5">
          <blockquote className="text-base font-medium leading-[1.65] text-white/85 italic sm:text-[17px]">
            &ldquo;{data.text}&rdquo;
          </blockquote>
          <figcaption className="mt-auto self-end text-right text-xs leading-relaxed text-[#d4a853]">
            — {data.reference}
            {data.translation && (
              <span className="text-white/45 ml-1">({data.translation})</span>
            )}
          </figcaption>
        </figure>
      ) : (
        <p className="flex-1 text-sm text-white/45">Could not load verse.</p>
      )}
    </div>
  );
}
