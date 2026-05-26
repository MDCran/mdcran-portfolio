"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, FolderGit2, X, ArrowRight } from "lucide-react";

export interface WorkRow {
  id: string;
  type: "project" | "article";
  title: string;
  category: string;
  categoryLabel: string;
  subcategory?: string;
  url: string;
  dateLabel?: string;
  sortDate: number;
  status?: string;
  clients?: string;
  thumb?: string;
  tags?: string[];
}

type SortKey = "title" | "type" | "category" | "date";
type SortDir = "asc" | "desc";

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "project", label: "Projects" },
  { value: "article", label: "Articles" },
] as const;

export default function WorkTable({ rows }: { rows: WorkRow[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | "project" | "article">("all");
  const [category, setCategory] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Category options come from PROJECTS only (articles aren't categorized here).
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.type === "project" && !map.has(r.category)) map.set(r.category, r.categoryLabel); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q) ||
        (r.clients?.toLowerCase().includes(q) ?? false) ||
        (r.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      );
    });
    out = [...out].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.sortDate - b.sortDate;
      else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "category") cmp = a.categoryLabel.localeCompare(b.categoryLabel);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, query, type, category, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown size={11} className="opacity-30" /> :
    sortDir === "asc" ? <ArrowUp size={11} className="text-[var(--cranberry,#ef4242)]" /> :
    <ArrowDown size={11} className="text-[var(--cranberry,#ef4242)]" />;

  return (
    <section className="mt-16">
      <div className="mb-5 flex flex-col gap-1.5">
        <h2 className="font-nord text-xl tracking-wider text-white">All Work</h2>
        <p className="text-sm text-white/45">Every project and article in one place — search, filter, and sort.</p>
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-3 h-10 focus-within:border-[var(--cranberry,#ef4242)] transition-colors">
          <Search size={15} className="text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-white/35 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`h-10 rounded-sm border px-3 text-xs transition-colors ${type === t.value ? "border-[var(--cranberry,#ef4242)]/45 bg-[var(--cranberry,#ef4242)]/10 text-[var(--cranberry,#ef4242)]" : "border-white/10 text-white/50 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-sm border border-white/10 bg-white/[0.03] px-2.5 text-xs text-white/70 outline-none focus:border-[var(--cranberry,#ef4242)]"
        >
          <option value="all" className="bg-[#0a0a0c]">All categories</option>
          {categories.map(([value, label]) => (
            <option key={value} value={value} className="bg-[#0a0a0c]">{label}</option>
          ))}
        </select>
      </div>

      {/* Table — full length; the whole page scrolls (no inner scroll) */}
      <div className="overflow-x-auto rounded-sm border border-white/8">
        <div>
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#0c0c0e]">
              <tr className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("title")} className="inline-flex items-center gap-1.5 hover:text-white">Title <SortIcon k="title" /></button>
                </th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">
                  <button onClick={() => toggleSort("type")} className="inline-flex items-center gap-1.5 hover:text-white">Type <SortIcon k="type" /></button>
                </th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">
                  <button onClick={() => toggleSort("category")} className="inline-flex items-center gap-1.5 hover:text-white">Category <SortIcon k="category" /></button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => toggleSort("date")} className="inline-flex items-center gap-1.5 hover:text-white">Date <SortIcon k="date" /></button>
                </th>
                <th className="px-4 py-3 font-medium text-right">Link</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.type}-${r.id}`} className="group border-t border-white/6 transition-colors hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link href={r.url} className="flex items-center gap-3">
                      <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/[0.04]">
                        {r.thumb ? (
                          <Image src={r.thumb} alt="" fill sizes="56px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-white/25">
                            {r.type === "article" ? <FileText size={14} /> : <FolderGit2 size={14} />}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-white/85 group-hover:text-white">{r.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-wider ${r.type === "article" ? "bg-sky-500/10 text-sky-300" : "bg-[var(--cranberry,#ef4242)]/12 text-[var(--cranberry,#ef4242)]"}`}>
                      {r.type === "article" ? <FileText size={10} /> : <FolderGit2 size={10} />}
                      {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-white/55">{r.categoryLabel}</td>
                  <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">{r.dateLabel ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={r.url}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--cranberry,#ef4242)]/40 bg-[var(--cranberry,#ef4242)]/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[var(--cranberry,#ef4242)] transition-colors hover:bg-[var(--cranberry,#ef4242)]/20 hover:text-white whitespace-nowrap"
                    >
                      View Now <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center text-sm text-white/40">No work matches your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/30">{filtered.length} of {rows.length} items</p>
    </section>
  );
}
