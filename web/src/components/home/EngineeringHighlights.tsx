import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { engineeringFocus } from "@/lib/engineering";

export default function EngineeringHighlights() {
  return (
    <section aria-labelledby="engineering-title" className="border-y border-white/10 py-14 sm:py-20">
      <div className="content-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[var(--cranberry)]">Engineering portfolio</p>
            <h2 id="engineering-title" className="font-nord text-2xl sm:text-3xl text-white">Software, AI & the systems behind them</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65">Selected projects with public source, architecture notes, and a clear view of what I built.</p>
          </div>
          <Link href="/engineering" className="inline-flex items-center gap-2 text-sm text-[var(--cranberry)] hover:underline underline-offset-4">
            Explore engineering work <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {engineeringFocus.map((focus) => (
            <Link key={focus.id} href={`/engineering#${focus.id}`} className="rounded-sm border border-white/10 bg-white/3 p-6 transition-colors hover:border-[var(--cranberry)]/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cranberry)]">
              <h3 className="text-base font-semibold text-white">{focus.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{focus.description}</p>
              <p className="mt-4 text-xs leading-relaxed text-white/55">{focus.skills.join(" · ")}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs text-[var(--cranberry)]">See project evidence <ArrowRight size={13} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href="/resume" className="text-white/70 hover:text-white hover:underline underline-offset-4">Experience & resume</Link>
          <a href="https://github.com/MDCran" className="inline-flex items-center gap-2 text-white/70 hover:text-white hover:underline underline-offset-4"><Github size={15} aria-hidden="true" />Public repositories</a>
        </div>
      </div>
    </section>
  );
}
