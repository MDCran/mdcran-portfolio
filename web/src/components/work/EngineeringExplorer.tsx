"use client";
import { Children, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useWorkQuery } from "@/lib/use-work-query";
import { comparisonEvidence, matchesRole, normalizeRole, portfolioRoles, readShortlist, roleDescriptions, roleLabels } from "@/lib/public-portfolio";
import {
  matchesArea,
  matchJobDescription,
  projectAreas,
} from "@/lib/portfolio-evidence";
const shortlistKey = "mdcran-project-shortlist-v1";
function subscribeShortlist(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("mdcran-shortlist", notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener("mdcran-shortlist", notify); };
}
function shortlistSnapshot() { try { return localStorage.getItem(shortlistKey); } catch { return null; } }
const emptyShortlist = () => null;
export default function EngineeringExplorer({
  entries,
  children,
}: {
  entries: { slug: string; text: string; title?: string }[];
  children: ReactNode;
}) {
  const { params, update } = useWorkQuery();
  const role = normalizeRole(params?.get("role"));
  const stored = useSyncExternalStore(subscribeShortlist, shortlistSnapshot, emptyShortlist);
  const selected = readShortlist(stored, entries.map((e) => e.slug));
  const [storageMessage, setStorageMessage] = useState("");
  const save = (slugs: string[]) => {
    try {
      localStorage.setItem(shortlistKey, JSON.stringify(slugs));
      window.dispatchEvent(new Event("mdcran-shortlist"));
      setStorageMessage(slugs.length ? `${slugs.length} projects saved on this device.` : "Shortlist cleared.");
    } catch { setStorageMessage("This browser cannot save a shortlist. Allow local storage to use comparison."); }
  };
  const query = params?.get("q") ?? "";
  const requestedArea = params?.get("area") ?? "all";
  const area = projectAreas.includes(
    requestedArea as (typeof projectAreas)[number],
  )
    ? requestedArea
    : "all";
  const setQuery = (value: string) => update({ q: value });
  const setArea = (value: string) =>
    update({ area: value === "all" ? "" : value });
  const [job, setJob] = useState("");
  const visible = entries.map(
    (e) =>
      matchesRole(e.slug, role) && matchesArea(e.text, area) &&
      e.text.toLowerCase().includes(query.toLowerCase().trim()),
  );
  const cards = Children.toArray(children);
  const matches = useMemo(
    () =>
      matchJobDescription(
        job,
        entries.map((e) => e.slug),
      ),
    [job, entries],
  );
  return (
    <>
      <div className="my-6 space-y-3 print:hidden">
        <fieldset className="rounded-sm border border-white/20 p-4">
          <legend className="px-2 text-sm font-semibold">Choose a role view</legend>
          <div className="flex flex-wrap gap-2">
            {portfolioRoles.map((r) => <button key={r} aria-pressed={r === role} onClick={() => update({ role: r === "all" ? "" : r, area: "", q: "" })} className={`rounded-sm border px-3 py-2 text-sm ${r === role ? "border-[var(--cranberry)] bg-white/10" : "border-white/20"}`}>{roleLabels[r]}</button>)}
          </div>
          <p className="mt-3 text-sm text-white/75">{roleDescriptions[role]} Role views select relevant public work; they do not change project claims.</p>
        </fieldset>
        <label className="block text-sm text-white/70">
          Search projects and technologies
          <input
            className="mt-2 block w-full rounded-sm border border-white/20 bg-white/5 p-3 text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="React, AI agents, Docker…"
          />
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Project area">
          {projectAreas.map((a) => (
            <button
              key={a}
              aria-pressed={area === a}
              onClick={() => setArea(a)}
              className={`rounded-sm border px-3 py-2 text-sm ${area === a ? "border-[var(--cranberry)] text-white" : "border-white/20 text-white/60"}`}
            >
              {a === "all"
                ? "All projects"
                : a === "ai"
                  ? "AI"
                  : a === "full-stack"
                    ? "Full-stack"
                    : a === "cloud"
                      ? "Cloud"
                      : "Mobile"}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50" role="status">
          {visible.filter(Boolean).length} matching projects · filters are saved
          in this page’s URL.
        </p>
      </div>
      <section id="project-shortlist" aria-labelledby="shortlist-heading" className="my-6 scroll-mt-28 rounded-sm border border-white/20 p-5">
        <div className="flex flex-wrap justify-between gap-3"><h3 id="shortlist-heading" className="text-lg font-semibold">Your project shortlist ({selected.length}/4)</h3>{selected.length > 0 && <button onClick={() => save([])} className="text-sm underline print:hidden">Clear shortlist</button>}</div>
        <p className="mt-2 text-sm text-white/75">Save up to four projects below to compare technologies, responsibilities, and published outcomes. Stored on this device without an account.</p>
        <p role="status" className="mt-2 text-sm text-white/75">{storageMessage}</p>
        {selected.length > 0 && <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Project comparison, scroll horizontally on small screens">
          <table className="w-full min-w-[540px] border-collapse text-left text-sm">
            <caption className="sr-only">Saved public project evidence comparison</caption>
            <thead><tr><th scope="col" className="p-3">Evidence</th>{selected.map((slug) => <th scope="col" key={slug} className="min-w-56 p-3"><a href={`/engineering#project-${slug}`} className="underline">{entries.find((e) => e.slug === slug)?.title ?? slug}</a></th>)}</tr></thead>
            <tbody>{(["skills", "responsibility", "outcome"] as const).map((field) => <tr key={field} className="border-t border-white/15"><th scope="row" className="p-3 align-top">{field === "skills" ? "Technologies" : field === "responsibility" ? "Responsibility" : "Published status / outcome"}</th>{selected.map((slug) => { const evidence = comparisonEvidence(slug); const value = evidence?.[field]; return <td key={slug} className="p-3 align-top text-white/80">{Array.isArray(value) ? value.join(" · ") : value ?? "See the linked project notes; no supplemental claim recorded."}</td>; })}</tr>)}</tbody>
          </table>
        </div>}
      </section>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        {cards.map((card, i) => visible[i] ? <div key={entries[i].slug}>
          <button aria-pressed={selected.includes(entries[i].slug)} disabled={!selected.includes(entries[i].slug) && selected.length >= 4} onClick={() => save(selected.includes(entries[i].slug) ? selected.filter((s) => s !== entries[i].slug) : [...selected, entries[i].slug])} className="mb-3 rounded-sm border border-white/25 px-4 py-2 text-sm disabled:opacity-50 print:hidden">{selected.includes(entries[i].slug) ? "Remove from shortlist" : "Save to shortlist"}<span className="sr-only">: {entries[i].title ?? entries[i].slug}</span></button>
          {card}
        </div> : null)}
      </div>
      {!visible.some(Boolean) && (
        <p className="py-8 text-white/60">
          No matching projects.{" "}
          <button
            className="underline"
            onClick={() => {
              update({ q: "", area: "", role: "" });
            }}
          >
            Clear filters
          </button>
        </p>
      )}
      <section
        id="role-match"
        className="mt-12 scroll-mt-28 rounded-sm border border-white/15 p-6"
      >
        <h3 className="text-xl text-white">Match a role to public evidence</h3>
        <p className="mt-2 text-sm text-white/60">
          Find technologies named in a job description and open their project
          evidence. Your pasted text stays in this browser.
        </p>
        <label className="mt-4 block text-sm text-white/80">
          Job description
          <textarea
            className="mt-2 min-h-32 w-full rounded-sm border border-white/20 bg-white/5 p-3 text-white"
            value={job}
            maxLength={20000}
            onChange={(e) => setJob(e.target.value)}
          />
        </label>
        {job && (
          <div className="mt-4 space-y-3" aria-live="polite">
            {matches.length ? (
              matches.map((m) => (
                <p key={m.skill} className="text-sm text-white/80">
                  <strong>{m.skill}</strong> ·{" "}
                  {m.evidence.map((e, i) => (
                    <a
                      key={e.slug}
                      className="mr-3 text-[var(--cranberry)] underline"
                      href={e.href}
                    >
                      {i + 1}. {e.slug.replaceAll("-", " ")}
                    </a>
                  ))}
                </p>
              ))
            ) : (
              <p className="text-sm text-white/70">
                No explicit technology matches found.
              </p>
            )}
            <p className="text-sm text-white/60">
              Needs confirmation: requirements without linked evidence,
              seniority, years per technology, and work authorization.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
