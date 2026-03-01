"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Music2, ExternalLink, Heart, Pause, X, ArrowLeft } from "lucide-react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import type { SpotifyTrack } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type FavoriteTrack = {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  url: string;
  accentColor: string;
};

type FavoriteSection = {
  title: string;
  items: FavoriteTrack[];
};

type FavoriteResponse = {
  sections: FavoriteSection[];
};

type SelectedFavoriteTrack = FavoriteTrack & {
  sectionTitle: string;
};

function SpotifyGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 fill-current"
      aria-hidden="true"
    >
      <path d="M12 1.5a10.5 10.5 0 1 0 10.5 10.5A10.512 10.512 0 0 0 12 1.5Zm4.817 15.148a.657.657 0 0 1-.905.217 10.936 10.936 0 0 0-5.706-1.43 15.67 15.67 0 0 0-3.477.43.657.657 0 1 1-.297-1.28 16.889 16.889 0 0 1 3.775-.466 12.236 12.236 0 0 1 6.385 1.628.657.657 0 0 1 .225.901Zm1.294-2.879a.82.82 0 0 1-1.13.271 13.517 13.517 0 0 0-6.937-1.758 19.084 19.084 0 0 0-3.955.496.82.82 0 0 1-.343-1.604 20.73 20.73 0 0 1 4.3-.531 14.919 14.919 0 0 1 7.779 1.998.82.82 0 0 1 .286 1.128Zm.112-2.998a16.317 16.317 0 0 0-8.226-2.064 23.43 23.43 0 0 0-4.324.483.985.985 0 0 1-.404-1.928 24.971 24.971 0 0 1 4.73-.527 17.987 17.987 0 0 1 9.216 2.341.985.985 0 1 1-.992 1.695Z" />
    </svg>
  );
}

function MarqueeText({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldScroll, setShouldScroll] = React.useState(false);

  React.useEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      setShouldScroll(content.scrollWidth > container.clientWidth + 4);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <div
        ref={contentRef}
        className={`${className} ${shouldScroll ? "inline-flex min-w-max animate-[spotify-marquee_8s_linear_infinite]" : "truncate"}`}
      >
        <span className="shrink-0">{text}</span>
        {shouldScroll ? <span className="shrink-0 px-6">{text}</span> : null}
      </div>
    </div>
  );
}

