"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ProjectCard from "@/components/shared/ProjectCard";
import ArticleCard from "@/components/shared/ArticleCard";
import type { Article, Project, SiteContentSectionIntro } from "@/lib/types";

export default function FeaturedProjects({
  projects,
  articles = [],
  workOrder = [],
  content,
}: {
  projects: Project[];
  articles?: Article[];
  workOrder?: string[];
  content?: SiteContentSectionIntro;
}) {
  type Capability = "all" | "engineering" | "creative" | "games" | "writing";
  const [capability, setCapability] = useState<Capability>("all");
  // Build unified ordered list from workOrder, interleaving projects and articles
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const allIds = workOrder.length > 0
    ? workOrder
    : [...projects.map((p) => p.id), ...articles.map((a) => a.id)];
  const orderedItems: ({ type: "project"; item: Project } | { type: "article"; item: Article })[] = [];
  for (const id of allIds) {
    const proj = projectMap.get(id);
    if (proj) { orderedItems.push({ type: "project", item: proj }); continue; }
    const art = articleMap.get(id);
    if (art) { orderedItems.push({ type: "article", item: art }); continue; }
  }
  const matchesCapability = (entry: (typeof orderedItems)[number], filter: Capability) => {
    const projectCategories = entry.type === "project"
      ? [entry.item.category, ...(entry.item.extraCategories ?? [])]
      : [];
    if (filter === "all") return true;
    if (entry.type === "article") return filter === "writing";
    if (filter === "engineering") return projectCategories.some((category) => category === "coding-projects" || category === "software");
    if (filter === "creative") return projectCategories.includes("motion-and-graphics");
    if (filter === "games") return projectCategories.includes("arts-and-entertainment");
    return false;
  };
  // Only offer filters that have real work behind them. This keeps the home page
  // useful as new featured work is curated in admin instead of showing dead ends.
  const capabilityOptions = ([
    ["all", "All work"],
    ["engineering", "Engineering"],
    ["creative", "Creative"],
    ["games", "Games & Experiences"],
    ["writing", "Writing"],
  ] as const).filter(([value]) => value === "all" || orderedItems.some((entry) => matchesCapability(entry, value)));
  const activeCapability = capabilityOptions.some(([value]) => value === capability) ? capability : "all";
  const visibleItems = useMemo(() => orderedItems.filter((entry) => {
    return matchesCapability(entry, activeCapability);
  }), [activeCapability, orderedItems]);
  return (
    <section className="py-24 border-t border-white/6">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="h-px w-8 bg-[var(--cranberry)]" />
              <span className="text-[var(--cranberry)] text-[11px] tracking-[0.25em] uppercase">
                {content?.eyebrow ?? "Portfolio"}
              </span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ delay: 0.1 }}
              className="font-nord text-3xl md:text-4xl text-white tracking-wider"
            >
              {content?.title ?? "Featured Work"}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-3 max-w-md text-sm text-white/40 leading-relaxed"
            >
              {content?.description ?? "Featured projects pulled automatically from the portfolio."}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0 }}
          >
            <Link
              href={content?.ctaHref ?? "/work"}
              className="flex items-center gap-2 text-xs tracking-wider text-white/40 hover:text-[var(--cranberry)] uppercase transition-colors duration-200 group"
            >
              {content?.ctaLabel ?? "View all projects"}
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </motion.div>
        </div>

        <div className="mb-7 flex flex-wrap gap-2" role="group" aria-label="Filter featured work by capability">
          {capabilityOptions.map(([value, label]) => {
            const active = activeCapability === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCapability(value)}
                aria-pressed={active}
                className={`min-h-9 rounded-sm border px-3 text-xs transition-colors ${active ? "border-[var(--cranberry)]/50 bg-[var(--cranberry)]/12 text-white" : "border-white/10 bg-white/[0.02] text-white/50 hover:border-white/25 hover:text-white/75"}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Combined grid — unified order from admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((entry, i) =>
            entry.type === "project" ? (
              <ProjectCard key={entry.item.id} project={{ ...entry.item, featured: true }} index={i} />
            ) : (
              <ArticleCard key={entry.item.id} article={entry.item} index={i} featured />
            )
          )}
        </div>
        {visibleItems.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">No featured work in this capability yet.</p>
        )}
      </div>
    </section>
  );
}
