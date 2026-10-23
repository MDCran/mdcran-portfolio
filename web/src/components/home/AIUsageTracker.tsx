"use client";

import type { SiteContentAiUsage } from "@/lib/types";

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function ReportedStat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex min-w-0 max-w-full items-baseline gap-1.5">
      <span className="w-[8ch] shrink-0 text-right font-nord tabular-nums text-white" title={value.toLocaleString("en-US")}>
        <span aria-hidden="true">{formatCompact(value)}</span>
        <span className="sr-only">{value.toLocaleString("en-US")}</span>
      </span>
      <span className="text-white/35">{label}</span>
    </span>
  );
}

/** Minimal usage strip — a quiet signal that AI tools are part of the workflow, not a dashboard. */
export default function AIUsageTracker({ content }: { content?: SiteContentAiUsage }) {
  if (!content) return null;
  const { claude, openai, elevenlabs } = content;
  const totalTokens = content.totalTokens ?? claude.totalTokens + openai.totalTokens;

  return (
    <div className="mt-3 rounded-sm border border-white/6 bg-white/2 px-4 py-2.5 flex items-baseline gap-x-5 gap-y-2.5 flex-wrap font-jb text-[11px] leading-5">
      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/30 shrink-0">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef4242] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ef4242]" />
        </span>
        AI-Assisted Workflow
      </span>
      <div className="flex min-w-0 max-w-full items-baseline gap-x-4 gap-y-1.5 flex-wrap text-white/60">
        <ReportedStat value={totalTokens} label="AI tokens processed · reported" />
        {elevenlabs.charactersUsed > 0 && <ReportedStat value={elevenlabs.charactersUsed} label="ElevenLabs chars" />}
      </div>
      {content.lastUpdated && <time dateTime={content.lastUpdated} className="whitespace-nowrap text-white/40">Updated {content.lastUpdated}</time>}
      {content.accessNoteEnabled && content.accessNote && <span className="text-white/55 border-l border-white/10 pl-3">{content.accessNote}</span>}
    </div>
  );
}
