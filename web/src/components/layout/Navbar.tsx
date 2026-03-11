"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { assetUrl } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Menu, ChevronDown } from "lucide-react";
import { cn, projectUrl, imageAssetSrc } from "@/lib/utils";
import type { Project, Client, Article, SiteContent } from "@/lib/types";

const navLinks = [
  {
    label: "Arts & Entertainment",
    href: "/arts-and-entertainment",
    children: [
      { label: "Minecraft Maps", href: "/arts-and-entertainment/minecraft-maps" },
      { label: "Events", href: "/arts-and-entertainment/events" },
    ],
  },
  {
    label: "Motion & Graphics",
    href: "/motion-and-graphics",
    children: [
      { label: "Thumbnail Design", href: "/motion-and-graphics/thumbnail-design" },
      { label: "Video Editing", href: "/motion-and-graphics/video-editing" },
      { label: "Web Dev & Design", href: "/motion-and-graphics/web-dev-design" },
    ],
  },
  { label: "Code", href: "/code" },
  { label: "Articles", href: "/articles" },
];

interface SearchablePage {
  title: string;
  href: string;
  keywords: string[];
}

const SEARCHABLE_PAGES: SearchablePage[] = [
  { title: "Visitor Map", href: "/visitor-map", keywords: ["visitor", "map", "globe", "traffic", "analytics"] },
  { title: "Status", href: "/status", keywords: ["status", "uptime", "incident", "outage", "health"] },
  { title: "Resume", href: "/resume", keywords: ["resume", "cv", "experience", "work", "education", "skills"] },
  { title: "Contact", href: "/contact", keywords: ["contact", "email", "message", "hire"] },
  { title: "Terminal", href: "/terminal", keywords: ["terminal", "cli", "command", "shell", "crt"] },
  { title: "CoreTV", href: "/coretv", keywords: ["coretv", "investor", "core", "tv", "streaming"] },
  { title: "Terms of Service", href: "/terms", keywords: ["terms", "tos", "legal", "service"] },
  { title: "Privacy Policy", href: "/privacy", keywords: ["privacy", "policy", "data", "legal"] },
  { title: "Unsubscribe", href: "/unsubscribe", keywords: ["unsubscribe", "opt-out", "email", "sms", "notifications"] },
];

interface SearchResults {
  projects: Project[];
  clients: Client[];
  articles: Article[];
}

