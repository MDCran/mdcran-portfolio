import Link from "next/link";
import { ArrowUpRight, Workflow, Bot, PanelsTopLeft } from "lucide-react";

const capabilities = [
  { icon: PanelsTopLeft, title: "Websites & business systems", description: "Service websites, customer portals, custom dashboards, and connected business tools in one product experience." },
  { icon: Bot, title: "AI reception & assistants", description: "Phone and web intake, approved answers, enquiry capture, and human escalation built around each business’s workflow." },
  { icon: Workflow, title: "Connected automation", description: "Repeatable workflows across customer records, calendars, email, and supported integrations, with clear review points." },
];

export default function CoreTVClient() {
  return <main className="pt-32 pb-20"><div className="content-container">
    <Link href="/work" className="text-xs text-white/50 hover:text-white">← All work</Link>
    <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] items-start">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--cranberry)]">Founder & Lead Engineer · 2024–Present</p>
        <h1 className="mt-4 font-nord text-4xl sm:text-6xl text-white">CoreTV<span className="text-[var(--cranberry)]">.co</span></h1>
        <p className="mt-6 text-xl text-white/80">CORE Business Technology</p>
        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/55">I build the software behind CORE: a platform bringing websites, AI reception, business automation, and ongoing technology services together. The work connects the public customer experience with the tools and workflows businesses use every day.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="https://coretv.co" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[var(--cranberry)] px-5 text-sm text-white">Explore CoreTV.co <ArrowUpRight size={16} /></a>
          <a href="https://coretv.co/work/core-public-platform" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-sm border border-white/15 px-5 text-sm text-white/75">View platform case study ↗</a>
        </div>
      </div>
      <aside className="rounded-sm border border-white/10 bg-white/[0.02] p-6">
        <h2 className="font-nord text-lg text-white">From enquiry to delivery</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">Services, pricing, estimates, booking, contact, and client access form a connected journey. Responsive interfaces make the next step clear on desktop and mobile.</p>
        <div className="mt-5 flex flex-wrap gap-2">{["Next.js", "TypeScript", "AI integrations", "Business automation"].map(tag => <span key={tag} className="rounded-sm border border-white/10 px-2 py-1 text-xs text-white/60">{tag}</span>)}</div>
      </aside>
    </div>
    <section className="mt-16 grid gap-4 md:grid-cols-3" aria-label="Platform capabilities">
      {capabilities.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-sm border border-white/10 p-6"><Icon className="text-[var(--cranberry)]" size={24} /><h2 className="mt-5 font-nord text-base text-white">{title}</h2><p className="mt-3 text-sm leading-relaxed text-white/55">{description}</p></article>)}
    </section>
    <section className="mt-16 grid gap-6 md:grid-cols-2">
      <div><p className="text-xs uppercase tracking-widest text-[var(--cranberry)]">Engineering approach</p><h2 className="mt-3 font-nord text-2xl text-white">Build around the business</h2><p className="mt-4 text-sm leading-relaxed text-white/55">Start with the workflow, define the scope, design the interface, connect the systems, and review the result. CORE’s delivery stages—Audit, Proposal, Design, Build, Launch, and Growth—keep decisions and ownership visible.</p></div>
      <div className="rounded-sm border border-white/10 p-6"><h2 className="font-nord text-lg text-white">Public engineering work</h2><p className="mt-3 text-sm leading-relaxed text-white/55">Core AI contains reusable TypeScript contracts for input isolation and metered AI authorization. Explore the public package alongside the live business platform.</p><a href="https://github.com/MDCran/core-ai" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center text-sm text-[var(--cranberry)]">Explore Core AI on GitHub ↗</a></div>
    </section>
  </div></main>;
}
