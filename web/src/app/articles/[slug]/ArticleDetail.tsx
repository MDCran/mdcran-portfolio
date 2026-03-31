"use client";

import { useState, useCallback, useEffect } from "react";
import { cn, imageAssetAlt, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";
import BeforeAfterSlider from "@/components/shared/BeforeAfterSlider";
import SmartImage from "@/components/shared/SmartImage";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Link2, Check, Share2, ArrowLeft } from "lucide-react";
import type { Article, ArticleSection, ArticleCategory } from "@/lib/types";
import Lightbox from "@/components/shared/Lightbox";

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  press: "text-sky-400 border-sky-400/30 bg-sky-400/8",
  recipe: "text-amber-400 border-amber-400/30 bg-amber-400/8",
  tech: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8",
  personal: "text-purple-400 border-purple-400/30 bg-purple-400/8",
  tutorial: "text-[#ef4242] border-[#ef4242]/30 bg-[#ef4242]/8",
  announcement: "text-orange-400 border-orange-400/30 bg-orange-400/8",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ── Markdown-lite renderer ─────────────────────────────── */
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
      const items = block.split("\n").filter((l) => l.startsWith("- "));
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
    if (/^\d+\. /.test(block) || block.includes("\n1. ")) {
      const items = block.split("\n").filter((l) => /^\d+\. /.test(l));
      return (
        <ol key={blockIdx} className="space-y-2 my-4 pl-4">
          {items.map((item, i) => {
            const itemText = item.replace(/^\d+\. /, "");
            return (
              <li key={i} className="text-[15px] text-white/65 leading-relaxed flex items-start gap-3">
                <span className="mt-0.5 w-5 shrink-0 text-right font-nord text-xs text-[#ef4242]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1" dangerouslySetInnerHTML={{ __html: boldify(itemText) }} />
              </li>
            );
          })}
        </ol>
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

/* ── Article Section Renderer ───────────────────────────── */
interface SectionProps {
  section: ArticleSection;
  imageOffset: number;
  onImageClick: (globalIndex: number) => void;
}

function InteractiveChecklist({
  items,
  numbered = false,
}: {
  items: string[];
  numbered?: boolean;
}) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <button
          key={`${item}-${i}`}
          type="button"
          onClick={() => setDone((prev) => prev.map((value, idx) => (idx === i ? !value : value)))}
          className={cn(
            "flex w-full items-start gap-3 rounded-sm border px-3 py-2.5 text-left transition-colors",
            done[i]
              ? "border-[#ef4242]/30 bg-[#ef4242]/8 text-white/75"
              : "border-white/8 bg-white/3 text-white/60 hover:border-white/15 hover:text-white/75"
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-[10px] font-nord",
              done[i]
                ? "border-[#ef4242]/40 bg-[#ef4242] text-white"
                : "border-white/15 bg-white/4 text-white/40"
            )}
          >
            {numbered ? i + 1 : done[i] ? <Check size={11} /> : ""}
          </div>
          <span
            className={cn("min-w-0 flex-1 text-sm leading-relaxed", done[i] && "line-through text-white/35")}
            dangerouslySetInnerHTML={{ __html: boldify(item) }}
          />
        </button>
      ))}
    </div>
  );
}

