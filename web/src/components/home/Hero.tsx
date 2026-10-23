import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ENGINEERING_SUMMARY } from "@/lib/engineering";

export default function Hero({ location }: { location?: string }) {
  return <section className="relative border-b border-white/10 pt-36 pb-12 sm:pt-40 sm:pb-16" aria-labelledby="home-heading">
    <div className="content-container">
      <p className="mb-4 text-sm font-semibold tracking-wide text-[var(--cranberry)]">MDCran · Software & AI engineering</p>
      <h1 id="home-heading" className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-6xl">Michael Cran.<br /><span className="text-white/75">Building software that connects people, data, and AI.</span></h1>
      <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">{ENGINEERING_SUMMARY}</p>
      {location?.trim() && <p className="mt-4 text-sm text-white/70">Based in {location.trim()}</p>}
      <nav aria-label="Start exploring" className="mt-7 flex flex-wrap gap-3">
        <a href="#engineering" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[var(--cranberry)] px-5 py-3 text-sm font-semibold text-black">The 60-second overview <ArrowRight size={16} aria-hidden="true" /></a>
        <Link href="/resume" className="rounded-sm border border-white/25 px-5 py-3 text-sm">Resume</Link>
        <Link href="/contact" className="rounded-sm border border-white/25 px-5 py-3 text-sm">Get in touch</Link>
      </nav>
    </div>
  </section>;
}
