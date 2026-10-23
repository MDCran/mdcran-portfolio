"use client";
import { Children, useMemo, useState, type ReactNode } from "react";
import { useWorkQuery } from "@/lib/use-work-query";
import {
  matchesArea,
  matchJobDescription,
  projectAreas,
} from "@/lib/portfolio-evidence";
export default function EngineeringExplorer({
  entries,
  children,
}: {
  entries: { slug: string; text: string }[];
  children: ReactNode;
}) {
  const { params, update } = useWorkQuery();
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
      matchesArea(e.text, area) &&
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
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        {cards.filter((_, i) => visible[i])}
      </div>
      {!visible.some(Boolean) && (
        <p className="py-8 text-white/60">
          No matching projects.{" "}
          <button
            className="underline"
            onClick={() => {
              update({ q: "", area: "" });
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