export default function Navbar({ opaque }: { opaque?: boolean } = {}) {
  const pathname = usePathname();
  const [brandLogoUrl, setBrandLogoUrl] = useState("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png");
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<SearchResults>({ projects: [], clients: [], articles: [] });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function isNavActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isChildNavActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [searchOpen]);

  useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("mdcran:open-search", openSearch);
    return () => window.removeEventListener("mdcran:open-search", openSearch);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/data/site-content")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SiteContent | null) => {
        if (!cancelled && data?.brandLogoUrl) {
          setBrandLogoUrl(data.brandLogoUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!searchOpen || catalog.projects.length || catalog.clients.length || catalog.articles.length) {
      return;
    }

    let cancelled = false;

    Promise.all([
      fetch("/api/data/projects").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/data/clients").then((res) => (res.ok ? res.json() : [])),
      fetch("/api/data/articles").then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([projects, clients, articles]) => {
        if (!cancelled) {
          setCatalog({ projects, clients, articles });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog({ projects: [], clients: [], articles: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchOpen, catalog]);

  const results = useMemo(() => {
    if (query.trim().length <= 1) {
      return { projects: [], clients: [], articles: [], pages: [] as SearchablePage[] };
    }

    const q = query.toLowerCase();
    const projects = catalog.projects.filter(
      (project) =>
        project.title.toLowerCase().includes(q) ||
        project.description?.toLowerCase().includes(q) ||
        project.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
        project.subcategory?.includes(q)
    );
    const clients = catalog.clients.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        client.roles.some((role) => role.toLowerCase().includes(q)) ||
        client.bio?.toLowerCase().includes(q)
    );
    const articles = catalog.articles.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.excerpt.toLowerCase().includes(q) ||
        article.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        article.category.includes(q)
    );
    const pages = SEARCHABLE_PAGES.filter(
      (page) =>
        page.title.toLowerCase().includes(q) ||
        page.keywords.some((kw) => kw.includes(q))
    );

    return { projects, clients, articles, pages };
  }, [catalog, query]);

  const totalResults = results.projects.length + results.clients.length + results.articles.length + results.pages.length;

  return (
    <>
      {/* Scan line decoration */}
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--cranberry)] to-transparent z-[70] opacity-60" />

      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        data-scrolled={scrolled || mobileOpen || opaque ? "" : undefined}
        className={cn(
          "fixed top-0 left-0 right-0 z-[60] transition-all duration-300 border-b",
          mobileOpen
            ? "bg-black/92 backdrop-blur-xl border-transparent"
            : scrolled
            ? "bg-black/85 backdrop-blur-xl border-white/10"
            : opaque
            ? "bg-black/40 backdrop-blur-md border-white/5"
            : "bg-transparent border-transparent"
        )}
      >
        {/* Single row — logo left · nav absolute-center · actions right */}
        <div className="relative content-container h-[4.5rem] flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link
            href="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 group shrink-0 z-10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(brandLogoUrl)}
              alt="MDCran"
              style={{ height: "36px", width: "auto" }}
              className="opacity-90 group-hover:opacity-100 transition-opacity duration-200 rounded-sm"
            />
            <span className="font-nord text-sm tracking-[0.18em] text-white/85 group-hover:text-white transition-colors duration-200">
              <span>MD</span>
              <span className="text-[var(--cranberry)]">CRAN</span>
            </span>
          </Link>

          {/* ── Desktop nav — absolutely centered ── */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0">
            {navLinks.map((link) =>
              link.children ? (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(link.href)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 text-[11px] tracking-widest uppercase whitespace-nowrap transition-colors duration-200 rounded-sm",
                      isNavActive(link.href)
                        ? "text-[var(--cranberry)]"
                        : "text-white/55 hover:text-white"
                    )}
                  >
                    {link.label}
                    <ChevronDown
                      size={11}
                      className={cn(
                        "transition-transform duration-200",
                        activeDropdown === link.href ? "rotate-180" : ""
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {activeDropdown === link.href && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-1 w-56 bg-black/80 border border-white/15 backdrop-blur-xl rounded-sm overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
                      >
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "block px-5 py-3 text-[11px] tracking-widest uppercase transition-all duration-150 border-b border-white/7 last:border-0",
                              isChildNavActive(child.href)
                                ? "text-[var(--cranberry)] bg-white/6"
                                : "text-white/55 hover:text-white hover:bg-white/6"
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 text-[11px] tracking-widest uppercase whitespace-nowrap transition-colors duration-200 rounded-sm",
                    isNavActive(link.href)
                      ? "text-[var(--cranberry)]"
                      : "text-white/55 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 z-10 shrink-0">
            {/* GitHub */}
            <a
              href="https://github.com/mdcran"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-sm text-white/45 hover:text-white hover:bg-white/6 transition-all duration-200"
              aria-label="GitHub @mdcran"
              title="GitHub @mdcran"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>

            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-sm text-white/45 hover:text-white hover:bg-white/6 transition-all duration-200"
              aria-label="Search"
            >
              <Search size={15} />
            </button>

            <Link
              href="/contact"
              className="hidden sm:flex h-10 px-6 items-center text-[11px] tracking-widest uppercase font-medium bg-[var(--cranberry)] text-white rounded-sm hover:bg-[#dd3030] transition-colors duration-200 shadow-[0_0_20px_rgba(239,66,66,0.3)] hover:shadow-[0_0_30px_rgba(239,66,66,0.45)]"
            >
              Contact Me
            </Link>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-sm text-white/45 hover:text-white hover:bg-white/6 transition-all duration-200"
            >
              {mobileOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="px-4 sm:px-6 py-5 flex flex-col gap-1 max-h-[calc(100vh-4.5rem)] overflow-y-auto">
                {navLinks.map((link) => (
                  <React.Fragment key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "px-4 py-3 text-[11px] tracking-widest uppercase rounded-sm transition-all",
                        isNavActive(link.href)
                          ? "text-[var(--cranberry)] bg-white/5"
                          : "text-white/65 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {link.label}
                    </Link>
                    {link.children?.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "pl-8 pr-4 py-2.5 text-[10px] tracking-widest uppercase rounded-sm transition-all",
                          isChildNavActive(child.href)
                            ? "text-[var(--cranberry)] bg-white/5"
                            : "text-white/35 hover:text-white/65 hover:bg-white/5"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </React.Fragment>
                ))}
                <div className="pt-4 mt-2 border-t border-white/8">
                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center h-11 bg-[var(--cranberry)] text-white text-[11px] tracking-widest uppercase font-medium rounded-sm shadow-[0_0_20px_rgba(239,66,66,0.3)]"
                  >
                    Contact Me
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Search overlay ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-start justify-center px-3 pt-3 pb-4 sm:px-4 sm:pt-28 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSearchOpen(false);
                setQuery("");
              }
            }}
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="w-full max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-none flex flex-col"
            >
              {/* Input */}
              <div className="sticky top-0 z-10 pb-3 bg-gradient-to-b from-black/95 via-black/85 to-transparent">
                <div className="relative h-14 sm:h-16">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-white/30">
                    <Search size={15} />
                  </div>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search projects, articles, clients..."
                    className="h-full w-full rounded-sm border border-white/12 bg-[#0d0d0d] pl-11 pr-11 text-sm tracking-wide text-white outline-none transition-colors placeholder:text-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus:border-[var(--cranberry)] sm:pl-12 sm:pr-12 sm:text-base"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearchOpen(false);
                        setQuery("");
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/25 transition-colors hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Results */}
              <AnimatePresence>
                {query.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 bg-[#0d0d0d]/98 border border-white/10 rounded-sm overflow-hidden max-h-[calc(100dvh-8.5rem)] sm:max-h-[60vh] overflow-y-auto shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                  >
                    {totalResults === 0 ? (
                      <div className="px-6 py-8 text-center text-white/30 text-sm">
                        No results for &quot;{query}&quot;
                      </div>
                    ) : (
                      <>
                        {results.projects.length > 0 && (
                          <div>
                            <div className="px-5 py-2.5 text-[10px] tracking-widest uppercase text-[var(--cranberry)] border-b border-white/6 bg-white/2">
                              Projects
                            </div>
                            {results.projects.map((p) => {
                              const thumb = imageAssetSrc(p.coverImage ?? p.images?.[0]);
                              return (
                                <Link
                                  key={p.id}
                                  href={projectUrl(p.category, p.slug, p.subcategory)}
                                  onClick={() => { setSearchOpen(false); setQuery(""); }}
                                  className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group"
                                >
                                  {/* Thumbnail */}
                                  <div className="relative w-11 h-11 shrink-0 rounded-sm overflow-hidden bg-white/5">
                                    {thumb ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={thumb} alt={p.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <div className="w-3 h-3 bg-[var(--cranberry)] rotate-45 opacity-40" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/40" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-sm text-white group-hover:text-[var(--cranberry)] transition-colors truncate">{p.title}</div>
                                    <div className="text-xs text-white/35 capitalize mt-0.5">{p.category.replace(/-/g, " ")}</div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                        {results.clients.length > 0 && (
                          <div>
                            <div className="px-5 py-2.5 text-[10px] tracking-widest uppercase text-[var(--cranberry)] border-b border-white/6 bg-white/2">
                              Clients
                            </div>
                            {results.clients.map((c) => (
                              <Link
                                key={c.id}
                                href={`/clients/${c.id}`}
                                title={c.name}
                                onClick={() => { setSearchOpen(false); setQuery(""); }}
                                className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group"
                              >
                                {/* Avatar */}
                                <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-white/8 border border-white/10 group-hover:scale-110 transition-transform duration-200">
                                  {c.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/40 text-sm font-medium">
                                      {c.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-white group-hover:text-[var(--cranberry)] transition-colors truncate">{c.name}</div>
                                  <div className="text-xs text-white/35 mt-0.5 truncate">{c.roles.join(", ")}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {results.articles.length > 0 && (
                          <div>
                            <div className="px-5 py-2.5 text-[10px] tracking-widest uppercase text-[var(--cranberry)] border-b border-white/6 bg-white/2">
                              Articles
                            </div>
                            {results.articles.map((a) => (
                              <Link
                                key={a.id}
                                href={`/articles/${a.slug}`}
                                onClick={() => { setSearchOpen(false); setQuery(""); }}
                                className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group"
                              >
                                {/* Cover thumbnail */}
                                <div className="relative w-11 h-11 shrink-0 rounded-sm overflow-hidden bg-white/5">
                                  {imageAssetSrc(a.coverImage) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imageAssetSrc(a.coverImage)} alt={a.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <div className="w-3 h-3 bg-purple-400/40 rounded-sm" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/40" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-white group-hover:text-[var(--cranberry)] transition-colors truncate">{a.title}</div>
                                  <div className="text-xs text-white/35 capitalize mt-0.5">{a.category}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {results.pages.length > 0 && (
                          <div>
                            <div className="px-5 py-2.5 text-[10px] tracking-widest uppercase text-[var(--cranberry)] border-b border-white/6 bg-white/2">
                              Pages
                            </div>
                            {results.pages.map((page) => (
                              <Link
                                key={page.href}
                                href={page.href}
                                onClick={() => { setSearchOpen(false); setQuery(""); }}
                                className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group"
                              >
                                <div className="relative w-11 h-11 shrink-0 rounded-sm overflow-hidden bg-white/5 flex items-center justify-center">
                                  <div className="w-3 h-3 bg-[var(--cranberry)] rotate-45 opacity-40" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm text-white group-hover:text-[var(--cranberry)] transition-colors truncate">{page.title}</div>
                                  <div className="text-xs text-white/35 mt-0.5">{page.href}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-white/20 tracking-wider text-center pb-[max(env(safe-area-inset-bottom),0px)] sm:justify-start sm:text-left">
                <span>ESC to close</span>
                <span>↵ to navigate</span>
                <span className="hidden sm:ml-auto sm:inline">{totalResults > 0 ? `${totalResults} result${totalResults !== 1 ? "s" : ""}` : ""}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
