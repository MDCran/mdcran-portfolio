"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import type { Article, ArticleCategory } from "@/lib/types";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ArticlesPage() {
  const { data: apiArticles = [] } = useSWR<Article[]>("/api/data/articles", fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
  });
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

  return (
    <>
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
                Articles & Writing
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-nord text-4xl md:text-6xl text-white tracking-wider mb-4"
              style={{ textShadow: "0 0 40px rgba(239,66,66,0.2)" }}
            >
              Articles
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-sm text-white/40 max-w-xl"
            >
              Recipes, tech deep-dives, personal stories, and press. {allArticles.length} article{allArticles.length !== 1 ? "s" : ""} and counting.
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
                    {featured.coverImage && (
                      <div className="lg:col-span-2 relative h-56 lg:h-auto overflow-hidden">
                        <Image
                          src={featured.coverImage}
                          alt={featured.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]/80 lg:bg-gradient-to-r" />
                      </div>
                    )}
                    <div className={`p-6 sm:p-8 flex flex-col justify-center ${featured.coverImage ? "lg:col-span-3" : "lg:col-span-5"}`}>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[9px] tracking-widest uppercase mb-4 self-start ${CATEGORY_COLORS[featured.category]}`}>
                        {featured.category}
                      </div>
                      <h2 className="font-nord text-2xl md:text-3xl text-white tracking-wider mb-3 group-hover:text-[#ef4242] transition-colors duration-300">
                        {featured.title}
                      </h2>
                      <p className="text-sm text-white/50 leading-relaxed mb-6">{featured.excerpt}</p>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-white/30">{featured.author}</span>
                        <span className="text-white/15">·</span>
                        <span className="text-[10px] text-white/30">{formatDate(featured.publishDate)}</span>
                      </div>
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
              <div className="flex flex-wrap gap-2 flex-1">
                {availableCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 text-[10px] tracking-widest uppercase rounded-sm transition-all duration-200 font-nord ${
                      activeCategory === cat.id
                        ? "bg-[#ef4242] text-white shadow-[0_0_16px_rgba(239,66,66,0.4)]"
                        : "border border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
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
              {filtered.length === 0 ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((article, i) => (
                    <motion.div
                      key={article.id}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                    >
                      <Link href={`/articles/${article.slug}`} className="group block h-full">
                        <div className="relative rounded-sm border border-white/8 bg-white/3 backdrop-blur-xl overflow-hidden hover:border-[#ef4242]/30 hover:bg-white/5 transition-all duration-300 h-full flex flex-col">
                          {article.coverImage ? (
                            <div className="relative h-44 overflow-hidden">
                              <Image
                                src={article.coverImage}
                                alt={article.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent" />
                            </div>
                          ) : (
                            <div className="h-32 bg-gradient-to-br from-[#ef4242]/10 to-transparent flex items-center px-6">
                              <div className={`text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-sm border ${CATEGORY_COLORS[article.category]}`}>
                                {article.category}
                              </div>
                            </div>
                          )}

                          <div className="p-6 flex flex-col flex-1">
                            {article.coverImage && (
                              <div className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[9px] tracking-widest uppercase mb-3 self-start ${CATEGORY_COLORS[article.category]}`}>
                                {article.category}
                              </div>
                            )}

                            <h3 className="font-nord text-base text-white tracking-wider mb-2 group-hover:text-[#ef4242] transition-colors duration-300 leading-snug">
                              {article.title}
                            </h3>

                            <p className="text-xs text-white/40 leading-relaxed mb-4 flex-1 line-clamp-3">
                              {article.excerpt}
                            </p>

                            <div className="flex items-center justify-between border-t border-white/6 pt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-white/25">{formatDate(article.publishDate)}</span>
                              </div>
                              <span className="inline-flex items-center justify-center h-8 min-w-[72px] px-3 border border-white/12 text-[11px] tracking-wider rounded-sm opacity-0 group-hover:opacity-100 group-hover:border-[rgba(239,66,66,0.35)] group-hover:text-[#ef4242] text-white/40 transition-all duration-200">
                                Read
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {article.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="text-[9px] text-white/20 bg-white/4 px-1.5 py-0.5 rounded-sm">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