function Section({ section, imageOffset, onImageClick }: SectionProps) {
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

    case "image": {
      const resolvedSrc = imageAssetSrc(section.src);
      if (!resolvedSrc) return null;
      return (
        <SmartImage
          src={resolvedSrc}
          alt={section.alt ?? ""}
          caption={section.caption}
          onClick={() => onImageClick(imageOffset)}
        />
      );
    }

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={imageAssetAlt(image, `Gallery image ${i + 1}`)}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    </div>
                  </div>
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

    case "checklist":
      return (
        <div className="my-6 rounded-sm border border-white/8 bg-white/2 p-5">
          {section.caption && (
            <p className="text-xs font-nord tracking-wider text-white/70 mb-4 uppercase">{section.caption}</p>
          )}
          <InteractiveChecklist items={section.items ?? []} />
        </div>
      );

    case "ingredient-list":
      return (
        <div className="my-6 rounded-sm border border-amber-400/15 bg-amber-400/4 p-5">
          {section.caption && (
            <p className="text-xs font-nord tracking-wider text-amber-400/70 mb-4 uppercase">{section.caption}</p>
          )}
          <ul className="space-y-2.5">
            {(section.items ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                <span className="text-amber-400 mt-1 text-[10px] shrink-0">◆</span>
                <span dangerouslySetInnerHTML={{ __html: boldify(item) }} />
              </li>
            ))}
          </ul>
        </div>
      );

    case "steps":
      return (
        <div className="my-6 space-y-4">
          {section.caption && (
            <p className="text-xs font-nord tracking-wider text-white/50 uppercase mb-2">{section.caption}</p>
          )}
          <InteractiveChecklist items={section.items ?? []} numbered />
        </div>
      );

    case "store-checklist":
      return (
        <div className="my-6 rounded-sm border border-white/8 bg-white/2 p-5">
          {section.caption && (
            <p className="text-xs font-nord tracking-wider text-white/70 mb-4 uppercase">{section.caption}</p>
          )}
          <InteractiveChecklist items={section.items ?? []} />
        </div>
      );

    case "info-block":
      return (
        <div className="my-6 rounded-sm border border-[#ef4242]/20 bg-[#ef4242]/5 p-5 flex gap-4">
          <div className="text-lg shrink-0 select-none">ℹ️</div>
          <div>
            {section.caption && (
              <p className="text-xs font-nord tracking-wider text-[#ef4242] mb-1 uppercase">{section.caption}</p>
            )}
            <p className="text-[13px] text-white/60 leading-relaxed">
              {section.label && section.value
                ? `${section.label}: ${section.value}`
                : section.value ?? section.content}
            </p>
          </div>
        </div>
      );

    case "before-after": {
      const bSrc = imageAssetSrc(section.beforeImage);
      const aSrc = imageAssetSrc(section.afterImage);
      if (!bSrc || !aSrc) return null;
      return (
        <BeforeAfterSlider
          beforeSrc={bSrc}
          afterSrc={aSrc}
          beforeAlt={typeof section.beforeImage === "object" && section.beforeImage?.alt ? section.beforeImage.alt : "Before"}
          afterAlt={typeof section.afterImage === "object" && section.afterImage?.alt ? section.afterImage.alt : "After"}
          caption={section.caption}
        />
      );
    }

    case "button": {
      if (!section.label || !section.content) return null;
      return (
        <div className="flex flex-col items-center gap-2 py-4">
          <a
            href={section.content}
            target={section.content.startsWith("http") ? "_blank" : undefined}
            rel={section.content.startsWith("http") ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 h-11 px-7 bg-[#ef4242] text-white text-sm tracking-wider uppercase rounded-sm hover:bg-[#dd3030] transition-colors duration-200 shadow-[0_0_20px_rgba(239,66,66,0.3)]"
          >
            {section.label}
          </a>
          {section.caption && (
            <p className="text-xs text-white/35 text-center">{section.caption}</p>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

/* ── Taps Button ────────────────────────────────────────── */
function TapsButton({ articleId }: { articleId: string }) {
  const dailyLimit = 10;
  const [count, setCount] = useState(0);
  const [dailyTapCount, setDailyTapCount] = useState(() => {
    if (typeof window === "undefined") return 0;

    const storageKey = `article_taps_${articleId}`;
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
    fetch(`/api/taps?id=${articleId}&type=article`)
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [articleId, dailyLimit]);

  const handleTap = useCallback(async () => {
    if (loading || dailyTapCount >= dailyLimit) return;

    const storageKey = `article_taps_${articleId}`;
    const today = new Date().toISOString().slice(0, 10);
    const nextDailyCount = Math.min(dailyTapCount + 1, dailyLimit);

    setBurst(true);
    setTimeout(() => setBurst(false), 600);
    setCount((c) => c + 1);
    setDailyTapCount(nextDailyCount);

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ date: today, count: nextDailyCount })
      );
    } catch {}

    await fetch('/api/taps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: articleId, type: 'article' }),
    }).catch(() => {});
  }, [articleId, dailyLimit, dailyTapCount, loading]);

  const canTap = !loading && dailyTapCount < dailyLimit;

  return (
    <div className="flex flex-col items-start gap-2">
      <motion.button
        onClick={handleTap}
        disabled={!canTap}
        whileTap={{ scale: 0.92 }}
        data-taps-btn
        className="relative flex items-center gap-2 px-4 py-2 rounded-sm border border-white/12 bg-white/4 text-white/50 transition-all duration-300 hover:border-[#ef4242]/30 hover:bg-[#ef4242]/5 hover:text-[#ef4242] disabled:cursor-not-allowed disabled:opacity-60 overflow-visible"
        title={loading ? "Loading taps" : "Tap to appreciate this article"}
      >
        {/* Sparkle stars */}
        <AnimatePresence>
          {burst &&
            Array.from({ length: 8 }, (_, i) => {
              const angle = (i / 8) * 360;
              const dist = 20 + Math.random() * 12;
              return (
                <motion.div
                  key={`star-${i}`}
                  className="absolute pointer-events-none"
                  style={{ color: i % 2 === 0 ? "#ef4242" : "#fbbf24" }}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1.3, 0],
                    x: Math.cos((angle * Math.PI) / 180) * dist,
                    y: Math.sin((angle * Math.PI) / 180) * dist,
                    opacity: [1, 1, 0],
                  }}
                  transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
                >
                  <svg width="6" height="6" viewBox="0 0 10 10"><path d="M5 0L6.2 3.8L10 5L6.2 6.2L5 10L3.8 6.2L0 5L3.8 3.8Z" fill="currentColor"/></svg>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* Glow pulse */}
        <AnimatePresence>
          {burst && (
            <motion.div
              className="absolute inset-0 rounded-sm"
              style={{ boxShadow: "0 0 16px #ef4242" }}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        <motion.span
          animate={burst ? { scale: [1, 1.4, 0.9, 1.1, 1] } : {}}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="leading-none"
          style={{ color: burst ? "#ef4242" : undefined }}
        >
          <Heart size={12} className={burst ? 'fill-current' : ''} />
        </motion.span>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={count}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-xs tracking-wider"
          >
            {loading ? "-" : `${count} ${count === 1 ? "tap" : "taps"}`}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {!loading && !canTap && (
        <span className="text-[10px] tracking-wider" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}>
          Daily limit reached. Resets tomorrow.
        </span>
      )}
    </div>
  );
}
/* ── Share Buttons ──────────────────────────────────────── */
function ShareButtons() {
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

/* ── Main Component ─────────────────────────────────────── */
export default function ArticleDetail({ article }: { article: Article }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const coverSrc = imageAssetSrc(article.coverImage);
  const coverUnoptimized = shouldBypassImageOptimization(coverSrc);

  // Collect ALL images across sections into one flat array for the shared Lightbox.
  // Track each section's starting offset so clicking any image resolves to a global index.
  const allImages: string[] = [];
  const allImageCaptions: string[] = [];
  const sectionImageOffsets: number[] = [];
  for (const section of article.sections) {
    sectionImageOffsets.push(allImages.length);
    if (section.type === "image" && section.src) {
      const resolved = imageAssetSrc(section.src);
      if (resolved) allImages.push(resolved);
      allImageCaptions.push(section.alt?.trim() || section.caption?.trim() || article.title);
    } else if (section.type === "gallery") {
      for (const image of section.images ?? []) {
        const src = imageAssetSrc(image);
        if (!src) continue;
        allImages.push(src);
        allImageCaptions.push(imageAssetAlt(image, section.caption?.trim() || article.title));
      }
    }
  }

  const authorPic = imageAssetSrc(article.authorProfilePic) ?? "/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png";

  return (
    <main className="min-h-screen">

      {/* ── Hero ── */}
      <section className="pt-24 pb-0 relative overflow-hidden">
        {coverSrc ? (
          <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
            <Image
              src={coverSrc}
              alt={imageAssetAlt(article.coverImage, article.title)}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              unoptimized={coverUnoptimized}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-bg,#0a0a0a)] via-[var(--theme-bg,#0a0a0a)]/50 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-b from-[#ef4242]/4 to-transparent" />
        )}

        <div className={cn("max-w-3xl mx-auto px-4 sm:px-8 relative z-10", coverSrc ? "-mt-24" : "mt-8")}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6 text-[10px] text-white/30 tracking-wider">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link href="/articles" className="hover:text-white transition-colors">Articles</Link>
              <span>/</span>
              <span className="text-white/50 truncate max-w-[200px]">{article.title}</span>
            </div>

            {/* Category */}
            <div className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[9px] tracking-widest uppercase mb-4 ${CATEGORY_COLORS[article.category]}`}>
              {article.category}
            </div>

            {/* Title */}
            <h1
              className="font-nord text-3xl md:text-5xl text-white tracking-wider mb-5 leading-tight"
              style={{ textShadow: "0 0 40px rgba(239,66,66,0.15)" }}
            >
              {article.title}
            </h1>

            {/* Excerpt */}
            <p className="text-base text-white/60 leading-relaxed mb-6">{article.excerpt}</p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="relative w-7 h-7 rounded-full overflow-hidden bg-[#ef4242] border border-white/10 shrink-0">
                  <Image
                    src={authorPic}
                    alt={article.author}
                    fill
                    className="object-cover"
                    sizes="28px"
                    onError={(e) => {
                      // Fallback: hide image so bg shows through
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <div className="text-xs text-white">{article.author}</div>
                  <div className="text-[9px] text-white/30">{formatDate(article.publishDate)}</div>
                </div>
              </div>
              {article.updatedDate && (
                <span className="text-[10px] text-white/25">Updated {formatDate(article.updatedDate)}</span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Content ── */}
      <article
        className="max-w-3xl mx-auto px-4 sm:px-8 py-16"
      >
        {article.sections.map((section, i) => (
          <div
            key={i}
            className={section.type === "image" || section.type === "before-after" ? "inline" : "block"}
            data-highlight-id={`${section.type}${section.caption ? "--" + section.caption.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") : ""}`}
          >
          <Section
            section={section}
            imageOffset={sectionImageOffsets[i]}
            onImageClick={setLightboxIndex}
          />
          </div>
        ))}
      </article>

      {/* ── Tags ── */}
      {article.tags.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pb-8">
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-white/30 bg-white/4 border border-white/8 px-2.5 py-1 rounded-sm hover:text-white/60 transition-colors cursor-default"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Taps + Share ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-8 py-8 border-t border-white/8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] tracking-widest uppercase mb-3" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}>Appreciate this article</p>
            <TapsButton articleId={article.id} />
          </div>
          <div>
            <p className="text-[10px] tracking-widest uppercase mb-3" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}>Share</p>
            <ShareButtons />
          </div>
        </div>
      </section>

      {/* ── Back link ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pb-20">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase text-white/30 hover:text-[#ef4242] transition-colors duration-200"
        >
          <ArrowLeft size={12} /> Back to Articles
        </Link>
      </div>

      {/* ── Global Lightbox ── */}
      <Lightbox
        images={allImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        captions={allImageCaptions}
      />

    </main>
  );
}
