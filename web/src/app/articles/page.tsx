"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import ArticleCard from "@/components/shared/ArticleCard";
import AuthorByline from "@/components/shared/AuthorByline";
import { articleReadMinutes } from "@/lib/read-time";
import type { Article, ArticleCategory, SiteContent } from "@/lib/types";
import { imageAssetAlt, imageAssetSrc, shouldBypassImageOptimization } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  personal: "Personal",
  tech: "Tech",
  recipe: "Recipe",
  press: "Press",
  tutorial: "Tutorial",
  announcement: "Announcement",
};

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  press: "text-sky-400 border-sky-400/30 bg-sky-400/8",
  recipe: "text-amber-400 border-amber-400/30 bg-amber-400/8",
  tech: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8",
  personal: "text-purple-400 border-purple-400/30 bg-purple-400/8",
  tutorial: "text-[#ef4242] border-[#ef4242]/30 bg-[#ef4242]/8",
  announcement: "text-orange-400 border-orange-400/30 bg-orange-400/8",
};

export default function ArticlesPage() {
  const { data: apiArticles = [], isLoading } = useSWR<Article[]>("/api/data/articles", fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
  });
  const { data: siteContent } = useSWR<SiteContent>("/api/data/site-content", fetcher, {
    revalidateOnFocus: false,
  });
  const header = siteContent?.pageHeaders?.articles;
  const allArticles = useMemo(
    () =>
      [...apiArticles].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      ),
    [apiArticles]
  );

  const [activeCategory, setActiveCategory] = useState<ArticleCategory | "all">("all");
  const [search, setSearch] = useState("");

  const availableCategories = useMemo(() => {
    const categories = new Set<ArticleCategory>();
    for (const article of allArticles) {
      categories.add(article.category);
    }

    return [
      { id: "all" as const, label: "All" },
      ...Array.from(categories)
        .sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b]))
        .map((category) => ({
          id: category,
          label: CATEGORY_LABELS[category],
        })),
    ];
  }, [allArticles]);

  // Sliding-pill highlight for the category toggle.
  const catRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [catHighlight, setCatHighlight] = useState({ left: 0, width: 0, ready: false });
  useEffect(() => {
    const sync = () => {
      const idx = availableCategories.findIndex((c) => c.id === activeCategory);
      const btn = catRefs.current[idx];
      if (btn) setCatHighlight({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", sync); };
  }, [activeCategory, availableCategories]);

  const filtered = useMemo(() => {
    let list = allArticles;
    if (activeCategory !== "all") list = list.filter((article) => article.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (article) =>
          article.title.toLowerCase().includes(q) ||
          article.excerpt.toLowerCase().includes(q) ||
          article.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, allArticles, search]);

  const featured = allArticles.find((article) => article.featured);
  const featuredCoverSrc = featured ? imageAssetSrc(featured.coverImage) : undefined;
  const featuredCoverUnoptimized = shouldBypassImageOptimization(featuredCoverSrc);

  return (
    <>
      <ClientPageTitle title={header?.title ?? "Articles"} />
      <Navbar />
      <main className="min-h-screen">
        <section className="pt-28 sm:pt-32 pb-16 border-b border-white/6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-[#ef4242] opacity-4 rounded-full blur-[100px]" />
          </div>
          <div className="content-container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="h-px w-8 bg-[#ef4242]" />
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ef4242]">
                {header?.eyebrow ?? "Articles & Writing"}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-nord text-4xl md:text-6xl text-white tracking-wider mb-4"
              style={{ textShadow: "0 0 40px rgba(239,66,66,0.2)" }}
            >
              {header?.title ?? "Articles"}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-white/40 max-w-xl"
            >
              {(header?.description ?? "A collection of recipes, technical articles, and personal stories.")}
              <span className="block mt-1">{allArticles.length} and counting.</span>
            </motion.p>
          </div>
        </section>

        {featured && (
          <section className="py-12 border-b border-white/6">
            <div className="content-container">
              <div className="text-[9px] tracking-[0.3em] uppercase text-white/30 mb-4">Featured</div>
              <Link href={`/articles/${featured.slug}`} className="group block">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl overflow-hidden hover:border-[#ef4242]/30 transition-all duration-300"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-5">
                    {featuredCoverSrc && (
                      <div className="lg:col-span-2 relative h-56 lg:h-auto overflow-hidden">
                        <Image
                          src={featuredCoverSrc}
                          alt={imageAssetAlt(featured.coverImage, featured.title)}
                          fill
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          unoptimized={featuredCoverUnoptimized}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]/80 lg:bg-gradient-to-r" />
                      </div>
                    )}
                    <div className={`p-6 sm:p-8 flex flex-col justify-center ${featuredCoverSrc ? "lg:col-span-3" : "lg:col-span-5"}`}>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[9px] tracking-widest uppercase mb-4 self-start ${CATEGORY_COLORS[featured.category]}`}>
                        {featured.category}
                      </div>
                      <h2 className="font-nord text-2xl md:text-3xl text-white tracking-wider mb-3 group-hover:text-[#ef4242] transition-colors duration-300">
                        {featured.title}
                      </h2>
                      <p className="text-sm text-white/50 leading-relaxed mb-6">{featured.excerpt}</p>
                      <AuthorByline date={featured.publishDate} minutes={articleReadMinutes(featured)} size="md" />
                      <div className="flex flex-wrap gap-2 mt-4">
                        {featured.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[9px] text-white/25 bg-white/4 px-2 py-0.5 rounded-sm">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242]/60 via-[#ef4242]/20 to-transparent" />
                </motion.div>
              </Link>
            </div>
          </section>
        )}

        <section className="py-8 border-b border-white/6 sticky top-[var(--navbar-height)] z-20 bg-[#0a0a0a]/90 backdrop-blur-xl">
          <div className="content-container flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 overflow-x-auto">
                <div
                  className="relative inline-flex gap-1 p-1 rounded-sm border border-white/8 bg-white/3 select-none"
                  style={{ touchAction: "pan-y" }}
                  onPointerDown={(e) => { (e.currentTarget as HTMLElement).dataset.dragging = "1"; }}
                  onPointerMove={(e) => {
                    if ((e.currentTarget as HTMLElement).dataset.dragging !== "1") return;
                    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                    const id = el?.closest<HTMLButtonElement>("[data-cat]")?.dataset.cat;
                    if (id && id !== activeCategory) setActiveCategory(id as ArticleCategory | "all");
                  }}
                  onPointerUp={(e) => { delete (e.currentTarget as HTMLElement).dataset.dragging; }}
                  onPointerCancel={(e) => { delete (e.currentTarget as HTMLElement).dataset.dragging; }}
                >
                  <div
                    className={`pointer-events-none absolute inset-y-1 rounded-sm bg-[#ef4242] shadow-[0_0_14px_rgba(239,66,66,0.35)] transition-all duration-300 ease-out ${catHighlight.ready ? "opacity-100" : "opacity-0"}`}
                    style={{ left: `${catHighlight.left}px`, width: `${catHighlight.width}px` }}
                  />
                  {availableCategories.map((cat, i) => (
                    <button
                      key={cat.id}
                      data-cat={cat.id}
                      ref={(node) => { catRefs.current[i] = node; }}
                      onClick={() => setActiveCategory(cat.id)}
                      className="relative z-10 px-3 py-1.5 text-[10px] tracking-widest uppercase rounded-sm transition-colors duration-200 font-nord whitespace-nowrap cursor-pointer"
                      style={{ color: activeCategory === cat.id ? "var(--on-accent, #fff)" : "color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)" }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full h-9 bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm pl-3 pr-4 text-white text-xs placeholder:text-white/20 outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="content-container">
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-24 text-white/30 text-sm animate-pulse"
                >
                  Loading articles...
                </motion.div>
              ) : filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-24 text-white/20 text-sm"
                >
                  No articles found.
                </motion.div>
              ) : (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((article, i) => (
                    <ArticleCard key={article.id} article={article} index={i} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