function formatMs(ms?: number) {
  if (!ms || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatLastHeard(playedAt?: string, nowMs?: number) {
  if (!playedAt || !nowMs) return "";

  const playedMs = new Date(playedAt).getTime();
  if (Number.isNaN(playedMs)) return "";

  const deltaSeconds = Math.max(0, Math.floor((nowMs - playedMs) / 1000));
  if (deltaSeconds < 60) return "Just now";

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

export default function SpotifyWidget() {
  const { data, isLoading } = useSWR<SpotifyTrack>("/api/spotify", fetcher, {
    refreshInterval: 5_000,
  });
  const { data: favoriteData } = useSWR<FavoriteResponse>("/api/spotify/favorites", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });
  const [displayProgressMs, setDisplayProgressMs] = React.useState(0);
  const [nowMs, setNowMs] = React.useState(0);
  const [showFavorites, setShowFavorites] = React.useState(false);
  const [favoritesPinned, setFavoritesPinned] = React.useState(false);
  const [selectedFavorite, setSelectedFavorite] = React.useState<SelectedFavoriteTrack | null>(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const lastSyncRef = React.useRef<number>(0);
  const closeFavoritesTimerRef = React.useRef<number | null>(null);

  const openFavorites = React.useCallback(() => {
    if (closeFavoritesTimerRef.current) {
      window.clearTimeout(closeFavoritesTimerRef.current);
      closeFavoritesTimerRef.current = null;
    }
    if (!favoritesPinned) {
      setSelectedFavorite(null);
    }
    setShowFavorites(true);
  }, [favoritesPinned]);

  const pinFavorites = React.useCallback(() => {
    if (closeFavoritesTimerRef.current) {
      window.clearTimeout(closeFavoritesTimerRef.current);
      closeFavoritesTimerRef.current = null;
    }
    setSelectedFavorite(null);
    setFavoritesPinned(true);
    setShowFavorites(true);
  }, []);

  const forceCloseFavorites = React.useCallback(() => {
    if (closeFavoritesTimerRef.current) {
      window.clearTimeout(closeFavoritesTimerRef.current);
      closeFavoritesTimerRef.current = null;
    }
    setFavoritesPinned(false);
    setShowFavorites(false);
    setSelectedFavorite(null);
  }, []);

  const closeFavorites = React.useCallback(() => {
    if (favoritesPinned) return;
    if (closeFavoritesTimerRef.current) {
      window.clearTimeout(closeFavoritesTimerRef.current);
    }
    closeFavoritesTimerRef.current = window.setTimeout(() => {
      setShowFavorites(false);
      closeFavoritesTimerRef.current = null;
    }, 120);
  }, [favoritesPinned]);

  React.useEffect(() => {
    setIsMounted(true);
    setNowMs(Date.now());
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    lastSyncRef.current = Date.now();
    setDisplayProgressMs(data?.progressMs ?? 0);
  }, [data?.progressMs, data?.title, data?.isPlaying, data?.durationMs]);

  React.useEffect(() => {
    if (!data?.isPlaying || !data?.durationMs) {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsedSinceSync = Date.now() - lastSyncRef.current;
      setDisplayProgressMs((data.progressMs ?? 0) + elapsedSinceSync);
    }, 250);

    return () => window.clearInterval(interval);
  }, [data?.isPlaying, data?.durationMs, data?.progressMs]);

  React.useEffect(() => {
    return () => {
      if (closeFavoritesTimerRef.current) {
        window.clearTimeout(closeFavoritesTimerRef.current);
      }
    };
  }, []);

  const clampedProgressMs = data?.durationMs
    ? Math.min(displayProgressMs, data.durationMs)
    : displayProgressMs;

  const progress =
    clampedProgressMs && data?.durationMs
      ? (clampedProgressMs / data.durationMs) * 100
      : 0;
  const lastHeard = !data?.isPlaying ? formatLastHeard(data?.playedAt, nowMs) : "";
  const isClickable = Boolean(data?.songUrl);
  const cardClassName = `relative overflow-hidden rounded-sm border border-white/8 bg-white/3 px-4 pb-4 pt-4 backdrop-blur-xl group transition-all duration-300 ${
    isClickable ? "hover:border-white/15 cursor-pointer" : "hover:border-white/15"
  }`;
  const openCurrentTrack = () => {
    if (!data?.songUrl) return;
    window.open(data.songUrl, "_blank", "noopener,noreferrer");
  };
  const activeFavoriteAccent = selectedFavorite?.accentColor ?? "#1db954";
  const activeFavoriteGlow = "#6ef7ff";
  const favoritesOverlay =
    isMounted && showFavorites && favoriteData?.sections?.length
      ? createPortal(
          <div className="fixed inset-0 z-50 pointer-events-none">
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-auto"
              onClick={forceCloseFavorites}
              aria-label="Close favorite music"
            />
            <div
              className="absolute left-1/2 top-1/2 max-h-[calc(100vh-3rem)] w-[min(1280px,96vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm bg-[#07110b]/95 pointer-events-auto"
              style={{
                border: `1px solid ${activeFavoriteAccent}2e`,
                background: `linear-gradient(180deg, rgba(4,12,9,0.96), rgba(4,12,9,0.97))`,
                boxShadow: `0 0 0 1px ${activeFavoriteAccent}12, 0 0 54px ${activeFavoriteAccent}14, inset 0 0 60px ${activeFavoriteAccent}0d`,
              }}
              onMouseEnter={openFavorites}
              onMouseLeave={closeFavorites}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="sticky top-0 z-10 bg-[#07110b]/95 px-6 py-5 backdrop-blur-xl"
                style={{
                  borderBottom: `1px solid ${activeFavoriteAccent}22`,
                  boxShadow: `inset 0 -1px 0 ${activeFavoriteAccent}10`,
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  {selectedFavorite ? (
                    <button
                      type="button"
                      onClick={() => setSelectedFavorite(null)}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border border-white/8 bg-white/[0.03] text-white/55 transition-colors hover:border-[#1db954]/25 hover:text-white"
                      aria-label="Back to favorites grid"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Heart size={15} className="text-[#1db954]" />
                      <p className="font-nord text-base text-white tracking-wider">My Favorite Music</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={forceCloseFavorites}
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border border-white/8 bg-white/[0.03] text-white/40 transition-colors hover:border-[#1db954]/25 hover:text-white"
                    aria-label="Close favorite music"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-hidden px-6 py-5 space-y-6">
                <AnimatePresence mode="wait">
                  {selectedFavorite ? (
                    <motion.div
                      key={`favorite-focus-${selectedFavorite.id}`}
                      initial={{ opacity: 0, scale: 0.88, filter: "blur(12px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 1.08, filter: "blur(10px)" }}
                      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                      className="relative flex min-h-[min(68vh,760px)] flex-col items-center justify-center overflow-hidden rounded-sm px-5 py-10 text-center"
                      style={{
                        border: `1px solid ${selectedFavorite.accentColor}38`,
                        background: `radial-gradient(circle at 50% 42%, ${selectedFavorite.accentColor}30 0%, ${activeFavoriteGlow}12 16%, ${selectedFavorite.accentColor}14 24%, rgba(7,17,11,0.95) 48%, rgba(3,8,5,0.99) 100%)`,
                        boxShadow: `inset 0 0 0 1px ${selectedFavorite.accentColor}16, 0 0 70px ${selectedFavorite.accentColor}12`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: `radial-gradient(circle at 50% 40%, ${selectedFavorite.accentColor}36 0%, transparent 26%), radial-gradient(circle at 32% 32%, ${selectedFavorite.accentColor}22 0%, transparent 16%), radial-gradient(circle at 68% 30%, ${activeFavoriteGlow}1e 0%, transparent 14%)`,
                          filter: "blur(42px)",
                          opacity: 0.95,
                        }}
                      />
                      <div
                        className="pointer-events-none absolute left-[16%] top-[14%] h-28 w-28 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${selectedFavorite.accentColor}44 0%, ${selectedFavorite.accentColor}10 42%, transparent 72%)`,
                          filter: "blur(20px)",
                          opacity: 0.9,
                        }}
                      />
                      <div
                        className="pointer-events-none absolute right-[18%] top-[26%] h-20 w-20 rounded-full"
                        style={{
                          background: `radial-gradient(circle, rgba(255,255,255,0.22) 0%, ${activeFavoriteGlow}20 34%, transparent 68%)`,
                          filter: "blur(12px)",
                          opacity: 0.9,
                        }}
                      />
                      <div
                        className="pointer-events-none absolute left-[23%] top-[58%] h-24 w-24 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${activeFavoriteGlow}24 0%, transparent 62%)`,
                          filter: "blur(18px)",
                          opacity: 0.75,
                        }}
                      />
                      <div
                        className="pointer-events-none absolute left-1/2 top-[22%] h-px w-[36%] -translate-x-1/2"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, ${selectedFavorite.accentColor}44 20%, rgba(255,255,255,0.4) 50%, ${activeFavoriteGlow}44 80%, transparent 100%)`,
                          boxShadow: `0 0 18px ${selectedFavorite.accentColor}55`,
                          opacity: 0.65,
                        }}
                      />
                      {[
                        { glyph: "✦", top: "18%", left: "22%", delay: 0 },
                        { glyph: "✧", top: "26%", right: "24%", delay: 0.35 },
                        { glyph: "♪", top: "62%", left: "28%", delay: 0.15 },
                        { glyph: "♫", top: "54%", right: "26%", delay: 0.5 },
                        { glyph: "✦", top: "72%", right: "34%", delay: 0.2 },
                      ].map((sparkle, index) => (
                        <motion.span
                          key={`${selectedFavorite.id}-sparkle-${index}`}
                          className="pointer-events-none absolute text-xl"
                          style={{
                            top: sparkle.top,
                            left: sparkle.left,
                            right: sparkle.right,
                            color: index % 2 === 0 ? activeFavoriteGlow : selectedFavorite.accentColor,
                            textShadow: `0 0 12px ${index % 2 === 0 ? activeFavoriteGlow : selectedFavorite.accentColor}`,
                          }}
                          animate={{
                            opacity: [0.25, 0.9, 0.35],
                            scale: [0.9, 1.18, 0.92],
                            y: [0, -6, 0],
                          }}
                          transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: sparkle.delay,
                          }}
                        >
                          {sparkle.glyph}
                        </motion.span>
                      ))}
                      <div
                        className="pointer-events-none absolute inset-0 opacity-35"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, ${selectedFavorite.accentColor}10 22%, ${activeFavoriteGlow}08 32%, transparent 44%, ${selectedFavorite.accentColor}0d 66%, transparent 100%)`,
                          filter: "blur(24px)",
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 flex h-64 w-64 items-center justify-center"
                      >
                        <motion.div
                          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,_rgba(255,255,255,0.5),_rgba(255,255,255,0.08)_10%,_rgba(28,28,28,0.96)_11%,_rgba(10,10,10,0.98)_58%,_rgba(0,0,0,1)_100%)]"
                          style={{
                            boxShadow: `0 0 75px ${selectedFavorite.accentColor}38`,
                          }}
                          animate={{ rotate: 360, scale: [1, 1.015, 1] }}
                          transition={{
                            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
                          }}
                        >
                          <div className="absolute inset-[6%] rounded-full border border-white/6" />
                          <div className="absolute inset-[14%] rounded-full border border-white/5" />
                          <div className="absolute inset-[22%] rounded-full border border-white/5" />
                          <div className="absolute inset-[31%] rounded-full border border-white/6" />
                          <div className="absolute inset-[41%] rounded-full border border-white/6" />
                          <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black" />
                        </motion.div>
                        <motion.div
                          className="absolute inset-[-8%] rounded-full"
                          style={{
                            background: `radial-gradient(circle, ${selectedFavorite.accentColor}55, transparent 58%)`,
                            filter: "blur(4px)",
                          }}
                          animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.96, 1.06, 0.96] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute h-32 w-32 overflow-hidden rounded-full border border-white/10 shadow-[0_0_24px_rgba(0,0,0,0.35)]"
                        >
                          {selectedFavorite.albumArt ? (
                            <Image
                              src={selectedFavorite.albumArt}
                              alt={selectedFavorite.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-white/5 text-[#1db954]/70">
                              <Music2 size={30} />
                            </div>
                          )}
                        </motion.div>
                        <div className="pointer-events-none absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,_rgba(255,255,255,0.22),_transparent_16%,_transparent_52%,_rgba(255,255,255,0.12)_72%,_transparent_84%,_rgba(255,255,255,0.24))] mix-blend-screen opacity-65" />
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.42, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-10 mt-8 space-y-3"
                      >
                        <p
                          className="text-[11px] uppercase tracking-[0.24em]"
                          style={{ color: selectedFavorite.accentColor }}
                        >
                          {selectedFavorite.sectionTitle}
                        </p>
                        <h3
                          className="font-nord text-4xl uppercase tracking-[0.08em] sm:text-5xl"
                          style={{
                            backgroundImage: `linear-gradient(90deg, #ffffff 0%, ${activeFavoriteGlow}38 16%, ${selectedFavorite.accentColor} 56%, ${activeFavoriteGlow} 84%, #ffffff 100%)`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                            textShadow: `0 0 18px ${selectedFavorite.accentColor}12`,
                          }}
                        >
                          {selectedFavorite.title}
                        </h3>
                        <p className="mx-auto max-w-3xl text-base text-white/50 sm:text-lg">
                          {selectedFavorite.artist}
                        </p>
                        <div className="pt-3">
                          <a
                            href={selectedFavorite.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-sm px-6 text-sm font-medium text-[#07110b] transition-all"
                            style={{
                              border: `1px solid ${selectedFavorite.accentColor}66`,
                              backgroundColor: selectedFavorite.accentColor,
                              boxShadow: `0 0 28px ${selectedFavorite.accentColor}2a`,
                            }}
                          >
                            <SpotifyGlyph />
                            <span>Listen on Spotify</span>
                          </a>
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="favorites-grid"
                      initial={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden space-y-6"
                    >
                      {favoriteData.sections.map((section) => (
                        <div key={section.title}>
                          <div className="mb-3 flex items-center gap-2">
                            <div className="h-px w-8 bg-[#1db954]/60" />
                            <h4 className="text-[11px] uppercase tracking-[0.24em] text-[#1db954]">
                              {section.title}
                            </h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {section.items.map((track) => (
                              <button
                                type="button"
                                key={`${section.title}-${track.id}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFavoritesPinned(true);
                                  setSelectedFavorite({ ...track, sectionTitle: section.title });
                                }}
                                className="group/item cursor-pointer rounded-sm border border-white/8 bg-white/[0.02] px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                                style={{
                                  borderColor: `${track.accentColor}18`,
                                  boxShadow:
                                    selectedFavorite?.id === track.id
                                      ? `0 0 24px ${track.accentColor}18`
                                      : undefined,
                                }}
                              >
                                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-sm border border-white/8 bg-white/5">
                                  {track.albumArt ? (
                                    <Image src={track.albumArt} alt={track.title} fill className="object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[#1db954]/60">
                                      <Music2 size={16} />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 space-y-1 text-center">
                                  <MarqueeText
                                    text={track.title}
                                    className="text-sm text-white group-hover/item:text-white"
                                  />
                                  <MarqueeText
                                    text={track.artist}
                                    className="text-xs text-white/40"
                                  />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;
  const cardContent = (
    <>
      {data?.isPlaying && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.14]">
          <div className="absolute inset-y-0 left-0 right-0 flex items-end gap-1 px-3">
            {Array.from({ length: 28 }).map((_, i) => (
              <motion.span
                key={i}
                className="flex-1 rounded-t-full bg-gradient-to-t from-[#1db954] via-[#1db954]/70 to-transparent"
                animate={{
                  height: [
                    `${14 + ((i * 7) % 24)}%`,
                    `${34 + ((i * 11) % 40)}%`,
                    `${18 + ((i * 5) % 28)}%`,
                  ],
                }}
                transition={{
                  duration: 1.2 + (i % 5) * 0.18,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: i * 0.03,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0b]/70 via-transparent to-[#0b0b0b]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b]/78 via-[#0b0b0b]/30 to-transparent" />
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#1db954] via-[#1db954]/50 to-transparent" />

      <div className="relative z-10 flex items-center gap-2 mb-3">
        <Music2 size={12} className="text-[#1db954]" />
        <span className="text-[10px] tracking-widest uppercase text-white/30">
          {isLoading ? "Loading..." : data?.isPlaying ? "Now Playing" : "Last Played"}
        </span>
        <div className="ml-auto relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              pinFavorites();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-[#ff4444]/30 bg-[#ff4444]/12 px-2.5 text-[10px] uppercase tracking-[0.18em] text-[#ff6b6b] hover:bg-[#ff4444]/18 hover:border-[#ff4444]/45 transition-colors"
            aria-label="View favorite music"
          >
            <Heart size={13} />
            <span>View Favorites</span>
          </button>
        </div>
        {data?.isPlaying && (
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-0.5 bg-[#1db954] rounded-full"
                animate={{ height: ["4px", "12px", "4px"] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-14 h-14 rounded-sm bg-white/8 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/8 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-white/6 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ) : data?.title ? (
        <div className="relative z-10 flex items-center gap-3.5">
          {data.albumArt && (
            <div className="relative w-14 h-14 rounded-sm overflow-hidden shrink-0 border border-white/8">
              <Image src={data.albumArt} alt={data.albumName ?? ""} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white font-medium truncate">{data.title}</div>
            <div className="text-[13px] text-white/40 truncate">{data.artist}</div>
            {lastHeard && (
              <div className="text-[10px] text-white/25 mt-1 uppercase tracking-[0.18em]">
                Last listened {lastHeard}
              </div>
            )}
          </div>
          {data.songUrl && (
            <div className="shrink-0 text-white/20 group-hover:text-[#1db954] transition-colors">
              <ExternalLink size={14} />
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 flex items-center gap-2 text-xs text-white/25">
          <Pause size={12} />
          <span>Not playing</span>
        </div>
      )}

      {data?.isPlaying && data?.durationMs && (
        <div className="relative z-10 mt-3 space-y-1.5">
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#1db954] rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.2 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/25 tabular-nums">
            <span>{formatMs(clampedProgressMs)}</span>
            <span>{formatMs(data.durationMs)}</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <style jsx global>{`
        @keyframes spotify-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
      {favoritesOverlay}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cardClassName}
        role={isClickable ? "link" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? openCurrentTrack : undefined}
        onKeyDown={
          isClickable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCurrentTrack();
                }
              }
            : undefined
        }
      >
        {cardContent}
      </motion.div>
    </>
  );
}
