"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Download, ShoppingCart, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, imageAssetAlt, imageAssetSrc, projectUrl, shouldBypassImageOptimization } from "@/lib/utils";
import AuthorByline from "@/components/shared/AuthorByline";
import { projectReadMinutes } from "@/lib/read-time";
import { effectiveProjectDate } from "@/lib/project-date";
import type { Project } from "@/lib/types";

interface ProjectCardProps {
  project: Project;
  index?: number;
  className?: string;
}

function PricingBadge({ project }: { project: Project }) {
  const { pricing } = project;
  if (pricing.status === "free") {
    return (
      <Badge
        variant="green"
        className="gap-1 bg-green-500/30 text-emerald-50 border-green-400/80 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] backdrop-blur-sm"
      >
        <Download size={8} />
        Free
      </Badge>
    );
  }
  if (pricing.status === "for_sale" && pricing.price) {
    const dollars = (pricing.price / 100).toFixed(2);
    return (
      <Badge
        variant="default"
        className="gap-1 bg-[var(--cranberry)]/80 text-white border-[var(--cranberry)] shadow-[0_0_0_1px_rgba(0,0,0,0.5)] backdrop-blur-sm"
      >
        <Tag size={8} />
        ${dollars}
      </Badge>
    );
  }
  return null;
}

function PricingAction({ project }: { project: Project }) {
  const { pricing } = project;

  const trackDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card-level link from firing
    await fetch("/api/downloads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id }),
    }).catch(() => {});
  };

  if (pricing.status === "free") {
    return (
      <Button
        variant="glass"
        size="sm"
        className="gap-1.5 relative z-[2]"
        asChild={!!pricing.downloadUrl}
        onClick={!pricing.downloadUrl ? trackDownload : undefined}
      >
        {pricing.downloadUrl ? (
          <a href={pricing.downloadUrl} download onClick={trackDownload}>
            <Download size={12} />
            Download
          </a>
        ) : (
          <>
            <Download size={12} />
            Download
          </>
        )}
      </Button>
    );
  }

  if (pricing.status === "for_sale") {
    return (
      <Button
        variant="default"
        size="sm"
        className="gap-1.5 relative z-[2]"
        asChild={!!pricing.checkoutUrl}
        onClick={!pricing.checkoutUrl ? (e) => e.stopPropagation() : undefined}
      >
        {pricing.checkoutUrl ? (
          <a href={pricing.checkoutUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <ShoppingCart size={12} />
            Buy Now
          </a>
        ) : (
          <>
            <ShoppingCart size={12} />
            Buy Now
          </>
        )}
      </Button>
    );
  }

  return null;
}

export default function ProjectCard({ project, index = 0, className }: ProjectCardProps) {
  const href = projectUrl(project.category, project.slug, project.subcategory);
  const coverImage = project.coverImage ?? project.images?.[0];
  const coverSrc = imageAssetSrc(coverImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
      className={cn("group h-full", className)}
      data-highlight-id={project.id}
    >
      <div
        className="relative flex flex-col h-full rounded-sm border overflow-hidden transition-all duration-300 hover:border-[rgba(239,66,66,0.25)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(239,66,66,0.1)] cursor-pointer"
        style={{
          borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 7%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 2%, transparent)',
        }}
      >

        {/* Full-card link overlay — sits above content, below action buttons */}
        <Link href={href} className="absolute inset-0 z-[1]" aria-label={project.title} />

        {/* Cover image */}
        <div className="relative aspect-video overflow-hidden bg-white/5 shrink-0">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={imageAssetAlt(coverImage, project.title)}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={shouldBypassImageOptimization(coverSrc)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-sm bg-[rgba(239,66,66,0.08)] border border-[rgba(239,66,66,0.15)] flex items-center justify-center">
                <div className="w-6 h-6 bg-[var(--cranberry)] rounded-sm rotate-45 opacity-60" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 z-[2] flex flex-col items-end gap-1.5">
            {project.featured && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-[var(--cranberry)]/90 shadow-[0_0_8px_rgba(239,66,66,0.5)] backdrop-blur-sm">
                <Star size={10} className="text-white fill-white" />
              </span>
            )}
            <PricingBadge project={project} />
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-4 min-w-0 flex flex-col flex-1 relative z-0">
          <h3
            className="font-nord text-sm tracking-wide group-hover:text-[var(--cranberry)] transition-colors duration-200 leading-snug mb-2"
            style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 90%, transparent)' }}
          >
            {project.title}
          </h3>

          {project.description && (
            <p className="text-xs leading-relaxed mb-3" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)' }}>
              {project.description}
            </p>
          )}

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-sm tracking-wider"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 4%, transparent)',
                    borderWidth: '1px',
                    borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)',
                    color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action row */}
          <div
            className="flex items-center justify-between py-2 border-t mt-auto"
            style={{ borderColor: 'color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)' }}
          >
            <AuthorByline date={effectiveProjectDate(project)} minutes={projectReadMinutes(project)} />
            <PricingAction project={project} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
