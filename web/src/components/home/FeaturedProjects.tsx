"use client";

import React from "react";
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

        {/* Combined grid — unified order from admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orderedItems.map((entry, i) =>
            entry.type === "project" ? (
              <ProjectCard key={entry.item.id} project={entry.item} index={i} />
            ) : (
              <ArticleCard key={entry.item.id} article={entry.item} index={i} />
            )
          )}
        </div>
      </div>
    </section>
  );
}
