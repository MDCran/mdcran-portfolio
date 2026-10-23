"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-client";
import type { ContentHealthReport, PublicLinkCheck } from "@/lib/content-health";

type LiveReport = { checkedAt: string; results: PublicLinkCheck[]; note: string };
const control = "rounded-sm border border-white/20 bg-black/20 px-3 py-2 text-sm disabled:opacity-50";
export default function ContentHealth() {
  const [report, setReport] = useState<ContentHealthReport | null>(null);
  const [live, setLive] = useState<LiveReport | null>(null);
  const [busy, setBusy] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [collection, setCollection] = useState("all");
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    adminRequest<ContentHealthReport>("/api/admin/content-health").then((data) => { if (active) setReport(data); }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Could not load content checks."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  async function refresh() {
    setBusy(true); setError("");
    try { setReport(await adminRequest<ContentHealthReport>("/api/admin/content-health")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not refresh content checks."); }
    finally { setBusy(false); }
  }
  async function checkLinks() {
    setChecking(true); setError("");
    try { setLive(await adminRequest<LiveReport>("/api/admin/content-health", { method: "POST" })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not check public links."); }
    finally { setChecking(false); }
  }
  const filtered = report?.issues.filter((issue) => (severity === "all" || issue.severity === severity) && (category === "all" || issue.category === category) && (collection === "all" || issue.collection === collection) && `${issue.title} ${issue.field} ${issue.message}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  return <section className="space-y-5">
    <div><h2 className="text-xl font-semibold">Content health</h2><p className="mt-2 max-w-3xl text-sm text-white/70">Review missing copy and image descriptions, dates, duplicate slugs, approved source links, search-preview gaps, and internal references. Checks suggest edits; they never change content. Hidden records are included for editorial review.</p></div>
    <div className="flex flex-wrap gap-3"><button className={control} disabled={busy} onClick={refresh}>{busy ? "Checking saved content…" : "Refresh content checks"}</button><button className={control} disabled={checking} onClick={checkLinks}>{checking ? "Checking public links…" : "Live check saved public links"}</button></div>
    <p className="text-xs text-white/60">Live checks contact at most 12 saved public URLs on approved hosts, use HEAD requests, and do not follow redirects. No arbitrary URL can be submitted.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {report && <>
      <p className="text-sm text-white/75">{report.counts.projects} projects · {report.counts.articles} articles · {report.counts.clients} clients reviewed · {report.counts.issues} findings · {new Date(report.checkedAt).toLocaleString()}</p>
      {report.truncated && <p className="text-sm text-amber-200">Showing the first 500 findings, ordered by severity. Resolve these and refresh to review the remaining findings.</p>}
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Severity<select className={`${control} ml-2`} value={severity} onChange={(e) => setSeverity(e.target.value)}>{["all", "error", "warning", "info"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm">Check<select className={`${control} ml-2`} value={category} onChange={(e) => setCategory(e.target.value)}>{["all", "copy", "media", "dates", "routing", "source", "seo", "links"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="text-sm">Collection<select className={`${control} ml-2`} value={collection} onChange={(e) => setCollection(e.target.value)}>{["all", "projects", "articles", "clients"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="flex-1 text-sm">Search<input className={`${control} ml-2`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Record, field or issue" /></label>
      </div>
      <p role="status" className="text-sm text-white/70">{filtered.length} matching findings.</p>
      <ul className="space-y-3">{filtered.map((issue) => <li key={issue.id} className="rounded-sm border border-white/15 p-4">
        <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{issue.title}</h3><span className={`text-xs uppercase ${issue.severity === "error" ? "text-red-300" : issue.severity === "warning" ? "text-amber-200" : "text-white/65"}`}>{issue.severity} · {issue.category}</span></div>
        <p className="mt-2 text-sm text-white/80">{issue.message}</p><p className="mt-2 break-words font-mono text-xs text-white/55">{issue.collection} · {issue.field}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm"><a href={issue.editorHref} className="underline">Edit this record</a>{issue.publicHref && <a href={issue.publicHref} target="_blank" rel="noopener noreferrer" className="underline">View published page</a>}</div>
      </li>)}</ul>
      {!filtered.length && <p className="text-sm text-white/70">No findings match these filters. This is a structured content check, not a full accessibility or SEO certification.</p>}
    </>}
    {live && <section className="rounded-sm border border-white/15 p-4"><h3 className="font-semibold">Live link results</h3><p className="mt-2 text-sm text-white/65">{live.note}</p><ul className="mt-4 space-y-3">{live.results.map((result) => <li key={result.url} className="break-words text-sm"><span className="mr-2 font-semibold">{result.state}{result.status ? ` (${result.status})` : ""}</span><a href={result.url} target="_blank" rel="noopener noreferrer" className="underline">{result.url}</a>{result.note && <p className="mt-1 text-white/60">{result.note}</p>}</li>)}</ul>{!live.results.length && <p className="mt-3 text-sm">No eligible saved URLs were found on the approved hosts.</p>}</section>}
  </section>;
}
