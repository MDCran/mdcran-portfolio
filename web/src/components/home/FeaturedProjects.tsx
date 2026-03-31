"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ProjectCard from "@/components/shared/ProjectCard";
import type { Article, ArticleCategory, Project, SiteContentSectionIntro } from "@/lib/types";
import { imageAssetAlt, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";

const ARTICLE_CATEGORY_COLORS: Record<ArticleCategory, string> = {
  press: "text-sky-400 border-sky-400/30 bg-sky-400/8",
  recipe: "text-amber-400 border-amber-400/30 bg-amber-400/8",
  tech: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8",
  personal: "text-purple-400 border-purple-400/30 bg-purple-400/8",
  tutorial: "text-[#ef4242] border-[#ef4242]/30 bg-[#ef4242]/8",
  announcement: "text-orange-400 border-orange-400/30 bg-orange-400/8",
};

function ArticleCard({ article, index = 0 }: { article: Article; index?: number }) {
  const coverImage = article.coverImage;
  const coverSrc = imageAssetSrc(coverImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
      className="group h-full"
      data-highlight-id={article.id}
    >
      <div
        className="relative flex flex-col h-full rounded-sm border overflow-hidden transition-all duration-300 hover:border-[rgba(239,66,66,0.25)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(239,66,66,0.1)] cursor-pointer"
        style={{
          borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 7%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 2%, transparent)',
        }}
      >
        {/* Full-card link overlay */}
        <Link href={`/articles/${article.slug}`} className="absolute inset-0 z-[1]" aria-label={article.title} />

        {/* Cover image */}
        <div className="relative aspect-video overflow-hidden bg-white/5 shrink-0">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={imageAssetAlt(coverImage, article.title)}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={shouldBypassImageOptimization(coverSrc)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ef4242]/10 to-transparent">
              <div className="w-16 h-16 rounded-sm bg-[rgba(239,66,66,0.08)] border border-[rgba(239,66,66,0.15)] flex items-center justify-center">
                <div className="w-6 h-6 bg-[var(--cranberry)] rounded-sm rotate-45 opacity-60" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {/* Category badge */}
          <div className="absolute top-3 right-3 z-[2]">
            <div className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[9px] tracking-widest uppercase backdrop-blur-sm ${ARTICLE_CATEGORY_COLORS[article.category]}`}>
              {article.category}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4 min-w-0 flex flex-col flex-1 relative z-0">
          <h3
            className="font-nord text-sm tracking-wide group-hover:text-[var(--cranberry)] transition-colors duration-200 leading-snug mb-2"
            style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 90%, transparent)' }}
          >
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)' }}>
              {article.excerpt}
            </p>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-sm border"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)',
                    color: 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 3%, transparent)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer row */}
          <div
            className="flex items-center justify-between py-2 border-t mt-auto"
            style={{ borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)' }}
          >
            <span
              className="text-[10px] tracking-wider uppercase"
              style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}
            >
              article
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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
