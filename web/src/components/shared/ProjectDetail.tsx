"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  Download,
  Eye,
  ExternalLink,
  Globe,
  Heart,
  Link2,
  Play,
  Share2,
  ShoppingCart,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Lightbox from "@/components/shared/Lightbox";
import type { ArticleSection, Client, Project } from "@/lib/types";
import { imageAssetAlt, imageAssetSrc, projectUrl } from "@/lib/utils";

interface ProjectDetailProps {
  project: Project;
  clients: Client[];
  relatedProjects: Project[];
  backHref: string;
  backLabel: string;
}

const pricingLabel = {
  free: "Free Download",
  for_sale: "For Sale",
  unavailable: "Unavailable",
} as const;

const pricingColor = {
  free: "border-emerald-400/80 text-emerald-50 bg-emerald-500/35 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]",
  for_sale: "border-[rgba(239,66,66,0.85)] text-white bg-[rgba(239,66,66,0.85)] shadow-[0_0_0_1px_rgba(0,0,0,0.55)]",
  unavailable: "border-white/60 text-white/85 bg-black/70 shadow-[0_0_0_1px_rgba(0,0,0,0.65)]",
} as const;

function getSidebarTitleMarqueeDuration(title: string): string {
  return `${Math.max(6, Math.min(14, Math.ceil(title.length / 4)))}s`;
}

