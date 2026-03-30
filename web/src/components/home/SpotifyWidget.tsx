"use client";

import React, { type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Music2, ExternalLink, Heart, Pause, X, ArrowLeft } from "lucide-react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import type { SpotifyHistoryTrack, SpotifyTrack } from "@/lib/types";

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
  source: "favorite" | "live" | "history";
};

function clampChannel(value: number) {
  return Math.max(50, Math.min(220, Math.round(value)));
}

function channelToHex(value: number) {
  return clampChannel(value).toString(16).padStart(2, "0");
}

function fallbackAccentFromText(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const r = 90 + Math.abs(hash % 120);
  const g = 90 + Math.abs((hash >> 8) % 120);
  const b = 90 + Math.abs((hash >> 16) % 120);

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

function isLightHexColor(color?: string) {
  if (!color || !color.startsWith("#")) return false;
  const hex = color.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : hex;

  if (normalized.length !== 6) return false;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) return false;

  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 168;
}

async function extractAccentColorFromImage(src?: string, fallbackSeed?: string) {
  if (!src) {
    return fallbackAccentFromText(fallbackSeed ?? "spotify");
  }

  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image-load-failed"));
      img.src = src;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no-canvas-context");

    const size = 24;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let totalWeight = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      const alpha = imageData[i + 3] / 255;
      if (alpha < 0.4) continue;

      const red = imageData[i];
      const green = imageData[i + 1];
      const blue = imageData[i + 2];
      const brightness = (red + green + blue) / 3;
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
      const weight = alpha * (0.6 + saturation / 255) * (brightness > 24 ? 1 : 0.2);

      r += red * weight;
      g += green * weight;
      b += blue * weight;
      totalWeight += weight;
    }

    if (totalWeight <= 0) {
      throw new Error("no-weight");
    }

    return `#${channelToHex(r / totalWeight)}${channelToHex(g / totalWeight)}${channelToHex(b / totalWeight)}`;
  } catch {
    return fallbackAccentFromText(fallbackSeed ?? src);
  }
}

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
    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedCheck = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(checkOverflow, 200); };
    window.addEventListener("resize", debouncedCheck, { passive: true });
    return () => { clearTimeout(resizeTimer); window.removeEventListener("resize", debouncedCheck); };
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
  if (deltaSeconds < 60) return "Just Now";

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}M Ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}H Ago`;

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}D Ago`;
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
  const [currentTrackAccentColor, setCurrentTrackAccentColor] = React.useState("#ef4242");
  const [isLiveTrackTransitioning, setIsLiveTrackTransitioning] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  const lastSyncRef = React.useRef<number>(0);
  const closeFavoritesTimerRef = React.useRef<number | null>(null);
  const liveTransitionTimerRef = React.useRef<number | null>(null);

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
      if (liveTransitionTimerRef.current) {
        window.clearTimeout(liveTransitionTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const onOpenSpotify = () => {
      pinFavorites();
    };

    window.addEventListener("mdcran:open-spotify", onOpenSpotify);
    return () => {
      window.removeEventListener("mdcran:open-spotify", onOpenSpotify);
    };
  }, [pinFavorites]);

  React.useEffect(() => {
    let cancelled = false;

    if (!data?.title) {
      setCurrentTrackAccentColor("#ef4242");
      return;
    }

    extractAccentColorFromImage(data.albumArt, `${data.title}-${data.artist ?? ""}`).then((color) => {
      if (!cancelled) {
        setCurrentTrackAccentColor(color);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [data?.albumArt, data?.artist, data?.title]);

  const selectedFavoriteSource = selectedFavorite?.source;
  const selectedFavoriteUrl = selectedFavorite?.url;
  const selectedFavoriteTitle = selectedFavorite?.title;
  const selectedFavoriteArtist = selectedFavorite?.artist;
  const selectedFavoriteAlbumArt = selectedFavorite?.albumArt;
  const selectedFavoriteAccentColor = selectedFavorite?.accentColor;
  const selectedFavoriteSectionTitle = selectedFavorite?.sectionTitle;

  React.useEffect(() => {
    if (selectedFavoriteSource !== "live" || !data?.songUrl || !data?.title || !data?.artist) {
      return;
    }

    const nextTrack = {
      id: data.songUrl,
      title: data.title,
      artist: data.artist,
      albumArt: data.albumArt,
      url: data.songUrl,
      accentColor: currentTrackAccentColor,
      sectionTitle: data.isPlaying ? "Now Playing" : "Last Played",
      source: "live" as const,
    };

    if (selectedFavoriteUrl === data.songUrl) {
      if (liveTransitionTimerRef.current) {
        window.clearTimeout(liveTransitionTimerRef.current);
        liveTransitionTimerRef.current = null;
      }
      setIsLiveTrackTransitioning(false);
      const hasChanged =
        selectedFavoriteTitle !== nextTrack.title ||
        selectedFavoriteArtist !== nextTrack.artist ||
        selectedFavoriteAlbumArt !== nextTrack.albumArt ||
        selectedFavoriteAccentColor !== nextTrack.accentColor ||
        selectedFavoriteSectionTitle !== nextTrack.sectionTitle;

      if (hasChanged) {
        setSelectedFavorite((current) =>
          current && current.source === "live"
            ? {
                ...current,
                ...nextTrack,
              }
            : current
        );
      }
      return;
    }

    if (liveTransitionTimerRef.current) {
      window.clearTimeout(liveTransitionTimerRef.current);
    }
    setIsLiveTrackTransitioning(true);
    liveTransitionTimerRef.current = window.setTimeout(() => {
      setSelectedFavorite((current) =>
        current && current.source === "live" ? nextTrack : current
      );
      setIsLiveTrackTransitioning(false);
      liveTransitionTimerRef.current = null;
    }, 850);
  }, [
    currentTrackAccentColor,
    data?.albumArt,
    data?.artist,
    data?.isPlaying,
    data?.songUrl,
    data?.title,
    selectedFavoriteAccentColor,
    selectedFavoriteAlbumArt,
    selectedFavoriteArtist,
    selectedFavoriteSectionTitle,
    selectedFavoriteSource,
    selectedFavoriteTitle,
    selectedFavoriteUrl,
  ]);

  React.useEffect(() => {
    if (selectedFavorite?.source === "live") return;
    if (liveTransitionTimerRef.current) {
      window.clearTimeout(liveTransitionTimerRef.current);
      liveTransitionTimerRef.current = null;
    }
    setIsLiveTrackTransitioning(false);
  }, [selectedFavorite?.source]);

  const clampedProgressMs = data?.durationMs
    ? Math.min(displayProgressMs, data.durationMs)
    : displayProgressMs;

  const progress =
    clampedProgressMs && data?.durationMs
      ? (clampedProgressMs / data.durationMs) * 100
      : 0;
  const lastHeard = !data?.isPlaying ? formatLastHeard(data?.playedAt, nowMs) : "";
  const historyTracks = data?.history ?? [];
  const isClickable = Boolean(data?.songUrl);
  const cardClassName = `relative overflow-hidden rounded-sm px-4 pb-4 pt-4 backdrop-blur-xl group transition-all duration-300 h-full ${
    isClickable ? "cursor-pointer" : ""
  }`;
  const cardStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)',
    backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 3%, transparent)',
  };
  const openCurrentTrack = () => {
    if (!data?.songUrl || !data?.title || !data?.artist) return;

    const matchedFavorite = favoriteData?.sections
      ?.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          sectionTitle: section.title,
        }))
      )
      .find((item) => item.url === data.songUrl);

    setFavoritesPinned(true);
    setShowFavorites(true);
    setSelectedFavorite({
      id: matchedFavorite?.id ?? data.songUrl,
      title: data.title,
      artist: data.artist,
      albumArt: data.albumArt,
      url: data.songUrl,
      accentColor: matchedFavorite?.accentColor ?? currentTrackAccentColor,
      sectionTitle: data.isPlaying ? "Now Playing" : "Last Played",
      source: "live",
    });
  };
  const openHistoryTrack = (track: SpotifyHistoryTrack) => {
    if (!track.songUrl || !track.title || !track.artist) return;

    const matchedFavorite = favoriteData?.sections
      ?.flatMap((section) =>
        section.items.map((item) => ({
          ...item,
          sectionTitle: section.title,
        }))
      )
      .find((item) => item.url === track.songUrl);

    setFavoritesPinned(true);
    setShowFavorites(true);
    setSelectedFavorite({
      id: matchedFavorite?.id ?? `${track.songUrl}-${track.playedAt}`,
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt,
      url: track.songUrl,
      accentColor:
        matchedFavorite?.accentColor ??
        fallbackAccentFromText(`${track.title}-${track.artist}`),
      sectionTitle: "Recently Played",
      source: "history",
    });
  };
  const activeFavoriteAccent = selectedFavorite?.accentColor ?? "#ef4242";
  const activeFavoriteGlow = "#6ef7ff";
  const spotifyButtonTextColor =
    selectedFavorite && isLightHexColor(selectedFavorite.accentColor)
      ? "#07110b"
      : "#ffffff";
  const showSidebarNowPanel = !selectedFavorite || selectedFavorite?.source !== "live";
  const showHistoryOnlySidebar = selectedFavorite?.source === "live";
  const showFocusedLiveProgress =
    selectedFavorite?.source === "live" &&
    !isLiveTrackTransitioning &&
    selectedFavorite.url === data?.songUrl &&
    Boolean(data?.isPlaying && data?.durationMs);
  const showFocusedLiveLastHeard =
    selectedFavorite?.source === "live" &&
    !isLiveTrackTransitioning &&
    !data?.isPlaying &&
    Boolean(lastHeard);
  const favoritesOverlay =
    isMounted && showFavorites && favoriteData?.sections?.length
      ? createPortal(
          <div className="fixed inset-0 z-50 pointer-events-none" data-force-dark>
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-auto"
              onClick={forceCloseFavorites}
              aria-label="Close favorite music"
            />
            <div
              className="absolute inset-x-3 top-3 bottom-3 flex min-h-0 flex-col gap-3 xl:bottom-auto xl:left-1/2 xl:right-auto xl:top-1/2 xl:h-[calc(100vh-6rem)] xl:w-[min(96vw,calc(1200px+19.5rem))] xl:-translate-x-1/2 xl:-translate-y-1/2 xl:flex-row xl:items-stretch xl:gap-6"
            >
              <div className="hidden h-[calc(100vh-6rem)] w-[18rem] shrink-0 xl:block">
                {showSidebarNowPanel ? (
                  <div className="flex h-full flex-col gap-4">
                    <aside
                      className={`pointer-events-auto relative shrink-0 overflow-hidden rounded-sm border border-white/8 p-5 ${data?.songUrl ? "cursor-pointer" : ""}`}
                      style={{
                        borderColor: "rgba(239, 66, 66, 0.14)",
                        background:
                          "linear-gradient(180deg, rgba(18,7,8,0.92), rgba(12,6,7,0.97))",
                        boxShadow:
                          "inset 0 0 36px rgba(239, 66, 66, 0.045), 0 0 0 1px rgba(239, 66, 66, 0.04)",
                      }}
                      onClick={data?.songUrl ? openCurrentTrack : undefined}
                      role={data?.songUrl ? "button" : undefined}
                      tabIndex={data?.songUrl ? 0 : undefined}
                      onKeyDown={
                        data?.songUrl
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openCurrentTrack();
                              }
                            }
                          : undefined
                      }
                    >
                      {data?.isPlaying ? (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.16]">
                          <div className="absolute inset-y-0 left-0 right-0 flex items-end gap-1 px-4">
                            {Array.from({ length: 18 }).map((_, i) => (
                              <motion.span
                                key={`favorites-bars-${i}`}
                                className="flex-1 rounded-t-full bg-gradient-to-t from-[#1db954] via-[#1db954]/70 to-transparent"
                                animate={{
                                  height: [
                                    `${16 + ((i * 9) % 22)}%`,
                                    `${38 + ((i * 7) % 34)}%`,
                                    `${18 + ((i * 5) % 24)}%`,
                                  ],
                                }}
                                transition={{
                                  duration: 1 + (i % 4) * 0.16,
                                  repeat: Infinity,
                                  repeatType: "mirror",
                                  ease: "easeInOut",
                                  delay: i * 0.03,
                                }}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#07110b] via-[#07110b]/55 to-transparent" />
                        </div>
                      ) : null}

                      <div className="relative z-10">
                        <div className="mb-4 flex items-center gap-2">
                          <Music2 size={12} className="text-[#ef4242]" />
                          <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                            {data?.isPlaying ? "Now Playing" : "Last Played"}
                          </span>
                          {data?.isPlaying ? (
                            <span className="ml-auto flex gap-0.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={`favorites-now-${i}`}
                                  className="w-0.5 rounded-full bg-[#ef4242]"
                                  animate={{ height: ["4px", "11px", "4px"] }}
                                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                />
                              ))}
                            </span>
                          ) : null}
                        </div>

                        {data?.title ? (
                          <>
                            <div className="relative mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-sm border border-white/8 bg-white/5">
                              {data.albumArt ? (
                                <Image
                                  src={data.albumArt}
                                  alt={data.title}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[#ef4242]/60">
                                    <Music2 size={24} />
                                  </div>
                              )}
                            </div>
                            <div className="mt-5 space-y-2 text-center">
                              <MarqueeText
                                text={data.title}
                                className="text-xl text-white"
                              />
                              <MarqueeText
                                text={data.artist ?? ""}
                                className="text-sm text-white/45"
                              />
                              {!data.isPlaying && lastHeard ? (
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/28">
                                  {lastHeard}
                                </div>
                              ) : null}
                            </div>
                            {data.isPlaying && data.durationMs ? (
                              <div className="mt-5 space-y-1.5">
                                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-[#ef4242] rounded-full"
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
                            ) : null}
                          </>
                        ) : (
                          <div className="rounded-sm border border-white/8 bg-white/[0.02] px-4 py-5 text-center text-sm text-white/28">
                            Nothing playing right now.
                          </div>
                        )}
                      </div>
                    </aside>

                    <aside
                      className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-white/8"
                      style={{
                        borderColor: "rgba(239, 66, 66, 0.16)",
                        background:
                          "linear-gradient(180deg, rgba(18,7,8,0.96), rgba(13,7,7,0.98))",
                        boxShadow:
                          "inset 0 0 40px rgba(239, 66, 66, 0.05), 0 0 0 1px rgba(239, 66, 66, 0.05)",
                      }}
                    >
                      <div className="border-b border-white/8 px-4 py-2.5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#ef4242]">
                          Recently Played
                        </p>
                      </div>
                      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2.5">
                        {historyTracks.length ? (
                          historyTracks.map((track: SpotifyHistoryTrack) => (
                            <button
                              type="button"
                              key={`${track.songUrl ?? track.title}-${track.playedAt}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                openHistoryTrack(track);
                              }}
                              className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border border-white/6 bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
                            >
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-white/8 bg-white/5">
                                {track.albumArt ? (
                                  <Image src={track.albumArt} alt={track.title ?? "Spotify track"} fill unoptimized className="object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[#ef4242]/60">
                                    <Music2 size={14} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <MarqueeText
                                  text={track.title ?? ""}
                                  className="text-[13px] text-white"
                                />
                                <MarqueeText
                                  text={track.artist ?? ""}
                                  className="text-[11px] text-white/42"
                                />
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-sm border border-white/8 bg-white/[0.02] px-3 py-4 text-center text-xs text-white/28">
                            No recent songs yet.
                          </div>
                        )}
                      </div>
                    </aside>
                  </div>
                ) : showHistoryOnlySidebar ? (
                  <aside
                    className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-sm border border-white/8"
                    style={{
                      borderColor: "rgba(239, 66, 66, 0.16)",
                      background:
                        "linear-gradient(180deg, rgba(18,7,8,0.96), rgba(13,7,7,0.98))",
                      boxShadow:
                        "inset 0 0 40px rgba(239, 66, 66, 0.05), 0 0 0 1px rgba(239, 66, 66, 0.05)",
                    }}
                  >
                    <div className="border-b border-white/8 px-4 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#ef4242]">
                        Recently Played
                      </p>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2.5">
                      {historyTracks.length ? (
                        historyTracks.map((track: SpotifyHistoryTrack) => (
                          <button
                            type="button"
                            key={`${track.songUrl ?? track.title}-${track.playedAt}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openHistoryTrack(track);
                            }}
                            className="flex w-full cursor-pointer items-center gap-2.5 rounded-sm border border-white/6 bg-white/[0.02] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-white/8 bg-white/5">
                              {track.albumArt ? (
                                <Image src={track.albumArt} alt={track.title ?? "Spotify track"} fill unoptimized className="object-cover" />
                              ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[#ef4242]/60">
                                    <Music2 size={14} />
                                  </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <MarqueeText
                                text={track.title ?? ""}
                                className="text-[13px] text-white"
                              />
                              <MarqueeText
                                text={track.artist ?? ""}
                                className="text-[11px] text-white/42"
                              />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-sm border border-white/8 bg-white/[0.02] px-3 py-4 text-center text-xs text-white/28">
                          No recent songs yet.
                        </div>
                      )}
                    </div>
                  </aside>
                ) : null}
              </div>

              <div
                className="pointer-events-auto flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden rounded-sm bg-[#07110b]/95 xl:w-[min(1200px,calc(96vw-19.5rem))]"
                style={{
                  border: `1px solid ${activeFavoriteAccent}2e`,
                  background: "linear-gradient(180deg, rgba(18,7,8,0.95), rgba(12,6,7,0.98))",
                  boxShadow: `0 0 0 1px ${activeFavoriteAccent}12, 0 0 54px ${activeFavoriteAccent}14, inset 0 0 60px rgba(239, 66, 66, 0.08)`,
                }}
                onMouseEnter={openFavorites}
                onMouseLeave={closeFavorites}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  className="relative z-10 shrink-0 px-4 py-4 backdrop-blur-xl sm:px-6 sm:py-5"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(22,8,10,0.96), rgba(14,7,8,0.95))",
                    borderBottom: `1px solid ${activeFavoriteAccent}22`,
                    boxShadow: `inset 0 -1px 0 ${activeFavoriteAccent}10, inset 0 0 28px rgba(239, 66, 66, 0.035)`,
                  }}
                >
                  <div className="relative flex items-center justify-between gap-3 sm:gap-4">
                  {selectedFavorite ? (
                    <button
                      type="button"
                      onClick={() => setSelectedFavorite(null)}
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border border-white/8 bg-white/[0.03] text-white/55 transition-colors hover:border-[#ef4242]/25 hover:text-white"
                      aria-label="Back to favorites grid"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <Heart size={15} className="text-[#ef4242]" />
                      <p className="font-nord text-sm text-white tracking-wider sm:text-base">My Favorites</p>
                    </div>
                  )}
                  {selectedFavorite?.source === "live" ? (
                    <p className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 font-nord text-[11px] uppercase tracking-[0.28em] text-white/48 md:block">
                      
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={forceCloseFavorites}
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border border-white/8 bg-white/[0.03] text-white/40 transition-colors hover:border-[#ef4242]/25 hover:text-white"
                    aria-label="Close favorite music"
                  >
                    <X size={15} />
                  </button>
                </div>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
                <AnimatePresence mode="wait">
                  {selectedFavorite ? (
                    <motion.div
                      key={`favorite-focus-${selectedFavorite.id}`}
                      initial={{ opacity: 0, scale: 0.88, filter: "blur(12px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 1.08, filter: "blur(10px)" }}
                      transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                      className="relative flex min-h-full flex-col items-center justify-center overflow-hidden rounded-sm px-4 py-5 text-center sm:px-6 sm:py-6 xl:h-full"
                      style={{
                        border: `1px solid ${selectedFavorite.accentColor}38`,
                        background: `radial-gradient(circle at 50% 42%, ${selectedFavorite.accentColor}30 0%, ${activeFavoriteGlow}12 16%, ${selectedFavorite.accentColor}14 24%, rgba(7,17,11,0.95) 48%, rgba(3,8,5,0.99) 100%)`,
                        boxShadow: `inset 0 0 0 1px ${selectedFavorite.accentColor}16, 0 0 70px ${selectedFavorite.accentColor}12`,
                      }}
                    >
                      {selectedFavorite.source === "live" && data?.isPlaying && !isLiveTrackTransitioning ? (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.2]">
                          <div className="absolute inset-y-0 left-0 right-0 flex items-end gap-1 px-8">
                            {Array.from({ length: 28 }).map((_, i) => (
                              <motion.span
                                key={`focus-live-bars-${i}`}
                                className="flex-1 rounded-t-full"
                                style={{
                                  background: `linear-gradient(to top, ${selectedFavorite.accentColor}, ${selectedFavorite.accentColor}80, transparent)`,
                                }}
                                animate={{
                                  height: [
                                    `${14 + ((i * 7) % 24)}%`,
                                    `${34 + ((i * 11) % 40)}%`,
                                    `${18 + ((i * 5) % 28)}%`,
                                  ],
                                }}
                                transition={{
                                  duration: 1.1 + (i % 5) * 0.18,
                                  repeat: Infinity,
                                  repeatType: "mirror",
                                  ease: "easeInOut",
                                  delay: i * 0.03,
                                }}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#07110b] via-[#07110b]/60 to-transparent" />
                        </div>
                      ) : null}
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
                        className="relative z-10 flex h-44 w-44 items-center justify-center sm:h-64 sm:w-64"
                      >
                        {isLiveTrackTransitioning && selectedFavorite.source === "live" ? (
                          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-[#07110b]/72 backdrop-blur-sm">
                            <motion.div
                              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 sm:h-16 sm:w-16"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                            >
                              <div className="h-6 w-6 sm:h-7 sm:w-7">
                                <SpotifyGlyph />
                              </div>
                            </motion.div>
                          </div>
                        ) : null}
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
                          className="absolute h-20 w-20 overflow-hidden rounded-full border border-white/10 shadow-[0_0_24px_rgba(0,0,0,0.35)] sm:h-32 sm:w-32"
                        >
                          {selectedFavorite.albumArt ? (
                            <Image
                              src={selectedFavorite.albumArt}
                              alt={selectedFavorite.title}
                              fill
                              unoptimized
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
                        className="relative z-10 mt-6 space-y-3 sm:mt-8"
                      >
                        <p
                          className="text-[11px] uppercase tracking-[0.24em]"
                          style={{ color: selectedFavorite.accentColor }}
                        >
                          {selectedFavorite.sectionTitle}
                        </p>
                        <h3
                          className="font-nord text-2xl uppercase tracking-[0.08em] sm:text-5xl"
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
                        <p className="mx-auto max-w-3xl text-sm text-white/50 sm:text-lg">
                          {selectedFavorite.artist}
                        </p>
                        {showFocusedLiveProgress ? (
                          <div className="mx-auto mt-2 w-full max-w-xl space-y-1.5">
                            <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: selectedFavorite.accentColor }}
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
                        ) : null}
                        {showFocusedLiveLastHeard ? (
                          <div className="mx-auto mt-2 text-[11px] uppercase tracking-[0.22em] text-white/32">
                            {lastHeard}
                          </div>
                        ) : null}
                        <div className="group inline-block pt-3">
                          <div className="relative inline-block h-12 overflow-visible">
                            <a
                              href={selectedFavorite.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative z-10 inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-sm px-6 text-sm font-medium transition-all"
                              style={{
                                border: `1px solid ${selectedFavorite.accentColor}66`,
                                backgroundColor: selectedFavorite.accentColor,
                                boxShadow: `0 0 28px ${selectedFavorite.accentColor}2a`,
                                color: spotifyButtonTextColor,
                              }}
                            >
                              <SpotifyGlyph />
                              <span>Listen on Spotify</span>
                            </a>
                            <div
                              className="pointer-events-none absolute left-0 right-0 top-full -mt-[2px] flex h-0 items-center justify-center overflow-hidden rounded-b-sm border-x border-b px-3 text-[10px] uppercase tracking-[0.16em] opacity-0 transition-all duration-200 group-hover:h-[1.2rem] group-hover:opacity-100"
                              style={{
                                borderColor: `${selectedFavorite.accentColor}55`,
                                backgroundColor: `${selectedFavorite.accentColor}30`,
                                color: selectedFavorite.accentColor,
                                backdropFilter: "blur(8px)",
                              }}
                            >
                              Redirect to Spotify.com
                            </div>
                          </div>
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
                      className="min-h-full xl:h-full xl:overflow-y-auto"
                    >
                      <div className="flex min-h-full flex-col gap-5 sm:gap-6 xl:justify-between">
                          {favoriteData.sections.map((section) => (
                            <div key={section.title}>
                              <div className="mb-3 flex items-center gap-2">
                                <div className="h-px w-8 bg-[#ef4242]/60" />
                                <h4 className="text-[11px] uppercase tracking-[0.24em] text-[#ef4242]">
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
                                      setSelectedFavorite({ ...track, sectionTitle: section.title, source: "favorite" });
                                    }}
                                    className="group/item cursor-pointer rounded-sm border border-white/8 bg-white/[0.02] px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.04] sm:px-3 sm:py-3"
                                    style={{
                                      borderColor: `${track.accentColor}18`,
                                    }}
                                  >
                                    <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-sm border border-white/8 bg-white/5 sm:h-24 sm:w-24">
                                      {track.albumArt ? (
                                        <Image src={track.albumArt} alt={track.title} fill unoptimized className="object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-[#1db954]/60">
                                          <Music2 size={16} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-3 space-y-1 text-center">
                                      <MarqueeText
                                        text={track.title}
                                        className="text-xs text-white group-hover/item:text-white sm:text-sm"
                                      />
                                      <MarqueeText
                                        text={track.artist}
                                        className="text-[11px] text-white/40 sm:text-xs"
                                      />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
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
        <span className="text-[10px] tracking-widest uppercase" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)' }}>
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
          <div className="w-14 h-14 rounded-sm animate-pulse shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded animate-pulse w-3/4" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }} />
            <div className="h-3 rounded animate-pulse w-1/2" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 6%, transparent)' }} />
          </div>
        </div>
      ) : data?.title ? (
        <div className="relative z-10 flex items-center gap-3.5">
          {data.albumArt && (
            <div className="relative w-14 h-14 rounded-sm overflow-hidden shrink-0" style={{ border: '1px solid color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }}>
              <Image src={data.albumArt} alt={data.albumName ?? ""} fill unoptimized className="object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 90%, transparent)' }}>{data.title}</div>
            <div className="text-[13px] truncate" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)' }}>{data.artist}</div>
            {lastHeard && (
              <div className="text-[10px] mt-1 uppercase tracking-[0.18em]" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}>
                {lastHeard}
              </div>
            )}
          </div>
          {data.songUrl && (
            <div className="shrink-0 group-hover:text-[#1db954] transition-colors" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 20%, transparent)' }}>
              <ExternalLink size={14} />
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 flex items-center gap-2 text-xs" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}>
          <Pause size={12} />
          <span>Not playing</span>
        </div>
      )}

      {data?.isPlaying && data?.durationMs && (
        <div className="relative z-10 mt-3 space-y-1.5">
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)' }}>
            <motion.div
              className="h-full bg-[#1db954] rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.2 }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] tabular-nums" style={{ color: 'color-mix(in srgb, var(--theme-text, #fff) 25%, transparent)' }}>
            <span>{formatMs(clampedProgressMs)}</span>
            <span>{formatMs(data.durationMs)}</span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {favoritesOverlay}
      <div className="relative h-full">
        {/* Floating music notes when playing */}
        {data?.isPlaying && (
          <div className="pointer-events-none absolute inset-0 overflow-visible z-20" aria-hidden>
            {[
              { note: "\u266A", x: "-8px", delay: 0, dur: 2.8, dx: -18, size: 14 },
              { note: "\u266B", x: "15%", delay: 1.2, dur: 3.2, dx: -12, size: 12 },
              { note: "\u266A", x: "65%", delay: 0.6, dur: 2.6, dx: 14, size: 13 },
              { note: "\u266B", x: "85%", delay: 2.0, dur: 3.0, dx: 20, size: 11 },
              { note: "\u266A", x: "40%", delay: 1.8, dur: 3.4, dx: -8, size: 10 },
              { note: "\u266B", x: "calc(100% + 4px)", delay: 0.4, dur: 2.9, dx: 16, size: 12 },
            ].map((n, i) => (
              <motion.span
                key={`note-${i}`}
                className="absolute bottom-0 text-[#1db954]"
                style={{ left: n.x, fontSize: `${n.size}px` }}
                animate={{
                  y: [0, -60, -120],
                  x: [0, n.dx, n.dx * 1.4],
                  opacity: [0, 0.7, 0],
                  rotate: [0, n.dx > 0 ? 20 : -20, n.dx > 0 ? 35 : -35],
                }}
                transition={{
                  duration: n.dur,
                  delay: n.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              >
                {n.note}
              </motion.span>
            ))}
          </div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={cardClassName}
          style={cardStyle}
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
      </div>
    </>
  );
}
