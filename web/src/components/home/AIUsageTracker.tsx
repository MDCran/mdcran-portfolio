"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import type { SiteContentAiUsage } from "@/lib/types";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function AnimatedStat({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1400;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, value);
      setDisplay(current);
      if (current >= value) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref} className="flex items-center gap-1.5 text-[11px] font-jb whitespace-nowrap">
      <span className="font-nord text-white">{formatCompact(display)}</span>
      <span className="text-white/35">{label}</span>
    </span>
  );
}

/** Minimal usage strip — a quiet signal that AI tools are part of the workflow, not a dashboard. */
export default function AIUsageTracker({ content }: { content?: SiteContentAiUsage }) {
  if (!content) return null;
  const { claude, openai, elevenlabs } = content;
  const totalTokens = claude.totalTokens + openai.totalTokens;

  return (
    <div className="mt-3 rounded-sm border border-white/6 bg-white/2 px-4 py-2.5 flex items-center gap-x-5 gap-y-1.5 flex-wrap">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/30 shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef4242] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4242]" />
        </span>
        AI-Assisted Workflow
      </span>
      <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-white/60">
        <AnimatedStat value={totalTokens} label="AI tokens processed" />
        {elevenlabs.charactersUsed > 0 && <AnimatedStat value={elevenlabs.charactersUsed} label="ElevenLabs chars" />}
      </div>
    </div>
  );
}
