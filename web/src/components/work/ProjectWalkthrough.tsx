"use client";
import { useState } from "react";
import { engineeringProjects } from "@/lib/engineering";
import { flagshipReviews, trackingCsv } from "@/lib/public-portfolio";

export default function ProjectWalkthrough({ slug }: { slug: string }) {
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState("2026-01-08");
  const [to, setTo] = useState("2026-01-12");
  const review = flagshipReviews[slug];
  const project = engineeringProjects[slug];
  if (!review || !project) return null;
  const steps = [
    { title: "Problem", body: review.problem },
    { title: "My contribution", body: project.contribution },
    { title: "Architecture", body: project.decisions.join(" ") },
    { title: "Tradeoffs", body: review.tradeoff },
    { title: "Results & evidence", body: review.result },
    { title: "Next evaluation", body: review.next },
  ];
  const { rows, csv } = trackingCsv(from, to);
  return <details className="mt-6 rounded-sm border border-white/20 p-4">
    <summary className="cursor-pointer font-semibold">Guided case study & hands-on walkthrough</summary>
    <p className="mt-3 text-sm text-white/70">Six review steps grounded in the published implementation. Tradeoffs are architectural interpretation; next evaluations are suggestions.</p>
    <div className="my-4 flex flex-wrap gap-2" aria-label="Case study steps">
      {steps.map((s, i) => <button key={s.title} aria-pressed={step === i} onClick={() => setStep(i)} className={`rounded-sm border px-3 py-2 text-sm ${step === i ? "border-[var(--cranberry)] bg-white/10" : "border-white/20"}`}>{i + 1}. {s.title}</button>)}
    </div>
    <div className="min-h-36" aria-live="polite"><h4 className="font-semibold">{steps[step].title}</h4><p className="mt-2 text-sm leading-relaxed text-white/80">{steps[step].body}</p></div>
    <a className="text-sm underline underline-offset-4 text-[var(--cranberry)]" href={project.evidence}>Open supporting public evidence</a>
    {slug === "health-tracker" && <div className="mt-6 border-t border-white/15 pt-5">
      <h4 className="font-semibold">Try a date-range CSV export</h4>
      <p className="mt-2 text-sm text-white/70">A working browser-only illustration of the documented export workflow, using three fictional sample records. This is not connected to the Health Tracker application or anyone’s health data.</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="text-sm">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-sm border border-white/20 bg-transparent p-2" /></label>
        <label className="text-sm">Through<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-sm border border-white/20 bg-transparent p-2" /></label>
      </div>
      {from && to && from > to ? <p role="alert" className="mt-3 text-sm">Choose an end date on or after the start date.</p> : <>
        <p className="mt-3 text-sm" role="status">{rows.length} sample records in the inclusive date range.</p>
        <pre className="my-3 overflow-x-auto rounded-sm bg-black/20 p-3 text-xs" aria-label="CSV preview">{csv}</pre>
        <a download="sample-health-export.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} className="inline-block rounded-sm border border-white/25 px-4 py-2 text-sm">Download sample CSV</a>
      </>}
    </div>}
    {slug === "webdesign-portfolio" && <p className="mt-4 text-sm text-white/80">Try the live workflow above: choose a role, search a technology, then save two projects to compare. No account is needed; the shortlist stays on this device.</p>}
  </details>;
}
