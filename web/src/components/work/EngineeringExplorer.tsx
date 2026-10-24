"use client";

import { Children, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useWorkQuery } from "@/lib/use-work-query";
import { matchesRole, normalizeRole } from "@/lib/public-portfolio";
import EngineeringRoleFilter from "./EngineeringRoleFilter";
import { matchesArea, matchJobDescription, projectAreas } from "@/lib/portfolio-evidence";

const areaLabels: Record<string, string> = { all: "All projects", ai: "AI", "full-stack": "Full-stack", cloud: "Cloud", mobile: "Mobile" };

export default function EngineeringExplorer({ entries, children }: {
  entries: { slug: string; text: string; title?: string }[];
  children: ReactNode;
}) {
  const { params, update } = useWorkQuery();
  const role = normalizeRole(params?.get("role"));
  const query = params?.get("q") ?? "";
  const requestedArea = params?.get("area") ?? "all";
  const area = projectAreas.includes(requestedArea as (typeof projectAreas)[number]) ? requestedArea : "all";
  const [job, setJob] = useState("");
  const visible = entries.map((entry) => matchesRole(entry.slug, role) && matchesArea(entry.text, area) && entry.text.toLowerCase().includes(query.toLowerCase().trim()));
  const cards = Children.toArray(children);
  const matches = useMemo(() => matchJobDescription(job, entries.map((entry) => entry.slug)), [job, entries]);

  useEffect(() => {
    const revealProject = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id === "role-match") {
        const matcher = document.getElementById(id);
        if (matcher instanceof HTMLDetailsElement) matcher.open = true;
        return;
      }
      if (!id.startsWith("project-")) return;
      const card = document.getElementById(id);
      card?.scrollIntoView({ block: "start" });
    };
    revealProject();
    window.addEventListener("hashchange", revealProject);
    return () => window.removeEventListener("hashchange", revealProject);
  }, []);

  return (
    <>
      <section aria-label="Project filters" className="border-b border-white/6 bg-white/2 py-5 print:hidden">
        <div className="content-container flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-full flex-wrap gap-1 rounded-sm border border-white/8 bg-white/3 p-1" aria-label="Project area">
            {projectAreas.map((value) => (
              <button key={value} aria-pressed={area === value} onClick={() => update({ area: value === "all" ? "" : value })} className={`rounded-sm px-3 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${area === value ? "bg-[var(--cranberry)] text-white" : "text-white/45 hover:bg-white/5 hover:text-white"}`}>{areaLabels[value]}</button>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <EngineeringRoleFilter value={role} onChange={(value) => update({ role: value === "all" ? "" : value })} />
            <label className="relative min-w-40 flex-1 sm:w-60">
              <span className="sr-only">Search projects and technologies</span>
              <Search size={13} className="pointer-events-none absolute left-3 top-3.5 text-white/30" aria-hidden="true" />
              <input value={query} onChange={(event) => update({ q: event.target.value })} placeholder="Search projects…" className="h-10 w-full rounded-sm border border-white/10 bg-white/4 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--cranberry)]" />
            </label>
          </div>
        </div>
      </section>
      <section className="content-container py-10 sm:py-12" aria-label="Engineering projects">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-white/40" role="status">{visible.filter(Boolean).length} {visible.filter(Boolean).length === 1 ? "project" : "projects"}</p>
          {(query || area !== "all" || role !== "all") && <button onClick={() => update({ q: "", area: "", role: "" })} className="text-[11px] text-white/50 underline underline-offset-4 hover:text-white">Clear filters</button>}
        </div>
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => visible[index] ? <div className="h-full min-w-0" key={entries[index].slug}>{card}</div> : null)}
        </div>
        {!visible.some(Boolean) && <div className="py-20 text-center"><p className="text-sm text-white/40">No matching projects.</p><button className="mt-4 text-xs text-[var(--cranberry)] underline underline-offset-4" onClick={() => update({ q: "", area: "", role: "" })}>Clear filters</button></div>}
        <details id="role-match" className="mt-12 rounded-sm border border-white/8 bg-white/2 p-5 sm:p-6">
          <summary className="cursor-pointer text-sm text-white/75">Match a role to project experience</summary>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/45">Paste a job description to find relevant technologies and project notes. Your text stays in this browser.</p>
          <label className="mt-4 block text-xs text-white/65">Job description<textarea value={job} maxLength={20000} onChange={(event) => setJob(event.target.value)} className="mt-2 min-h-32 w-full rounded-sm border border-white/10 bg-white/3 p-3 text-sm text-white outline-none focus:border-[var(--cranberry)]" /></label>
          {job && <div className="mt-4 space-y-3" aria-live="polite">{matches.length ? matches.map((match) => <div key={match.skill} className="flex flex-wrap items-center gap-3 text-xs"><strong className="text-white/80">{match.skill}</strong>{match.evidence.map((evidence) => <a key={evidence.slug} href={evidence.href} className="inline-flex items-center gap-1 text-[var(--cranberry)] hover:underline">{entries.find((entry) => entry.slug === evidence.slug)?.title ?? evidence.slug.replaceAll("-", " ")}<ArrowRight size={12} aria-hidden="true" /></a>)}</div>) : <p className="text-xs text-white/50">No explicit technology matches found.</p>}</div>}
        </details>
      </section>
    </>
  );
}
