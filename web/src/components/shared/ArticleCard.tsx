"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Article, ArticleCategory } from "@/lib/types";
import { imageAssetAlt, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";
import AuthorByline from "@/components/shared/AuthorByline";
import { articleReadMinutes } from "@/lib/read-time";

const ARTICLE_CATEGORY_COLORS: Record<ArticleCategory, string> = {
  press: "text-sky-400 border-sky-400/30 bg-sky-400/8",
  recipe: "text-amber-400 border-amber-400/30 bg-amber-400/8",
  tech: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8",
  personal: "text-purple-400 border-purple-400/30 bg-purple-400/8",
  tutorial: "text-[#ef4242] border-[#ef4242]/30 bg-[#ef4242]/8",
  announcement: "text-orange-400 border-orange-400/30 bg-orange-400/8",
};

export default function ArticleCard({ article, index = 0 }: { article: Article; index?: number }) {
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
          borderColor: "color-mix(in srgb, var(--theme-text, #fff) 7%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 2%, transparent)",
        }}
      >
        <Link href={`/articles/${article.slug}`} className="absolute inset-0 z-[1]" aria-label={article.title} />

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
          <div className="absolute top-3 right-3 z-[2]">
            <div className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[9px] tracking-widest uppercase backdrop-blur-sm ${ARTICLE_CATEGORY_COLORS[article.category]}`}>
              {article.category}
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 min-w-0 flex flex-col flex-1 relative z-0">
          <h3
            className="font-nord text-sm tracking-wide group-hover:text-[var(--cranberry)] transition-colors duration-200 leading-snug mb-2"
            style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 90%, transparent)" }}
          >
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)" }}>
              {article.excerpt}
            </p>
          )}

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-sm border"
                  style={{
                    borderColor: "color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)",
                    color: "color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 3%, transparent)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            className="flex items-center justify-between py-2 border-t mt-auto"
            style={{ borderColor: "color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)" }}
          >
            <AuthorByline date={article.publishDate} minutes={articleReadMinutes(article)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