export default function ProjectDetail({
  project,
  clients,
  relatedProjects,
  backHref,
  backLabel,
}: ProjectDetailProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const coverImage = project.coverImage ?? project.images?.[0];
  const coverSrc = imageAssetSrc(coverImage);
  const hasCover = !!coverSrc;
  const hasGallery = !!project.images?.length;
  const hasVideos = !!project.videos?.length;
  const showPricing = project.pricing.status !== "unavailable";
  const hasTopSidebarContent =
    showPricing ||
    (project.pricing.status === "free" && !!project.pricing.downloadUrl) ||
    project.pricing.status === "for_sale" ||
    !!project.liveUrl ||
    !!project.externalUrl ||
    hasVideos;
  const priceFormatted = project.pricing.price
    ? `$${(project.pricing.price / 100).toFixed(2)}`
    : null;

  const sectionImages: string[] = [];
  const sectionImageCaptions: string[] = [];
  const sectionImageOffsets: number[] = [];
  for (const section of project.sections ?? []) {
    sectionImageOffsets.push(sectionImages.length);
    if (section.type === "image" && section.src) {
      sectionImages.push(section.src);
      sectionImageCaptions.push(section.alt?.trim() || section.caption?.trim() || project.title);
    } else if (section.type === "gallery") {
      for (const image of section.images ?? []) {
        const src = imageAssetSrc(image);
        if (!src) continue;
        sectionImages.push(src);
        sectionImageCaptions.push(imageAssetAlt(image, section.caption?.trim() || project.title));
      }
    }
  }

  const galleryImages = project.images ?? [];
  const galleryImageCaptions = galleryImages.map(
    (image, index) => imageAssetAlt(image, `${project.title} screenshot ${index + 1}`)
  );
  const galleryImageSources = galleryImages
    .map((image) => imageAssetSrc(image))
    .filter((src): src is string => !!src);
  const allImages = [...galleryImageSources, ...sectionImages];
  const allImageCaptions = [...galleryImageCaptions, ...sectionImageCaptions];
  const sectionImageBase = galleryImageSources.length;

  return (
    <>
      <Navbar />

      <section className="relative w-full mt-[var(--navbar-height)]">
        {hasCover ? (
          <div className="relative w-full h-[420px] sm:h-[520px] overflow-hidden">
            <Image
              src={coverSrc}
              alt={imageAssetAlt(coverImage, project.title)}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[rgba(10,10,10,0.55)] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,10,10,0.4)] to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 content-container pb-10 sm:pb-14">
              <BackLink href={backHref} label={backLabel} />
              <HeroContent project={project} priceFormatted={priceFormatted} />
            </div>
          </div>
        ) : (
          <div className="relative bg-[#0d0d0d] border-b border-white/6">
            <div className="content-container py-14 sm:py-18">
              <BackLink href={backHref} label={backLabel} />
              <div className="mt-6">
                <HeroContent project={project} priceFormatted={priceFormatted} />
              </div>
            </div>
          </div>
        )}
      </section>

      <main className="content-container py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          <div className="lg:col-span-2 space-y-12">
            {project.description && (
              <section>
                <p className="text-[15px] text-white/65 leading-relaxed">{project.description}</p>
              </section>
            )}

            {hasGallery && (
              <section>
                <h2 className="font-nord text-lg text-white tracking-wider mb-5">Gallery</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((image, i) => {
                    const src = imageAssetSrc(image);
                    if (!src) return null;

                    return (
                      <div
                        key={i}
                        onClick={() => setLightboxIndex(i)}
                        className="relative aspect-video rounded-sm overflow-hidden border border-white/6 hover:border-[rgba(239,66,66,0.3)] transition-colors group cursor-pointer"
                      >
                        <Image
                          src={src}
                          alt={imageAssetAlt(image, `${project.title} screenshot ${i + 1}`)}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {hasVideos && (
              <section>
                <h2 className="font-nord text-lg text-white tracking-wider mb-5">Videos</h2>
                <div className="space-y-4">
                  {project.videos!.map((video) => (
                    <div key={video.youtubeId} className="rounded-sm overflow-hidden border border-white/6">
                      <div className="relative aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${video.youtubeId}`}
                          title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                      <div className="bg-white/2 px-4 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex flex-1 items-center gap-2 text-xs text-white/55">
                            <Play size={11} className="text-[#ef4242] shrink-0" />
                            <p className="truncate">{video.title}</p>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-white/35 text-xs">
                            <Eye size={11} className="shrink-0" />
                            {(video.viewCount ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {project.sections && project.sections.length > 0 && (
              <section className="space-y-1">
                {project.sections.map((section, i) => (
                  <ProjectSection
                    key={i}
                    section={section}
                    imageOffset={sectionImageBase + sectionImageOffsets[i]}
                    onImageClick={setLightboxIndex}
                  />
                ))}
              </section>
            )}

            {project.publishDate && (
              <section>
                <div className="flex items-center gap-2 text-xs text-white/45 border-t border-white/8 pt-5">
                  <Calendar size={12} className="text-[#ef4242]" />
                  <span>Published {formatProjectDate(project.publishDate)}</span>
                </div>
              </section>
            )}

            <section className="border-t border-white/8 pt-5">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-white/30 mb-3">Appreciate this project</p>
                  <ProjectTapsButton projectId={project.id} />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-white/30 mb-3">Share</p>
                  <ProjectShareButtons />
                </div>
              </div>
            </section>

            {relatedProjects.length > 0 && (
              <section>
                <h2 className="font-nord text-lg text-white tracking-wider mb-5">Other Projects</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedProjects.map((rel) => (
                    <Link
                      key={rel.id}
                      href={projectUrl(rel.category, rel.slug, rel.subcategory)}
                      className="group flex gap-3 p-4 rounded-sm border border-white/6 bg-white/2 hover:border-[rgba(239,66,66,0.25)] hover:bg-white/4 transition-all duration-200"
                    >
                      {imageAssetSrc(rel.coverImage) && (
                        <div className="relative w-16 h-16 shrink-0 rounded-sm overflow-hidden">
                          <Image
                            src={imageAssetSrc(rel.coverImage)!}
                            alt={imageAssetAlt(rel.coverImage, rel.title)}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-white/80 group-hover:text-white transition-colors leading-snug line-clamp-2">
                          {rel.title}
                        </div>
                        {rel.tags && rel.tags.length > 0 && (
                          <div className="text-[10px] text-white/30 mt-1">{rel.tags.slice(0, 2).join(" · ")}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {hasTopSidebarContent && (
            <div className="p-5 rounded-sm border border-white/7 bg-white/2 space-y-4">
              {showPricing && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-widest uppercase rounded-sm border ${pricingColor[project.pricing.status]}`}>
                  {project.pricing.status === "free" && <Download size={11} />}
                  {project.pricing.status === "for_sale" && <ShoppingCart size={11} />}
                  {pricingLabel[project.pricing.status]}
                  {priceFormatted && <span className="ml-1 font-bold">{priceFormatted}</span>}
                </div>
              )}

              {project.pricing.status === "free" && project.pricing.downloadUrl && (
                <Button size="lg" className="w-full gap-2" asChild>
                  <a href={project.pricing.downloadUrl} download>
                    <Download size={14} />
                    Download Free
                  </a>
                </Button>
              )}

              {project.pricing.status === "for_sale" && (
                <Button size="lg" className="w-full gap-2">
                  <ShoppingCart size={14} />
                  Buy Now {priceFormatted && `· ${priceFormatted}`}
                </Button>
              )}

              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-9 rounded-sm border border-white/10 text-xs text-white/50 hover:border-white/20 hover:text-white/70 transition-all"
                >
                  <Globe size={12} />
                  View Live Site
                  <ExternalLink size={10} />
                </a>
              )}

              {project.externalUrl && (
                <a
                  href={project.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-9 rounded-sm border border-white/10 text-xs text-white/50 hover:border-white/20 hover:text-white/70 transition-all"
                >
                  <ExternalLink size={12} />
                  Read More
                </a>
              )}

              {hasVideos && (
                <div className="py-1 space-y-2">
                  <p className="text-[10px] tracking-widest uppercase text-white/35">Videos</p>
                  {project.videos!.map((video) => (
                    <div key={video.youtubeId} className="flex items-start justify-between gap-3 text-xs text-white/55">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-2 hover:text-white/80 transition-colors"
                      >
                        <Play size={11} className="text-[#ef4242] shrink-0" />
                        <span className="min-w-0 flex-1 overflow-hidden">
                          <span
                            className="block min-w-max whitespace-nowrap will-change-transform animate-[sidebar-title-marquee_var(--sidebar-title-duration)_ease-in-out_infinite_alternate]"
                            style={
                              {
                                "--sidebar-title-width": "11rem",
                                "--sidebar-title-duration": getSidebarTitleMarqueeDuration(
                                  video.title || video.youtubeId
                                ),
                              } as CSSProperties
                            }
                          >
                            {video.title || video.youtubeId}
                          </span>
                        </span>
                      </a>
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-white/35">
                        <Eye size={11} />
                        {formatViewCount(video.viewCount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {project.tags && project.tags.length > 0 && (
              <div className="p-5 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={12} className="text-white/40" />
                  <span className="text-[10px] tracking-widest uppercase text-white/40">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2.5 py-1 rounded-sm border border-white/8 text-white/45 bg-white/3">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {project.credits && project.credits.length > 0 && (
              <div className="p-5 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={12} className="text-white/40" />
                  <span className="text-[10px] tracking-widest uppercase text-white/40">Credits</span>
                </div>
                <div className="space-y-3">
                  {project.credits.map((credit, i) => (
                    <div key={i}>
                      <div className={`text-xs leading-snug ${credit.isMe ? "text-[#ef4242]" : "text-white/70"}`}>
                        {credit.name}
                      </div>
                      <div className="text-[11px] text-white/30">{credit.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clients.length > 0 && (
              <div className="p-5 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={12} className="text-white/40" />
                  <span className="text-[10px] tracking-widest uppercase text-white/40">Clients</span>
                </div>
                <div className="space-y-3">
                  {clients.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      title={client.name}
                      className="group flex items-center gap-3"
                    >
                      <div className="relative w-8 h-8 rounded-sm bg-white/5 border border-white/8 overflow-hidden shrink-0 group-hover:border-[rgba(239,66,66,0.3)] group-hover:scale-110 transition-all duration-200 flex items-center justify-center text-[10px] text-white/40 font-bold">
                        {client.avatarUrl ? (
                          <Image src={client.avatarUrl} alt={client.name} fill className="object-cover" sizes="32px" />
                        ) : (
                          client.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-white/70 group-hover:text-[#ef4242] transition-colors leading-snug">
                          {client.name}
                        </div>
                        {client.roles[0] && (
                          <div className="text-[10px] text-white/30">{client.roles[0]}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      <Lightbox
        images={allImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        captions={allImageCaptions}
      />
      <style jsx global>{`
        @keyframes sidebar-title-marquee {
          0%,
          16% {
            transform: translateX(0);
          }

          84%,
          100% {
            transform: translateX(
              min(0px, calc(var(--sidebar-title-width, 11rem) - 100%))
            );
          }
        }
      `}</style>
    </>
  );
}

function ProjectTapsButton({ projectId }: { projectId: string }) {
  const dailyLimit = 10;
  const [count, setCount] = useState(0);
  const [dailyTapCount, setDailyTapCount] = useState(() => {
    if (typeof window === "undefined") return 0;

    const storageKey = `project_taps_${projectId}`;
    const today = new Date().toISOString().slice(0, 10);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { date?: string; count?: number };
        if (parsed.date === today) {
          return Math.min(parsed.count ?? 0, dailyLimit);
        }
      }

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ date: today, count: 0 })
      );
    } catch {}

    return 0;
  });
  const [loading, setLoading] = useState(true);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    fetch(`/api/taps?id=${projectId}&type=project`)
      .then((response) => response.json())
      .then((data) => setCount(data.count ?? 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleTap = useCallback(async () => {
    if (loading || dailyTapCount >= dailyLimit) return;

    const storageKey = `project_taps_${projectId}`;
    const today = new Date().toISOString().slice(0, 10);
    const nextDailyCount = Math.min(dailyTapCount + 1, dailyLimit);

    setBurst(true);
    setTimeout(() => setBurst(false), 600);
    setCount((current) => current + 1);
    setDailyTapCount(nextDailyCount);

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ date: today, count: nextDailyCount })
      );
    } catch {}

    await fetch("/api/taps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: projectId, type: "project" }),
    }).catch(() => {});
  }, [dailyLimit, dailyTapCount, loading, projectId]);

  const canTap = !loading && dailyTapCount < dailyLimit;

  return (
    <div className="flex flex-col items-start gap-2">
      <motion.button
        onClick={handleTap}
        disabled={!canTap}
        whileTap={{ scale: 0.92 }}
        className="relative flex items-center gap-2 px-4 py-2 rounded-sm border border-white/12 bg-white/4 text-white/50 transition-all duration-300 hover:border-[#ef4242]/30 hover:bg-[#ef4242]/5 hover:text-[#ef4242] disabled:cursor-not-allowed disabled:opacity-60"
        title={loading ? "Loading taps" : "Tap to appreciate this project"}
      >
        <AnimatePresence>
          {burst &&
            [0, 60, 120, 180, 240, 300].map((angle) => (
              <motion.div
                key={angle}
                className="absolute w-1 h-1 rounded-full bg-[#ef4242]"
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((angle * Math.PI) / 180) * 20,
                  y: Math.sin((angle * Math.PI) / 180) * 20,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>

        <motion.span
          animate={burst ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="leading-none"
        >
          <Heart size={12} className={burst ? "fill-current" : ""} />
        </motion.span>
        <span className="text-xs tracking-wider">
          {loading ? "-" : `${count} ${count === 1 ? "tap" : "taps"}`}
        </span>
      </motion.button>
      {!loading && !canTap && (
        <span className="text-[10px] text-white/30 tracking-wider">
          Daily limit reached. Resets tomorrow.
        </span>
      )}
    </div>
  );
}

function ProjectShareButtons() {
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!currentUrl) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: currentUrl });
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name === "AbortError"
        ) {
          return;
        }
      }
    }

    handleCopy();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_40px] gap-3 sm:grid-cols-1 sm:items-center">
        <motion.button
          onClick={handleCopy}
          whileTap={{ scale: 0.95 }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-sm border border-white/12 bg-white/4 px-4 text-xs tracking-wider text-white/50 transition-all hover:border-white/20 hover:text-white"
        >
          {copied ? (
            <><Check size={12} className="text-emerald-400" /> Copied!</>
          ) : (
            <><Link2 size={12} /> Copy Link</>
          )}
        </motion.button>
        <motion.button
          onClick={() => void handleShare()}
          whileTap={{ scale: 0.95 }}
          className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/12 bg-white/4 text-white/50 transition-all hover:border-white/20 hover:text-white sm:hidden"
          aria-label="Share link"
          title="Share"
        >
          <Share2 size={14} />
        </motion.button>
      </div>
    </div>
  );
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors mb-4"
    >
      <ArrowLeft size={13} />
      {label}
    </Link>
  );
}

function HeroContent({
  project,
  priceFormatted,
}: {
  project: Project;
  priceFormatted: string | null;
}) {
  return (
    <div>
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {project.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag-red">{tag}</span>
          ))}
        </div>
      )}
      <h1 className="font-nord text-3xl sm:text-4xl md:text-5xl text-white tracking-wider leading-tight mb-3">
        {project.title}
      </h1>
      {project.description && (
        <p className="text-sm sm:text-base text-white/55 max-w-2xl leading-relaxed mb-4">
          {project.description}
        </p>
      )}
      {project.pricing.status !== "unavailable" && (
        <div className="flex items-center flex-wrap gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-widest uppercase rounded-sm border ${pricingColor[project.pricing.status]}`}>
            {pricingLabel[project.pricing.status]}
            {priceFormatted && <span className="font-bold ml-1">{priceFormatted}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function formatProjectDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatViewCount(count?: number) {
  if (count === undefined) return "—";
  return count.toLocaleString("en-US");
}

function renderMarkdown(text: string) {
  return text.split("\n\n").map((block, blockIdx) => {
    if (block.startsWith("## ")) {
      return (
        <h2 key={blockIdx} className="font-nord text-2xl text-white tracking-wider mt-10 mb-4">
          {block.slice(3)}
        </h2>
      );
    }
    if (block.startsWith("### ")) {
      return (
        <h3 key={blockIdx} className="font-nord text-lg text-white/85 tracking-wider mt-8 mb-3">
          {block.slice(4)}
        </h3>
      );
    }
    if (block.startsWith("- ") || block.includes("\n- ")) {
      const items = block.split("\n").filter((line) => line.startsWith("- "));
      return (
        <ul key={blockIdx} className="space-y-2 my-4 pl-4">
          {items.map((item, i) => (
            <li key={i} className="text-[15px] text-white/65 leading-relaxed flex items-start gap-2">
              <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
              <span dangerouslySetInnerHTML={{ __html: boldify(item.slice(2)) }} />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p
        key={blockIdx}
        className="text-[15px] text-white/70 leading-relaxed my-6"
        dangerouslySetInnerHTML={{ __html: boldify(block) }}
      />
    );
  });
}

function boldify(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
}

function ProjectSection({
  section,
  imageOffset,
  onImageClick,
}: {
  section: ArticleSection;
  imageOffset: number;
  onImageClick: (index: number) => void;
}) {
  switch (section.type) {
    case "text":
      return <div className="prose-section">{renderMarkdown(section.content ?? "")}</div>;
    case "quote":
      return (
        <blockquote className="my-8 pl-6 border-l-2 border-[#ef4242] relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[#ef4242]/3 -z-10 rounded-sm" />
          <p className="text-base text-white/80 italic leading-relaxed font-nord">
            &ldquo;{section.content}&rdquo;
          </p>
          {section.caption && (
            <cite className="text-[10px] text-white/30 not-italic mt-2 block">— {section.caption}</cite>
          )}
        </blockquote>
      );
    case "image":
      return section.src ? (
        <figure className="my-8">
          <div
            className="relative rounded-sm overflow-hidden border border-white/8 cursor-pointer group"
            onClick={() => onImageClick(imageOffset)}
          >
            <div className="relative w-full aspect-video">
              <Image
                src={section.src}
                alt={section.alt ?? ""}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
          </div>
          {section.caption && (
            <figcaption className="text-[10px] text-white/30 text-center mt-2">{section.caption}</figcaption>
          )}
        </figure>
      ) : null;
    case "gallery":
      return (
        <div className="my-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(section.images ?? []).map((image, i) => {
              const src = imageAssetSrc(image);
              if (!src) return null;

              return (
                <div
                  key={i}
                  className="relative aspect-square rounded-sm overflow-hidden border border-white/8 cursor-pointer group"
                  onClick={() => onImageClick(imageOffset + i)}
                >
                  <Image
                    src={src}
                    alt={imageAssetAlt(image, `Gallery image ${i + 1}`)}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                </div>
              );
            })}
          </div>
          {section.caption && (
            <p className="text-[10px] text-white/30 text-center mt-3">{section.caption}</p>
          )}
        </div>
      );
    case "video":
      return (
        <div className="my-8">
          <div className="relative rounded-sm overflow-hidden border border-white/8 aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${section.youtubeId}`}
              title={section.caption ?? "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
          {section.caption && (
            <p className="text-[10px] text-white/30 text-center mt-2">{section.caption}</p>
          )}
        </div>
      );
    case "code":
      return (
        <pre className="my-8 rounded-sm border border-white/8 bg-white/3 p-6 overflow-x-auto">
          <code className="text-xs text-emerald-400 leading-relaxed">{section.content}</code>
        </pre>
      );
    case "divider":
      return (
        <div className="my-10 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/8" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#ef4242]" />
          <div className="flex-1 h-px bg-white/8" />
        </div>
      );
    default:
      return null;
  }
}
