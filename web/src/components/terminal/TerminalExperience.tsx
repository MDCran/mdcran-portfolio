"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type {
  Article,
  Award,
  Certification,
  Client,
  ClubMembership,
  Education,
  Experience,
  Project,
  SiteContent,
  ResumeProfile,
  Skill,
  SpotifyTrack,
} from "@/lib/types";
import { assetUrl, imageAssetSrc, projectUrl } from "@/lib/utils";
import { ROOTS, ROUTES, COMMANDS, parseArguments, resolveTerminalPath, isCodeProject, formatDate, submitTerminalForm, validateTerminalSnapshot, sanitizeBrowseUrl, type TerminalFormMode, type TerminalForm } from "@/lib/terminal-shell";
import { buildSearch, type SearchHit } from "@/lib/terminal-search";
import { streamTerminalAnswer, type TerminalTurn } from "@/lib/terminal-ai";
import { resumeLines, resumeLinks, recruiterProjects, terminalActions, terminalWindowSize, terminalTourStep, RESUME_SECTIONS, TOUR_STEPS, type TerminalMode, type TerminalPet, type TerminalAnimation, type ResumeSection } from "@/lib/terminal-workspace";
import { TerminalToolbar, TerminalTour, TerminalCompanion, TerminalResize, TerminalPointer, type TerminalPointerTarget } from "./TerminalWorkspaceChrome";
import workspaceStyles from "./TerminalWorkspace.module.css";
import TerminalTranscript from "./TerminalTranscript";
import type { TerminalLogEntry } from "@/lib/terminal-output";
import CRTThreeCanvas from "./CRTThreeCanvas";
import SnakeGame from "./games/SnakeGame";
import PacmanGame from "./games/PacmanGame";

// ─── Types ────────────────────────────────────────────────────────────────────

type TerminalData = {
  resumeProfile?: ResumeProfile;
  siteContent: SiteContent;
  projects: Project[];
  featuredProjects: Project[];
  articles: Article[];
  clients: Client[];
  featuredClients: Client[];
  experiences: Experience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  awards: Award[];
  clubs: ClubMembership[];
  generatedAt: string;
};

type LogTone = "default" | "muted" | "success" | "error" | "accent";

type LogEntry = TerminalLogEntry;

type PreviewState = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageAlt?: string;
  images?: Array<{ url: string; alt?: string }>;
  details?: string[];
  quote?: string;
  linkUrl?: string;
  linkLabel?: string;
  caption?: string;
  projectData?: Project;
  articleData?: Article;
};

type SpotifyViewState = {
  track: SpotifyTrack;
  fetchedAt: number;
};

type FormMode = "contact" | "subscribe" | "unsubscribe" | null;
type PowerState = "off" | "starting" | "on" | "stopping";

// ─── Constants ────────────────────────────────────────────────────────────────

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
] as const;

const ASCII = [
  "███╗   ███╗██████╗  █████╗ ██████╗  █████╗ ███╗  ██╗   █████╗ ██╗     ██╗",
  "████╗ ████║██╔══██╗██╔══██╗██╔══██╗██╔══██╗████╗ ██║  ██╔══██╗██║     ██║",
  "██╔████╔██║██║  ██║██║  ╚═╝██████╔╝███████║██╔██╗██║  ██║  ╚═╝██║     ██║",
  "██║╚██╔╝██║██║  ██║██║  ██╗██╔══██╗██╔══██║██║╚████║  ██║  ██╗██║     ██║",
  "██║ ╚═╝ ██║██████╔╝╚█████╔╝██║  ██║██║  ██║██║ ╚███║  ╚█████╔╝███████╗██║",
  "╚═╝     ╚═╝╚═════╝  ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚══╝   ╚════╝ ╚══════╝╚═╝",
].join("\n");

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  identifier: "",
};

const DIV = "─".repeat(52);
const POWER_BUTTON_HOVER_MS = 40;
// ─── Boot / close timing ──────────────────────────────────────────────────────
// Delay (ms) after power button click before the terminal CONTENT appears (animation plays during this time).
const TERMINAL_APPEAR_MS = 1500;
// Delay (ms) after terminal opens before the boot text starts printing.
const TERMINAL_TEXT_DELAY_MS = 1000;
// Delay (ms) after terminal opens before the retro GIF background starts showing.
const TERMINAL_GIF_DELAY_MS = 500;
// Delay (ms) after the close command before the shell DISAPPEARS from screen.
const TERMINAL_CLOSE_MS = 620;
// Adjust this to control how far the retro GIF background is inset from the terminal window edges (px)
const RETRO_GIF_INSET = 20;
const CRT_THEME_LOOP_START_SECONDS = 4;
const CRT_THEME_LOOP_END_SECONDS = 35;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function pathLabel(path: string[]) {
  return path.length ? `/${path.join("/")}` : "/";
}

function promptLabel(path: string[]) {
  return `C:\\mdcran${path.length ? `\\${path.join("\\")}` : ""}>`;
}

function logText(text: string, tone: LogTone = "default"): LogEntry {
  return { id: mkId(), text, tone, preserveWhitespace: text === ASCII };
}

// Box header: always perfectly aligned regardless of title length.
// Box inner width = 52 dashes. Content area = 48 chars max.
function boxHeader(text: string, tone: LogTone = "accent"): LogEntry[] {
  const content = text.slice(0, 48);
  const pad = 48 - content.length;
  return [
    logText(`  ┌${"─".repeat(52)}┐`, "muted"),
    logText(`  │  ${content}${" ".repeat(pad)}  │`, tone),
    logText(`  └${"─".repeat(52)}┘`, "muted"),
  ];
}

function logPrompt(text: string): LogEntry {
  return { id: mkId(), prompt: text };
}

function logLinks(links: Array<{ label: string; href: string }>): LogEntry {
  return { id: mkId(), links };
}

function durationText(ms?: number) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function relativeTimeText(dateStr?: string, nowMs = Date.now()) {
  if (!dateStr) return "";

  const playedMs = new Date(dateStr).getTime();
  if (Number.isNaN(playedMs)) return "";

  const deltaSeconds = Math.max(0, Math.floor((nowMs - playedMs) / 1000));
  if (deltaSeconds < 60) return "just now";

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function formatMoney(cents?: number) {
  if (typeof cents !== "number") return "";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCount(value?: number) {
  if (typeof value !== "number") return "";
  return value.toLocaleString("en-US");
}

function summarizeText(value?: string, maxLength = 240) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function assignContactValue(value: string) {
  if (!value) return { email: "", phone: "", identifier: "" };
  const trimmed = value.trim();
  if (!trimmed) return { email: "", phone: "", identifier: "" };
  return trimmed.includes("@")
    ? { email: trimmed, phone: "", identifier: trimmed }
    : { email: "", phone: trimmed, identifier: trimmed };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function videoTitleText(title: string | undefined, fallback: string, index: number) {
  return title?.trim() || `Video ${index + 1} (${fallback})`;
}

function videoLinkText(title: string | undefined, fallback: string, index: number) {
  const label = videoTitleText(title, fallback, index);
  return `Watch ${index + 1}: ${label}`;
}

function progressBar(progressMs?: number, durationMs?: number) {
  const width = 23;
  const total = durationMs && durationMs > 0 ? durationMs : 1;
  const filled = Math.round(
    (Math.max(0, Math.min(total, progressMs ?? 0)) / total) * width
  );
  return `[${"=".repeat(filled)}${"-".repeat(Math.max(0, width - filled))}]`;
}

function resolveSpotifyTrack(track: SpotifyTrack) {
  if (track?.title) return track;
  return track.history?.[0];
}

function spotifyProgressNow(spotify: SpotifyViewState, nowMs = Date.now()) {
  const activeTrack = resolveSpotifyTrack(spotify.track);
  if (!activeTrack) return 0;
  if (!spotify.track.isPlaying || !spotify.track.title) {
    return activeTrack.durationMs ?? 0;
  }

  const baseProgress = spotify.track.progressMs ?? activeTrack.progressMs ?? 0;
  const elapsed = nowMs - spotify.fetchedAt;
  const duration = activeTrack.durationMs ?? spotify.track.durationMs ?? 0;
  return Math.max(0, Math.min(duration || baseProgress + elapsed, baseProgress + elapsed));
}

function spotifyPreviewState(
  spotify: SpotifyViewState,
  nowMs = Date.now()
): PreviewState | null {
  const activeTrack = resolveSpotifyTrack(spotify.track);
  if (!activeTrack?.title) return null;

  const isLive = Boolean(spotify.track.isPlaying && spotify.track.title);
  const progressMs = spotifyProgressNow(spotify, nowMs);
  const details = [
    isLive
      ? `Time: ${durationText(progressMs)} / ${durationText(activeTrack.durationMs)}`
      : "",
    isLive ? progressBar(progressMs, activeTrack.durationMs) : "",
    isLive ? "LIVE" : relativeTimeText(activeTrack.playedAt, nowMs) || "recent",
  ].filter(Boolean);

  return {
    title: activeTrack.title,
    subtitle: isLive ? "Spotify · Now Playing" : "Spotify · Last Played",
    imageUrl: activeTrack.albumArt,
    imageAlt: activeTrack.albumName ?? activeTrack.title,
    details,
    linkUrl: activeTrack.songUrl,
    linkLabel: "Listen on Spotify",
    caption: activeTrack.artist ?? activeTrack.albumName,
  };
}

// ─── Directory listing ────────────────────────────────────────────────────────

function directoryItems(path: string[], data: TerminalData): string[] {
  const key = pathLabel(path);

  const dir = (name: string) => `  [DIR ]  ${name}/`;
  const proj = (slug: string, title: string) => `  [PROJ]  ${slug.padEnd(32)}  ${title}`;
  const art = (slug: string, title: string, date?: string) => `  [ART ]  ${slug.padEnd(32)}  ${title}${date ? `  ${date}` : ""}`;
  const clt = (id: string, name: string, role?: string) => `  [CLT ]  ${id.padEnd(32)}  ${name}${role ? `  ${role}` : ""}`;

  if (key === "/") {
    return ROOTS.map((name) => dir(name));
  }
  if (key === "/arts-and-entertainment") {
    return ["minecraft-maps", "events"].map(dir);
  }
  if (key === "/motion-and-graphics") {
    return ["thumbnail-design", "video-editing", "web-dev-design"].map(dir);
  }
  if (key === "/arts-and-entertainment/minecraft-maps") {
    return data.projects
      .filter((p) => p.subcategory === "minecraft-maps")
      .map((p) => proj(p.slug, p.title));
  }
  if (key === "/arts-and-entertainment/events") {
    return data.projects
      .filter((p) => p.subcategory === "events")
      .map((p) => proj(p.slug, p.title));
  }
  if (key === "/motion-and-graphics/thumbnail-design") {
    return data.projects
      .filter((p) => p.subcategory === "thumbnail-design")
      .map((p) => proj(p.slug, p.title));
  }
  if (key === "/motion-and-graphics/video-editing") {
    return data.projects
      .filter((p) => p.subcategory === "video-editing")
      .map((p) => proj(p.slug, p.title));
  }
  if (key === "/motion-and-graphics/web-dev-design") {
    return data.projects
      .filter(
        (p) =>
          p.subcategory === "web-dev-design" ||
          p.extraSubcategories?.includes("web-dev-design")
      )
      .map((p) => proj(p.slug, p.title));
  }
  if (key === "/engineering") {
    return data.projects
      .filter(isCodeProject)
      .map((p) => proj(p.slug, p.title));
  }
  if (key === "/articles") {
    return [...data.articles]
      .sort(
        (a, b) =>
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      )
      .map((a) => art(a.slug, a.title, a.publishDate));
  }
  if (key === "/clients") {
    return data.clients.map((c) => clt(c.id, c.name, c.roles.slice(0, 1).join("")));
  }
  if (key === "/featured-work") {
    return data.featuredProjects.map((p) => proj(p.slug, p.title));
  }

  // Virtual leaf dirs — run the corresponding command
  const virtualHints: Record<string, string> = {
    "/resume":      "  →  run: resume",
    "/contact":     "  →  run: contact <name> <email> <subject> <message>",
    "/subscribe":   "  →  run: subscribe <name> <email-or-phone>",
    "/unsubscribe": "  →  run: unsubscribe <email-or-phone>",
    "/privacy":     "  →  run: privacy",
    "/terms":       "  →  run: terms",
  };
  if (key in virtualHints) return [virtualHints[key]];

  return [];
}

// ─── Search ───────────────────────────────────────────────────────────────────

// ─── Sub-components ───────────────────────────────────────────────────────────

function PreviewImage({ url, alt }: { url: string; alt?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded border border-[#4ade80]/12 bg-black/70">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt ?? ""} className="block h-auto max-h-52 w-full object-contain" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(180deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)" }} />
    </div>
  );
}

function PreviewPanel({
  preview,
  onClose,
  clients = [],
}: {
  preview: PreviewState;
  onClose: () => void;
  clients?: Client[];
}) {
  const p = preview.projectData;
  const a = preview.articleData;

  // ── Header ────────────────────────────────────────────────────────────────
  const header = (
    <div className="flex shrink-0 items-center justify-between border-b border-[#4ade80]/8 px-3 py-2">
      <span className="text-[7px] tracking-widest uppercase text-[#86efac]/30">Preview</span>
      <button onClick={onClose} className="text-[0.6125rem] leading-none text-[#86efac]/35 transition-colors hover:text-[#dcfce7]">✕</button>
    </div>
  );

  // ── Project rich view ─────────────────────────────────────────────────────
  if (p) {
    const relatedClients = (p.clientIds ?? [])
      .map((id) => clients.find((c) => c.id === id))
      .filter((c): c is Client => Boolean(c));
    const galleryImgs = (p.images ?? [])
      .map((img) => imageAssetSrc(img))
      .filter((u): u is string => Boolean(u));
    const internalUrl = projectUrl(p.category, p.slug, p.subcategory ?? undefined);

    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 px-3 py-3">
          {/* Title + category */}
          <div>
            <div className="text-[0.65rem] font-semibold leading-snug text-[#d9fbe3]/90">{p.title}</div>
            <div className="mt-0.5 text-[0.5rem] text-[#86efac]/45">
              {[p.subcategory ?? p.category, p.publishDate ? formatDate(p.publishDate) : ""].filter(Boolean).join("  ·  ")}
            </div>
          </div>

          {/* Tags */}
          {p.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <span key={t} className="rounded border border-[#4ade80]/15 bg-[#4ade80]/5 px-1.5 py-px text-[0.45rem] text-[#86efac]/60">{t}</span>
              ))}
            </div>
          ) : null}

          {/* Description */}
          {p.description && (
            <p className="text-[0.525rem] leading-relaxed text-[#d9fbe3]/75 break-words">{p.description}</p>
          )}
          {p.longDescription && (
            <p className="text-[0.525rem] leading-relaxed text-[#d9fbe3]/60 break-words">{p.longDescription}</p>
          )}

          {/* Gallery images (no cover) */}
          {galleryImgs.length > 0 && (
            <div className="space-y-2">
              {galleryImgs.slice(0, 5).map((url, i) => (
                <PreviewImage key={i} url={url} alt={p.title} />
              ))}
            </div>
          )}

          {/* Meta table */}
          <div className="space-y-0.5 border-t border-[#4ade80]/8 pt-2">
            {relatedClients.length > 0 && (
              <div className="flex gap-2 text-[0.5rem]">
                <span className="w-14 shrink-0 text-[#86efac]/35">Client</span>
                <span className="text-[#d9fbe3]/70">{relatedClients.map((c) => c.name).join(", ")}</span>
              </div>
            )}
            {p.pricing?.status === "free" && (
              <div className="flex gap-2 text-[0.5rem]">
                <span className="w-14 shrink-0 text-[#86efac]/35">Pricing</span>
                <span className="text-[#86efac]/70">Free download</span>
              </div>
            )}
            {p.pricing?.price ? (
              <div className="flex gap-2 text-[0.5rem]">
                <span className="w-14 shrink-0 text-[#86efac]/35">Price</span>
                <span className="text-[#d9fbe3]/70">{formatMoney(p.pricing.price)}</span>
              </div>
            ) : null}
            {p.credits?.length ? (
              <div className="flex gap-2 text-[0.5rem]">
                <span className="w-14 shrink-0 text-[#86efac]/35">Credits</span>
                <span className="text-[#d9fbe3]/70 break-words">{p.credits.map((c) => `${c.name} (${c.role})`).join(", ")}</span>
              </div>
            ) : null}
          </div>

          {/* Videos */}
          {p.videos?.length ? (
            <div className="space-y-1 border-t border-[#4ade80]/8 pt-2">
              <div className="text-[0.45rem] uppercase tracking-widest text-[#86efac]/30">Videos</div>
              {p.videos.slice(0, 4).map((v, i) => (
                <a
                  key={i}
                  href={`https://youtu.be/${v.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1.5 text-[0.5rem] text-[#86efac]/70 hover:text-[#86efac] transition-colors"
                >
                  <span className="mt-px shrink-0 text-[#86efac]/30">▶</span>
                  <span className="break-words">{v.title || `Video ${i + 1}`}</span>
                </a>
              ))}
            </div>
          ) : null}

          {/* Links */}
          <div className="flex flex-wrap gap-3 border-t border-[#4ade80]/8 pt-2">
            <a href={internalUrl} target="_blank" rel="noopener noreferrer" className="text-[0.5rem] text-[#86efac] underline underline-offset-2 hover:text-[#dcfce7] transition-colors">↗ Project page</a>
            {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="text-[0.5rem] text-[#86efac]/70 underline underline-offset-2 hover:text-[#dcfce7] transition-colors">↗ Live site</a>}
            {p.externalUrl && <a href={p.externalUrl} target="_blank" rel="noopener noreferrer" className="text-[0.5rem] text-[#86efac]/70 underline underline-offset-2 hover:text-[#dcfce7] transition-colors">↗ External link</a>}
            {p.pricing?.downloadUrl && p.pricing.status === "free" && <a href={p.pricing.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-[0.5rem] text-[#86efac]/70 underline underline-offset-2 hover:text-[#dcfce7] transition-colors">↓ Download</a>}
          </div>
        </div>
      </div>
    );
  }

  // ── Article rich view ─────────────────────────────────────────────────────
  if (a) {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 px-3 py-3">
          {/* Title + meta */}
          <div>
            <div className="text-[0.65rem] font-semibold leading-snug text-[#d9fbe3]/90">{a.title}</div>
            <div className="mt-0.5 text-[0.5rem] text-[#86efac]/45">
              {a.author}  ·  {formatDate(a.publishDate)}
            </div>
            <div className="mt-0.5 text-[0.5rem] text-[#86efac]/30">{a.category}</div>
          </div>

          {/* Tags */}
          {a.tags?.length ? (
            <div className="flex flex-wrap gap-1">
              {a.tags.map((t) => (
                <span key={t} className="rounded border border-[#4ade80]/15 bg-[#4ade80]/5 px-1.5 py-px text-[0.45rem] text-[#86efac]/60">{t}</span>
              ))}
            </div>
          ) : null}

          {/* Excerpt */}
          {a.excerpt && (
            <div className="rounded border border-[#4ade80]/10 bg-[#05160c]/60 px-2.5 py-2 text-[0.525rem] leading-relaxed text-[#bbf7d0]/65 italic break-words">
              &quot;{a.excerpt}&quot;
            </div>
          )}

          {/* Sections */}
          <div className="space-y-2.5 border-t border-[#4ade80]/8 pt-2">
            {a.sections.map((sec, i) => {
              if (sec.type === "text" && sec.content) {
                return <p key={i} className="text-[0.525rem] leading-relaxed text-[#d9fbe3]/70 break-words">{sec.content.length > 400 ? sec.content.slice(0, 400) + "…" : sec.content}</p>;
              }
              if (sec.type === "image" && sec.src) {
                const u = imageAssetSrc(sec.src);
                return u ? <PreviewImage key={i} url={u} alt={sec.alt ?? sec.caption ?? a.title} /> : null;
              }
              if (sec.type === "gallery" && sec.images?.length) {
                return (
                  <div key={i} className="grid grid-cols-2 gap-1">
                    {sec.images.slice(0, 4).map((img, j) => {
                      const u = imageAssetSrc(img);
                      return u ? <PreviewImage key={j} url={u} alt={sec.caption ?? a.title} /> : null;
                    })}
                  </div>
                );
              }
              if (sec.type === "video" && sec.youtubeId) {
                return (
                  <a key={i} href={`https://youtu.be/${sec.youtubeId}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-[0.5rem] text-[#86efac]/70 hover:text-[#86efac] transition-colors">
                    <span className="mt-px shrink-0 text-[#86efac]/30">▶</span>
                    <span className="break-words">{sec.caption ?? `Watch video`}</span>
                  </a>
                );
              }
              if ((sec.type === "checklist" || sec.type === "steps" || sec.type === "ingredient-list" || sec.type === "store-checklist") && sec.items?.length) {
                const Tag = sec.type === "steps" ? "ol" : "ul";
                return (
                  <Tag key={i} className={`space-y-0.5 text-[0.5rem] text-[#d9fbe3]/65 ${sec.type === "steps" ? "list-decimal" : "list-disc"} list-inside`}>
                    {sec.items.slice(0, 8).map((item, j) => <li key={j} className="break-words">{item}</li>)}
                    {sec.items.length > 8 && <li className="text-[#86efac]/30">+{sec.items.length - 8} more…</li>}
                  </Tag>
                );
              }
              if (sec.type === "quote" && sec.content) {
                return <blockquote key={i} className="border-l-2 border-[#4ade80]/30 pl-2 text-[0.525rem] italic text-[#bbf7d0]/55 break-words">&quot;{sec.content}&quot;</blockquote>;
              }
              if (sec.type === "code" && sec.content) {
                const lines = sec.content.split("\n").slice(0, 8);
                return <pre key={i} className="rounded bg-[#010a04] px-2 py-1.5 text-[0.45rem] leading-relaxed text-[#86efac]/60 overflow-x-auto">{lines.join("\n")}{sec.content.split("\n").length > 8 ? "\n…" : ""}</pre>;
              }
              if (sec.type === "info-block" && sec.label) {
                return <div key={i} className="flex gap-2 text-[0.5rem]"><span className="shrink-0 text-[#86efac]/35">{sec.label}</span><span className="text-[#d9fbe3]/70">{sec.value}</span></div>;
              }
              if (sec.type === "divider") {
                return <div key={i} className="border-t border-[#4ade80]/10" />;
              }
              return null;
            })}
          </div>

          {/* Taps + updated */}
          {(a.tapCount || a.updatedDate) && (
            <div className="flex gap-3 border-t border-[#4ade80]/8 pt-2 text-[0.45rem] text-[#86efac]/30">
              {a.tapCount ? <span>{a.tapCount.toLocaleString()} taps</span> : null}
              {a.updatedDate ? <span>Updated {formatDate(a.updatedDate)}</span> : null}
            </div>
          )}

          {/* Links */}
          <div className="border-t border-[#4ade80]/8 pt-2">
            <a href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-[0.5rem] text-[#86efac] underline underline-offset-2 hover:text-[#dcfce7] transition-colors">↗ Read full article</a>
          </div>
          {/* Spacer for scroll */}
          <div className="h-2" />
        </div>
      </div>
    );
  }

  // ── Generic preview (Spotify, clients, routes) ────────────────────────────
  const previewImages =
    preview.images?.length
      ? preview.images
      : preview.imageUrl
      ? [{ url: preview.imageUrl, alt: preview.imageAlt }]
      : [];

  return (
    <div className="flex h-full flex-col">
      {header}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 px-3 py-3">
        {previewImages.length > 0 && (
          <div className="flex flex-col gap-2">
            {previewImages.map((image, index) => (
              <PreviewImage key={`${image.url}-${index}`} url={image.url} alt={image.alt ?? preview.title} />
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="text-[0.65rem] font-semibold leading-snug text-[#d9fbe3]/90">{preview.title}</div>
          {preview.subtitle && <div className="text-[0.525rem] leading-snug text-[#86efac]/45">{preview.subtitle}</div>}
          {preview.caption && <div className="text-[0.525rem] leading-snug text-[#86efac]/30 break-words">{preview.caption}</div>}
          {preview.details?.length ? (
            <div className="space-y-0.5 pt-1">
              {preview.details.map((detail, index) => (
                <div key={`${detail}-${index}`} className="text-[0.525rem] leading-snug text-[#86efac]/55 break-words">{detail}</div>
              ))}
            </div>
          ) : null}
          {preview.quote && (
            <div className="rounded border border-[#4ade80]/12 bg-[#05160c]/70 px-2.5 py-2 text-[0.525rem] leading-snug italic text-[#bbf7d0]/70 break-words">
              &quot;{preview.quote}&quot;
            </div>
          )}
        </div>

        {preview.linkUrl && (
          <a href={preview.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[0.525rem] text-[#86efac] underline underline-offset-2 hover:text-[#dcfce7] transition-colors">
            ↗ {preview.linkLabel ?? "View"}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Browser content filter ───────────────────────────────────────────────────

// ─── Browser Panel ────────────────────────────────────────────────────────────

function BrowserPanel({
  url,
  onClose,
  onNavigate,
  onTitleBarDragStart,
  minimized,
}: {
  url: string;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onMinimize: () => void;
  onTitleBarDragStart?: (e: React.MouseEvent) => void;
  minimized: boolean;
}) {
  const [inputVal, setInputVal] = React.useState(url);
  const [loadKey, setLoadKey] = React.useState(0);
  const [blockedUrl, setBlockedUrl] = React.useState<string | null>(null);
  const [glitchBars, setGlitchBars] = React.useState<
    Array<{ top: number; height: number; shift: number; color: string; skew: number }>
  >([]);

  React.useEffect(() => {
    setInputVal(url);
    setBlockedUrl(null);
    setLoadKey((k) => k + 1);
  }, [url]);

  // Periodic glitch bursts — more frequent and more intense
  React.useEffect(() => {
    if (minimized) return;
    const interval = window.setInterval(() => {
      const roll = Math.random();
      if (roll < 0.3) {
        const count = 1 + Math.floor(Math.random() * 3);
        const bars = Array.from({ length: count }, () => ({
          top: 2 + Math.random() * 88,
          height: 0.3 + Math.random() * 5,
          shift: (Math.random() - 0.5) * 22,
          skew: (Math.random() - 0.5) * 4,
          color: Math.random() < 0.6
            ? `rgba(74,222,128,${0.07 + Math.random() * 0.12})`
            : Math.random() < 0.5
            ? `rgba(255,${Math.floor(Math.random() * 80)},80,${0.06 + Math.random() * 0.1})`
            : `rgba(255,255,255,${0.03 + Math.random() * 0.06})`,
        }));
        setGlitchBars(bars);
        const dur = 40 + Math.random() * 110;
        window.setTimeout(() => setGlitchBars([]), dur);
      }
    }, 2200);
    return () => window.clearInterval(interval);
  }, [minimized]);

  function navigate(rawUrl: string) {
    const nav = rawUrl.trim();
    if (!nav) return;
    const { url: safeUrl, blocked } = sanitizeBrowseUrl(nav);
    if (blocked) {
      setBlockedUrl(safeUrl);
      return;
    }
    if (!safeUrl) return;
    setBlockedUrl(null);
    onNavigate(safeUrl);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mac-style title bar — drag area */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-[#4ade80]/10 bg-[#020b05]/95 px-2.5 py-1.5 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={(e) => {
          // Only drag from the bar background (not from inputs/buttons)
          const target = e.target as HTMLElement;
          if (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.closest("button") || target.closest("input")) return;
          onTitleBarDragStart?.(e);
        }}
      >
        {/* Traffic lights */}
        <div className="flex shrink-0 items-center gap-[5px]">
          <button
            onClick={onClose}
            title="Close"
            className="h-[10px] w-[10px] rounded-full transition-opacity hover:opacity-80"
            style={{ background: "#ff5f57", boxShadow: "0 0 4px rgba(255,95,87,0.5)" }}
          />
          {/* Yellow = no-op */}
          <span
            className="block h-[10px] w-[10px] rounded-full"
            style={{ background: "#ffbd2e", boxShadow: "0 0 4px rgba(255,189,46,0.4)" }}
          />
          <button
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
            title="Open in new tab"
            className="h-[10px] w-[10px] rounded-full transition-opacity hover:opacity-80"
            style={{ background: "#28c840", boxShadow: "0 0 4px rgba(40,200,64,0.5)" }}
          />
        </div>

        {/* Address bar */}
        {!minimized && (
          <form
            className="flex min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(inputVal);
            }}
          >
            <input
              className="w-full min-w-0 rounded-sm border border-[#4ade80]/10 bg-[#031008] px-2 py-0.5 text-[0.525rem] text-[#d9fbe3]/85 placeholder-[#86efac]/20 outline-none transition-colors focus:border-[#4ade80]/35"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="https://example.com"
              style={{ textShadow: "0 0 6px rgba(74,222,128,0.1)" }}
            />
          </form>
        )}
      </div>

      {/* Content area — hidden when minimized */}
      {!minimized && (
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {blockedUrl ? (
            /* Blocked content screen */
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#020b05] px-6 text-center">
              <div className="text-[#ff5f57] text-[0.85rem] font-medium" style={{ textShadow: "0 0 12px rgba(255,95,87,0.5)" }}>
                ACCESS BLOCKED
              </div>
              <div className="text-[#86efac]/40 text-[0.5rem] leading-relaxed max-w-[220px]">
                This content has been blocked by the terminal browser&apos;s content filter.
              </div>
              <div className="text-[#86efac]/25 text-[0.45rem] font-mono break-all max-w-[220px]">
                {blockedUrl}
              </div>
              <button
                onClick={() => setBlockedUrl(null)}
                className="mt-1 text-[0.5rem] text-[#86efac]/35 underline hover:text-[#86efac]/70 transition-colors"
              >
                Go back
              </button>
            </div>
          ) : (
            <>
              <div className="absolute inset-0 overflow-hidden">
                <iframe
                  key={url}
                  src={url}
                  className="border-0 bg-white absolute top-0 left-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                  title="embedded browser"
                  style={{
                    filter: "brightness(0.84) saturate(0.80) contrast(1.06)",
                    transform: "scale(0.75)",
                    transformOrigin: "top left",
                    width: "133.33%",
                    height: "133.33%",
                  }}
                />
              </div>

              {/* Scrolling scanlines */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background: "repeating-linear-gradient(180deg, transparent 0px, transparent 2px, rgba(0,0,0,0.22) 2px, rgba(0,0,0,0.22) 3px)",
                  animation: "browserScanScroll 5s linear infinite",
                }}
              />

              {/* Phosphor green tint */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{ background: "rgba(10,255,90,0.028)", mixBlendMode: "screen" }}
              />

              {/* RGB chromatic edge aberration */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  boxShadow: "inset 3px 0 0 rgba(255,30,80,0.07), inset -3px 0 0 rgba(0,255,160,0.07)",
                  animation: "crtRgbShift 8s ease-in-out infinite",
                }}
              />

              {/* Horizontal scan beam */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-[4px]"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(74,222,128,0.05) 20%, rgba(74,222,128,0.11) 50%, rgba(74,222,128,0.05) 80%, transparent 100%)",
                  animation: "browserBeamSweep 3.5s linear infinite",
                }}
              />

              {/* Interlace drift */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{
                  background: "repeating-linear-gradient(180deg, transparent 0px, transparent 1px, rgba(0,0,0,0.06) 1px, rgba(0,0,0,0.06) 2px)",
                  animation: "crtInterlaceDrift 0.8s ease-in-out infinite",
                }}
              />

              {/* Vignette */}
              <div
                className="pointer-events-none absolute inset-0 z-20"
                style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,5,2,0.78) 100%)" }}
              />

              {/* Flicker overlay */}
              <div
                className="pointer-events-none absolute inset-0 z-10"
                style={{ animation: "browserFlicker 0.11s steps(2) infinite" }}
              />

              {/* Glitch bars */}
              {glitchBars.map((bar, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute inset-x-0 z-[25]"
                  style={{
                    top: `${bar.top}%`,
                    height: `${bar.height}%`,
                    transform: `translateX(${bar.shift}px) skewX(${bar.skew}deg)`,
                    background: bar.color,
                    mixBlendMode: "screen",
                  }}
                />
              ))}

              {/* Load static flash */}
              <div
                key={`static-${loadKey}`}
                className="pointer-events-none absolute inset-0 z-30"
                style={{
                  animation: "browserLoadStatic 0.5s steps(5) forwards",
                  background: "repeating-linear-gradient(0deg, rgba(0,28,10,0.92) 0px, rgba(0,0,0,0.88) 1px, transparent 1px, transparent 2px)",
                }}
              />

              {/* Corner brackets */}
              <div className="pointer-events-none absolute inset-0 z-20">
                <div className="absolute left-1.5 top-1.5 h-4 w-4 border-l-2 border-t-2 border-[#4ade80]/20" />
                <div className="absolute right-1.5 top-1.5 h-4 w-4 border-r-2 border-t-2 border-[#4ade80]/20" />
                <div className="absolute bottom-1.5 left-1.5 h-4 w-4 border-b-2 border-l-2 border-[#4ade80]/20" />
                <div className="absolute bottom-1.5 right-1.5 h-4 w-4 border-b-2 border-r-2 border-[#4ade80]/20" />
              </div>

              {/* Inner border glow */}
              <div
                className="pointer-events-none absolute inset-0 z-20"
                style={{ boxShadow: "inset 0 0 22px rgba(74,222,128,0.05)" }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TerminalExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const isTerminalRoute = pathname.startsWith("/terminal");
  const [floating, setFloating] = React.useState(false);
  const isThreeStage = isTerminalRoute && !floating;
  const [windowSize, setWindowSize] = React.useState({width:1100,height:760});
  const [mode, setMode] = React.useState<TerminalMode>("shell");
  const [tourStep, setTourStep] = React.useState<number|null>(null);
  const [tourTried, setTourTried] = React.useState(false);
  const tourDraftRef = React.useRef("");
  const [pet, setPet] = React.useState<TerminalPet>("cat");
  const [animation, setAnimation] = React.useState<TerminalAnimation>("type");
  const [highlight, setHighlight] = React.useState("");
  const [cursorEnabled, setCursorEnabled] = React.useState(true);
  const [pointerTarget, setPointerTarget] = React.useState<TerminalPointerTarget|null>(null);
  const resizeWindow = React.useCallback((size:{width:number;height:number}) => setWindowSize(size),[]);
  React.useEffect(()=>{
    try {
      const storedPet=localStorage.getItem("mdcran_terminal_pet");
      if (["cat","bot","crab","off"].includes(storedPet ?? "")) setPet(storedPet as TerminalPet);
      const storedAnimation=localStorage.getItem("mdcran_terminal_animation");
      if (["scan","type","off"].includes(storedAnimation ?? "")) setAnimation(storedAnimation as TerminalAnimation);
    } catch { /* Optional preferences. */ }
    const clamp=()=>setWindowSize(size=>terminalWindowSize(size.width,size.height,window.innerWidth,window.innerHeight));
    clamp();window.addEventListener("resize",clamp);return()=>window.removeEventListener("resize",clamp);
  },[]);
  const [active, setActive] = React.useState(false);
  const [powerState, setPowerState] = React.useState<PowerState>("off");
  const [dataVersion, setDataVersion] = React.useState(0);
  const [dataError, setDataError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<TerminalData | null>(null);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const latestLogsRef = React.useRef(logs);
  latestLogsRef.current = logs;
  const [input, setInput] = React.useState("");
  const [crtPulseTick, setCrtPulseTick] = React.useState(0);
  const [cwd, setCwd] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<PreviewState | null>(null);
  const [results, setResults] = React.useState<SearchHit[]>([]);
  const [selectedResultIdx, setSelectedResultIdx] = React.useState(0);
  const [resultsLabel, setResultsLabel] = React.useState("Search Results");
  const [formMode, setFormMode] = React.useState<FormMode>(null);
  const [formState, setFormState] = React.useState(EMPTY_FORM);
  const [busy, setBusy] = React.useState(false);
  const [inputFocused, setInputFocused] = React.useState(false);
  const [showStartupInputHint, setShowStartupInputHint] = React.useState(false);
  const [spotifyLive, setSpotifyLive] = React.useState<SpotifyViewState | null>(null);
  const [spotifyClock, setSpotifyClock] = React.useState(() => Date.now());
  const [browseUrl, setBrowseUrl] = React.useState<string | null>(null);
  const [browserMinimized, setBrowserMinimized] = React.useState(false);
  const [browserFloatPos, setBrowserFloatPos] = React.useState({ x: 0, y: 0 });
  const [browserFloatSize, setBrowserFloatSize] = React.useState({ w: 0, h: 0 });
  const browserFloatPosRef = React.useRef({ x: 0, y: 0 });
  const browserFloatSizeRef = React.useRef({ w: 0, h: 0 });
  const [isBrowserDragging, setIsBrowserDragging] = React.useState(false);
  const browserBodyRef = React.useRef<HTMLDivElement | null>(null);
  const prevBrowseUrlRef = React.useRef<string | null>(null);
  const [retroGifIdx, setRetroGifIdx] = React.useState(1);
  const [gifVisible, setGifVisible] = React.useState(false);
  const [gifEnabled, setGifEnabled] = React.useState(true);
  const [gameMode, setGameMode] = React.useState<"snake" | "pacman" | null>(null);
  const gameModeRef = React.useRef<"snake" | "pacman" | null>(null);
  React.useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);

  const transcriptRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const shellCaptureRef = React.useRef<HTMLDivElement | null>(null);
  const musicEnabledRef = React.useRef(true);
  const keystrokesEnabledRef = React.useRef(true);
  const aiRequestRef = React.useRef<AbortController | null>(null);
  const aiHistoryRef = React.useRef<TerminalTurn[]>([]);
  const aiEntryRef = React.useRef<string | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  React.useEffect(() => {
    try { musicEnabledRef.current = localStorage.getItem("mdcran_terminal_music") !== "off"; keystrokesEnabledRef.current = localStorage.getItem("mdcran_terminal_clicks") !== "off"; } catch { /* Optional device preferences. */ }
    return () => { aiRequestRef.current?.abort(); crtThemeRef.current?.pause(); };
  }, []);
  const crtThemeRef = React.useRef<HTMLAudioElement | null>(null);
  const powerTimeoutRef = React.useRef<number | null>(null);
  const refocusTimeoutRef = React.useRef<number | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const printBufferRef = React.useRef<AudioBuffer | null>(null);
  const lastPrintSoundRef = React.useRef(-1);
  const requestedRef = React.useRef(false);
  const comboRef = React.useRef(0);
  const historyRef = React.useRef<string[]>([]);
  const historyIdxRef = React.useRef(-1);
  const historyDraftRef = React.useRef("");
  const requestEpochRef = React.useRef(0);
  const sendingRef = React.useRef(false);
  const commandControlKeyRef = React.useRef<(key: string) => boolean>(() => false);
  const spotifyProgressEntryIds = React.useRef<{ time: string; bar: string } | null>(null);

  // Blur input while a game is running so key events go to the game, not the command bar.
  React.useEffect(() => {
    if (gameMode) {
      inputRef.current?.blur();
    } else {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [gameMode]);

  const debugTerminalEvent = React.useCallback((...args: unknown[]) => {
    void args;
  }, []);

  const getOrCreateCrtThemeAudio = React.useCallback(() => {
    if (!crtThemeRef.current) {
      const audio = new Audio("/crt-theme-song.mp3");
      audio.loop = false;
      audio.volume = 0.16;
      audio.muted = !musicEnabledRef.current;
      audio.ontimeupdate = () => {
        if (audio.currentTime >= CRT_THEME_LOOP_END_SECONDS) {
          audio.currentTime = CRT_THEME_LOOP_START_SECONDS;
        }
      };
      audio.onended = () => {
        if (!musicEnabledRef.current) return;
        audio.currentTime = CRT_THEME_LOOP_START_SECONDS;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === "function") {
          void playPromise.catch(() => {});
        }
      };
      crtThemeRef.current = audio;
    }

    return crtThemeRef.current;
  }, []);

  const focusCommandInput = React.useCallback(() => {
    const node = inputRef.current;
    if (!node) {
      debugTerminalEvent("focus-miss", { reason: "no-input-ref" });
      return;
    }
    if (gameModeRef.current || node.disabled) return;
    node.focus({ preventScroll: true });
  }, [debugTerminalEvent]);

  const focusTerminalSurface = React.useCallback(() => {
    if (powerState !== "on" || busy || gameModeRef.current) return;
    focusCommandInput();
  }, [busy, focusCommandInput, powerState]);

  const dismissStartupInputHint = React.useCallback(() => {
    setShowStartupInputHint(false);
  }, []);

  const scheduleCommandRefocus = React.useCallback(
    (delayMs = 140) => {
      if (typeof window === "undefined") return;
      if (refocusTimeoutRef.current) {
        window.clearTimeout(refocusTimeoutRef.current);
      }

      refocusTimeoutRef.current = window.setTimeout(() => {
        refocusTimeoutRef.current = null;
        if (powerState !== "on" || busy) return;

        const shellNode = shellCaptureRef.current;
        const activeNode = document.activeElement;

        if (!shellNode || activeNode === inputRef.current) return;
        if (
          activeNode instanceof Node &&
          activeNode !== document.body &&
          !shellNode.contains(activeNode)
        ) {
          return;
        }
        if (isEditableTarget(activeNode) && activeNode !== shellNode) return;

        focusCommandInput();
      }, delayMs);
    },
    [busy, focusCommandInput, powerState]
  );

  React.useEffect(() => {
    return () => {
      if (powerTimeoutRef.current) window.clearTimeout(powerTimeoutRef.current);
      if (refocusTimeoutRef.current) {
        window.clearTimeout(refocusTimeoutRef.current);
        refocusTimeoutRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (powerState !== "on") return;
    setCrtPulseTick((current) => current + 1);
  }, [powerState, logs.length, results.length, preview?.title, spotifyLive?.track.title, busy]);

  const searchAutocomplete = React.useMemo(() => {
    if (!data) return [] as string[];

    const seen = new Set<string>();
    const values: string[] = [];
    const push = (value?: string) => {
      const next = value?.trim();
      if (!next) return;
      const key = next.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      values.push(next);
    };

    Object.keys(ROUTES).forEach(push);
    ROOTS.forEach(push);

    for (const project of data.projects) {
      push(project.slug);
      push(project.title);
      push(project.description);
      push(project.longDescription);
      push(project.category);
      push(project.subcategory);
      project.tags?.forEach(push);
      project.clientIds?.forEach((clientId) => {
        push(clientId);
        push(data.clients.find((client) => client.id === clientId)?.name);
      });
    }

    for (const article of data.articles) {
      push(article.slug);
      push(article.title);
      push(article.excerpt);
      push(article.category);
      article.tags?.forEach(push);
    }

    for (const client of data.clients) {
      push(client.id);
      push(client.name);
      push(client.bio);
      client.roles?.forEach(push);
      client.socialLinks?.forEach((link) => {
        push(link.platform);
        push(link.handle);
        push(link.title);
      });
    }

    return values.sort((a, b) => a.localeCompare(b));
  }, [data]);

  const entityAutocomplete = React.useMemo(() => {
    if (!data) return [] as string[];

    const values = [
      ...data.projects.map((project) => project.slug),
      ...data.articles.map((article) => article.slug),
      ...data.clients.map((client) => client.id),
    ];

    return values
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Context-aware cd completions: mirrors exactly what `ls` shows at the current path.
  const cdContextCompletions = React.useMemo(() => {
    const all = new Set<string>();
    all.add("..");
    all.add("/");
    if (data) {
      const items = directoryItems(cwd, data);
      for (const item of items) {
        // Directory entries are formatted as "  ▸  {name}/"
        const m = item.match(/\[DIR \]\s+(.+?)\/\s*$/);
        if (m) all.add(m[1]);
      }
    } else {
      // Fallback before data loads: root-level dirs
      if (pathLabel(cwd) === "/") {
        for (const root of ROOTS) all.add(root);
      }
    }
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [cwd, data]);

  // Ghost text autocomplete suggestion
  const ghostSuffix = React.useMemo(() => {
    if (!input) return "";

    const val = input.trimStart();
    if (!val) return "";

    const commandMatch = val.match(/^\/?(\S+)(?:\s+(.*))?$/);
    const command = commandMatch?.[1]?.toLowerCase() ?? "";
    const arg = commandMatch?.[2] ?? "";

    if (!val.includes(" ")) {
      const isSlash = val.startsWith("/");
      const lookup = isSlash ? val.slice(1) : val;
      if (!lookup) return "";
      const match = COMMANDS.find((c) => c.startsWith(lookup.toLowerCase()) && c !== lookup.toLowerCase());
      return match ? `${match.slice(lookup.length)} ` : "";
    }

    if (command === "search") {
      const query = arg.trimStart();
      if (!query) return "";
      const normalizedQuery = normalize(query);
      const match = searchAutocomplete.find((candidate) => {
        const normalizedCandidate = normalize(candidate);
        return (
          normalizedCandidate.startsWith(normalizedQuery) &&
          normalizedCandidate !== normalizedQuery
        );
      });

      return match ? match.slice(query.length) : "";
    }

    if (command === "open" || command === "nano") {
      const query = arg.trimStart();
      if (!query) return "";
      const normalizedQuery = normalize(query);
      const match = entityAutocomplete.find(
        (candidate) =>
          candidate.startsWith(normalizedQuery) && candidate !== normalizedQuery
      );
      return match ? `${match.slice(query.length)} ` : "";
    }

    if (command === "cd") {
      const query = arg.trimStart();
      if (!query) return "";
      const normalizedQuery = normalize(query);
      const match = cdContextCompletions.find(
        (candidate) =>
          candidate.toLowerCase().startsWith(normalizedQuery) &&
          candidate.toLowerCase() !== normalizedQuery
      );
      return match ? `${match.slice(query.length)} ` : "";
    }

    if (command === "select") {
      if (!results.length) return "";
      const query = arg.trimStart();
      const options = results.map((_, index) => String(index + 1));
      if (!query) {
        return `${options[0]} `;
      }
      const match = options.find(
        (option) => option.startsWith(query) && option !== query
      );
      return match ? `${match.slice(query.length)} ` : "";
    }

    if (command === "contact" || command === "subscribe" || command === "unsubscribe") {
      const slotOrder =
        command === "contact"
          ? ["name", "email", "subject", "message", "phone"]
          : command === "subscribe"
          ? ["name", "contact"]
          : ["contact"];
      const parsed = parseArguments(arg);
      const currentIndex =
        parsed.hasTrailingSpace && !parsed.activeQuote
          ? parsed.values.length
          : Math.max(0, parsed.values.length - 1);
      const currentValue =
        parsed.hasTrailingSpace && !parsed.activeQuote
          ? ""
          : parsed.values[parsed.values.length - 1] ?? "";

      if (parsed.activeQuote) {
        return `${parsed.activeQuote} `;
      }

      if (!currentValue && currentIndex < slotOrder.length) {
        return '"" ';
      }
    }

    return "";
  }, [cdContextCompletions, entityAutocomplete, input, results, searchAutocomplete]);

  const commandUsageHint = React.useMemo(() => {
    const raw = input.trimStart();
    if (!raw) return "";
    const command = (raw.match(/^\/?(\S+)/)?.[1] ?? "").toLowerCase();

    if (command === "contact") {
      return 'contact <name> <email> <subject> <message> [phone]';
    }
    if (command === "subscribe") {
      return "subscribe <name> <email-or-phone>";
    }
    if (command === "unsubscribe") {
      return "unsubscribe <email-or-phone>";
    }
    if (command === "search") {
      return 'search <query>';
    }
    if (command === "open" || command === "nano") {
      return `${command} <slug>`;
    }
    if (command === "cd") {
      return "cd <path>";
    }
    return "";
  }, [input]);

  const activePreview = React.useMemo(
    () => (spotifyLive ? spotifyPreviewState(spotifyLive, spotifyClock) : preview),
    [preview, spotifyLive, spotifyClock]
  );
  const handleThreeSceneStateChange = React.useCallback(() => {}, []);

  // ── append helper ──────────────────────────────────────────────────────────
  const append = React.useCallback((entries: LogEntry[]) => {
    setLogs((prev) => [...prev, ...entries].slice(-2000));
  }, []);

  const clearPreview = React.useCallback(() => {
    setPreview(null);
  }, []);

  const playPowerSfx = React.useCallback((mode: "start" | "stop") => {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new Ctx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.18), ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * 0.24;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = mode === "start" ? "highpass" : "lowpass";
    noiseFilter.frequency.value = mode === "start" ? 800 : 3200;
    noise.connect(noiseFilter);
    noiseFilter.connect(master);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(master);

    if (mode === "start") {
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(2100, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.22);
      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    } else {
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.34);
      oscGain.gain.setValueAtTime(0.1, now);
      oscGain.gain.exponentialRampToValueAtTime(0.02, now + 0.14);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      master.gain.setValueAtTime(0.16, now);
      master.gain.exponentialRampToValueAtTime(0.07, now + 0.1);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    }

    noise.start(now);
    noise.stop(now + (mode === "start" ? 0.18 : 0.22));
    osc.start(now);
    osc.stop(now + (mode === "start" ? 0.26 : 0.4));
  }, []);

  // Helper: get or create an AudioContext and ensure it's running before use
  const getAudioCtx = React.useCallback((): Promise<AudioContext> | null => {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioContextRef.current) audioContextRef.current = new Ctx();
    const ctx = audioContextRef.current;
    if (ctx.state === "running") return Promise.resolve(ctx);
    return ctx.resume().then(() => ctx).catch(() => null) as Promise<AudioContext>;
  }, []);

  const unlockAudioCtx = React.useCallback(() => {
    const ctxP = getAudioCtx();
    if (!ctxP) return;
    void ctxP.then(() => {});
  }, [getAudioCtx]);

  // Keyboard click for each character typed
  const playTypeSfx = React.useCallback(() => {
    if (!keystrokesEnabledRef.current) return;
    const ctxP = getAudioCtx();
    if (!ctxP) return;
    void ctxP.then((ctx) => {
      if (!ctx) return;
      const now = ctx.currentTime;

      // Short noise burst — mechanical key click
      const bufLen = Math.floor(ctx.sampleRate * 0.028);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.2);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 2400 + Math.random() * 1000;
      filter.Q.value = 1.2;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18 + Math.random() * 0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.03);
    });
  }, [getAudioCtx]);

  // Called only after new characters are committed to the transcript. Never
  // resume audio asynchronously here: a late resume would produce stale clicks.
  const playPrintSfx = React.useCallback(() => {
    const ctx = audioContextRef.current;
    if (!keystrokesEnabledRef.current || document.hidden || ctx?.state !== "running") return;
    const now = ctx.currentTime;
    if (now - lastPrintSoundRef.current < .02) return;
    lastPrintSoundRef.current = now;
    if (!printBufferRef.current) {
      const bufLen = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      printBufferRef.current = buf;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = printBufferRef.current;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3600 + Math.random() * 600;
    filter.Q.value = 1.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    noise.start(now);
    noise.stop(now + 0.014);
  }, []);

  // Mechanical "enter" thump when a command is submitted
  const playCommandSfx = React.useCallback(() => {
    if (!keystrokesEnabledRef.current) return;
    const ctxP = getAudioCtx();
    if (!ctxP) return;
    void ctxP.then((ctx) => {
      if (!ctx) return;
      const now = ctx.currentTime;
      const bufLen = Math.floor(ctx.sampleRate * 0.09);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.6);
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 700;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.32, now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
      noise.connect(lpf);
      lpf.connect(master);
      master.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.05);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.14, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.09);
      osc.start(now);
      osc.stop(now + 0.055);
    });
  }, [getAudioCtx]);

  const startTerminalShell = React.useCallback(() => {
    if (powerTimeoutRef.current) {
      window.clearTimeout(powerTimeoutRef.current);
      powerTimeoutRef.current = null;
    }
    if (active && powerState !== "stopping") return;
    setInput("");
    setShowStartupInputHint(true);
    setBrowseUrl(null);
    prevBrowseUrlRef.current = null;
    setBrowserMinimized(false);
    setPreview(null);
    setSpotifyLive(null);
    setResults([]);
    setActive(true);
    setPowerState("starting");
    playPowerSfx("start");
    powerTimeoutRef.current = window.setTimeout(() => {
      setPowerState("on");
      powerTimeoutRef.current = null;
    }, TERMINAL_APPEAR_MS);
  }, [active, playPowerSfx, powerState]);

  // "Turn On TV" button handler — must be in a click event for audio gesture context.
  // Animation starts immediately; content reveals after TERMINAL_APPEAR_MS.
  const handleTurnOn = React.useCallback(() => {
    if (window.innerWidth < 900) setFloating(true);
    unlockAudioCtx();
    const audio = getOrCreateCrtThemeAudio();
    if (musicEnabledRef.current) void audio.play().catch(() => {});
    startTerminalShell();
  }, [getOrCreateCrtThemeAudio, startTerminalShell, unlockAudioCtx]);

  const startTerminal = React.useCallback(() => {
    if (!isTerminalRoute) {
      router.push("/terminal");
      return;
    }
    startTerminalShell();
  }, [isTerminalRoute, router, startTerminalShell]);

  const closeTerminal = React.useCallback(() => {
    if (!active || powerState === "stopping") return;
    if (powerTimeoutRef.current) {
      window.clearTimeout(powerTimeoutRef.current);
      powerTimeoutRef.current = null;
    }
    if (crtThemeRef.current) {
      crtThemeRef.current.pause();
      crtThemeRef.current.currentTime = 0;
    }
    requestEpochRef.current += 1;
    aiRequestRef.current?.abort();
    aiRequestRef.current = null;
    setAiBusy(false);
    setTourStep(null);
    setMode("shell");
    setPointerTarget(null);
    setHighlight("");
    // Reset all overlays so they're gone when the terminal reopens
    setBrowseUrl(null);
    prevBrowseUrlRef.current = null;
    setBrowserMinimized(false);
    setPreview(null);
    setSpotifyLive(null);
    setResults([]);
    setGameMode(null);
    setFormMode(null);
    setFormState(EMPTY_FORM);
    setPowerState("stopping");
    playPowerSfx("stop");
    powerTimeoutRef.current = window.setTimeout(() => {
      setActive(false);
      setPowerState("off");
      powerTimeoutRef.current = null;
    }, TERMINAL_CLOSE_MS);
  }, [active, playPowerSfx, powerState]);

  // ── Retro GIF background cycling + appear/hide ─────────────────────────────
  React.useEffect(() => {
    // Hide GIF instantly when terminal is off or stopping
    if (powerState === "off" || powerState === "stopping") {
      setGifVisible(false);
      return;
    }
    if (!isThreeStage) return;
    // Show GIF after TERMINAL_GIF_DELAY_MS once terminal is on
    const appearTimer = window.setTimeout(() => {
      setGifVisible(true);
      function schedule() {
        const delay = 2000 + Math.random() * 2000;
        cycleTimer = window.setTimeout(() => {
          setRetroGifIdx((prev) => {
            let next = prev;
            while (next === prev) next = Math.floor(Math.random() * 5) + 1;
            return next;
          });
          schedule();
        }, delay);
      }
      schedule();
    }, TERMINAL_GIF_DELAY_MS);
    let cycleTimer: number;
    return () => {
      window.clearTimeout(appearTimer);
      window.clearTimeout(cycleTimer);
    };
  }, [isThreeStage, powerState]);

  // ── Data loading ───────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!active || data || requestedRef.current) return;
    requestedRef.current = true;
    setLoading(true);
    const controller = new AbortController();
    fetch("/api/data/terminal", { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<TerminalData>;
      })
      .then((d) => {
        validateTerminalSnapshot(d);
        if (controller.signal.aborted) return;
        setDataError(false);
        setData(d);
        setLoading(false);
        if (dataVersion > 0) append([logText("  Portfolio data refreshed.", "success")]);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDataError(true);
        setLoading(false);
        append([logText("  ⚠ Failed to load terminal data. Type reload to retry.", "error")]);
      });
    return () => { controller.abort(); requestedRef.current = false; };
  }, [active, data, append, dataVersion]);

  // ── Konami code detection ──────────────────────────────────────────────────
  React.useEffect(() => {
    if (active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && !e.metaKey && e.key.toLowerCase() === "t") {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        startTerminal();
        return;
      }
      if (e.key === KONAMI[comboRef.current]) {
        comboRef.current++;
        if (comboRef.current === KONAMI.length) {
          comboRef.current = 0;
          startTerminal();
        }
      } else {
        comboRef.current = e.key === KONAMI[0] ? 1 : 0;
      }
    };
    const onOpenTerminal = () => {
      startTerminal();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mdcran:open-terminal", onOpenTerminal as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mdcran:open-terminal", onOpenTerminal as EventListener);
    };
  }, [active, startTerminal]);

  React.useEffect(() => {
    if (isTerminalRoute) {
      // Don't auto-start — user must click "Turn On TV" for audio gesture
      return;
    }

    if (!active && powerState === "off") return;

    if (powerTimeoutRef.current) {
      window.clearTimeout(powerTimeoutRef.current);
      powerTimeoutRef.current = null;
    }
    setActive(false);
    setPowerState("off");
  }, [active, isTerminalRoute, powerState, startTerminalShell]);

  // ── Initialize on open ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!active) return;
    aiHistoryRef.current = [];
    aiRequestRef.current?.abort();
    aiRequestRef.current = null;
    setAiBusy(false);
    setCwd([]);
    setPreview(null);
    setResults([]);
    setSelectedResultIdx(0);
    setResultsLabel("Search Results");
    setFormMode(null);
    setFormState(EMPTY_FORM);
    historyIdxRef.current = -1;
    setLogs([]);

    // The same character queue handles boot text and ordinary command output.
    const timer = window.setTimeout(() => setLogs(previous => [...previous,
      logText(ASCII, "accent"),
      logText(""),
      logText("  MDCRAN CLI · YOUR PORTFOLIO WORKSPACE", "accent"),
      logText('  Type "help" for commands  |  Type "exit" to close', "muted"),
      logText("  resume · recruiter · search · tour · mode ai", "success"),
      logText("  Start typing anywhere. Tab completes commands.", "muted"),
      logText(""),
    ]), TERMINAL_TEXT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  React.useEffect(() => {
    if (!active || powerState !== "on") return;
    const focusTimer = window.setTimeout(() => focusTerminalSurface(), 60);
    return () => window.clearTimeout(focusTimer);
  }, [active, focusTerminalSurface, powerState]);

  React.useEffect(() => {
    if (!active || powerState !== "on" || busy) return;

    const onWindowEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.metaKey || e.ctrlKey || e.altKey) return;

      // Let games handle Escape to exit the game first
      if (gameModeRef.current) return;

      const shellNode = shellCaptureRef.current;
      const target = e.target;

      if (
        shellNode &&
        target instanceof Node &&
        !shellNode.contains(target) &&
        isEditableTarget(target)
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (tourStep !== null) {
        setTourStep(null);
        setPointerTarget(null);
        focusCommandInput();
        return;
      }
      closeTerminal();
    };

    window.addEventListener("keydown", onWindowEscape, true);
    return () => {
      window.removeEventListener("keydown", onWindowEscape, true);
    };
  }, [active, busy, closeTerminal, focusCommandInput, powerState, tourStep]);

  React.useEffect(() => {
    if (!active || powerState !== "on" || busy) return;

    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest("select,input,textarea,[contenteditable=true],[role=dialog]")) return;
      if (e.target instanceof Element && e.target.closest("button,a") && (e.key.length !== 1 || e.key === " ")) return;
      if (window.getSelection()?.toString()) return;

      // Let games handle their own keyboard input
      if (gameModeRef.current) return;

      const key = e.key;
      const activeNode = document.activeElement;
      const target = e.target;
      const ownInputFocused = activeNode === inputRef.current;
      const typingInOtherEditable =
        isEditableTarget(target) && target !== inputRef.current && activeNode !== inputRef.current;

      if (typingInOtherEditable) return;

      if (ownInputFocused) return;

      if (commandControlKeyRef.current(key)) {
        e.preventDefault();
        focusCommandInput();
        return;
      }

      if (key === "Tab") return;

      if (key.length === 1) {
        e.preventDefault();
        focusCommandInput();
        setInput((current) => current + key);
        setCrtPulseTick((current) => current + 1);
        playTypeSfx();
        return;
      }

      if (key === "Backspace") {
        e.preventDefault();
        focusCommandInput();
        setInput((current) => current.slice(0, -1));
        playTypeSfx();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown, true);
    };
  }, [active, busy, focusCommandInput, playTypeSfx, powerState]);

  const followOutputRef = React.useRef(true);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  const followTranscriptOutput = React.useCallback(() => {
    if (transcriptRef.current && followOutputRef.current && !window.getSelection()?.toString()) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, []);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);

  React.useEffect(() => {
    // Stop audio fully only on off/stopping; let "starting" audio (from button click) keep playing.
    if (powerState === "off" || powerState === "stopping") {
      if (crtThemeRef.current) {
        crtThemeRef.current.pause();
        crtThemeRef.current.currentTime = 0;
      }
      return;
    }

    if (powerState === "starting") {
      // Audio may already be playing from the "Turn On TV" click handler.
      return;
    }

    // powerState === "on"
    getOrCreateCrtThemeAudio();

    const tryPlay = () => {
      const audio = crtThemeRef.current;
      if (!audio || !musicEnabledRef.current) return;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch(() => {});
      }
    };

    tryPlay();
    window.addEventListener("pointerdown", tryPlay, { passive: true });
    window.addEventListener("keydown", tryPlay);

    return () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
      if (crtThemeRef.current) {
        crtThemeRef.current.pause();
        crtThemeRef.current.currentTime = 0;
      }
    };
  }, [getOrCreateCrtThemeAudio, powerState]);

  React.useEffect(() => {
    if (!spotifyLive) return;
    const interval = window.setInterval(() => {
      setSpotifyClock(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [spotifyLive]);

  // Update the Spotify progress bar + time entries in the chat log every second
  React.useEffect(() => {
    const ids = spotifyProgressEntryIds.current;
    if (!ids || !spotifyLive || !spotifyLive.track.isPlaying) return;
    const now = Date.now();
    const activeTrack = resolveSpotifyTrack(spotifyLive.track);
    const progressMs = spotifyProgressNow(spotifyLive, now);
    const durationMs = activeTrack?.durationMs;
    setLogs((prev) =>
      prev.map((entry) => {
        if (entry.id === ids.time) {
          return { ...entry, text: `  ${durationText(progressMs)} / ${durationText(durationMs)}`, instant: true };
        }
        if (entry.id === ids.bar) {
          return { ...entry, text: `  ${progressBar(progressMs, durationMs)}`, instant: true };
        }
        return entry;
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyClock]);

  // Initialize browser floating position/size when browseUrl is first set
  React.useEffect(() => {
    if (!browseUrl || browseUrl === prevBrowseUrlRef.current) return;
    prevBrowseUrlRef.current = browseUrl;
    // Use a tiny timeout to let the body div mount and measure
    const t = window.setTimeout(() => {
      const body = browserBodyRef.current;
      if (!body) return;
      const w = Math.max(320, Math.round(body.offsetWidth * 0.54));
      const h = Math.max(280, Math.round(body.offsetHeight * 0.72));
      const x = body.offsetWidth - w - 8;
      const y = body.offsetHeight - h - 8;
      browserFloatPosRef.current = { x, y };
      browserFloatSizeRef.current = { w, h };
      setBrowserFloatPos({ x, y });
      setBrowserFloatSize({ w, h });
    }, 30);
    return () => window.clearTimeout(t);
  }, [browseUrl]);

  // ────────────────────────────────────────────────────────────────────────────
  // Command dispatch
  // ────────────────────────────────────────────────────────────────────────────

  function execute(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    followOutputRef.current = true;
    requestEpochRef.current += 1;
    historyRef.current = [trimmed, ...historyRef.current.slice(0, 49)];
    historyIdxRef.current = -1;

    append([logText(""), logPrompt(`${promptLabel(cwd)} ${trimmed}`)]);

    const commandMatch = trimmed.match(/^\/?(\S+)(?:\s+(.*))?$/);
    const rawCmd = (commandMatch?.[1] ?? "").toLowerCase();
    // Normalize: strip leading slash so both "ls" and "/ls" work the same
    const cmd = rawCmd.startsWith("/") ? rawCmd.slice(1) : rawCmd;
    const rest = commandMatch?.[2] ?? "";
    if (mode !== "shell" && !trimmed.startsWith("/") && !(COMMANDS as readonly string[]).includes(cmd) && !/^\d+$/.test(cmd)) { void doAsk(trimmed); return; }
    if (cmd === "agent") {
      setMode("ai");
      if (rest.trim()) void doAsk(rest.trim(), true);
      else append([logText("  AI chat. Use agent <request> to open a project or show resume evidence. Switch to Shell for commands.", "success")]);
      return;
    }
    if (cmd === "ai" && ["on","off"].includes(rest.trim())) { setMode(rest.trim()==="on"?"ai":"shell"); append([logText(`  Mode: ${rest.trim()==="on"?"AI chat":"Shell"}`,"success")]); return; }
    if (cmd === "ask" || cmd === "ai") {
      if (!rest.trim()) { setMode("ai"); append([logText("  AI chat mode. Type your question naturally; /help for commands, mode shell to return.","success")]); }
      else void doAsk(rest.trim());
      return;
    }
    const passiveCommand = ["stop", "togglemusic", "togglekeystrokeclicks", "window", "pet", "animations", "cursor", "highlight", "focus"].includes(cmd);
    if (!passiveCommand) stopAI(false);
    const parsed = parseArguments(rest);
    if (parsed.activeQuote) {
      append([logText("  Unclosed quote. Close the quotation mark and try again.", "error")]);
      return;
    }
    const args = parsed.values;
    const textArgument = args.join(" ");

    // Numeric shortcut for selecting search results
    if (/^\d+$/.test(cmd) && results.length > 0) {
      openResult(parseInt(cmd, 10) - 1);
      return;
    }

    if (!passiveCommand && !["open", "nano", "select", "browse", "browser"].includes(cmd)) {
      clearPreview();
    }
    if (!passiveCommand && !["browse", "browser"].includes(cmd) && browseUrl) {
      setBrowseUrl(null);
      prevBrowseUrlRef.current = null;
    }
    if (!passiveCommand && cmd !== "spotify") {
      setSpotifyLive(null);
    }

    switch (cmd) {
      case "mode":
        if (["shell","ai"].includes(textArgument)) { setMode(textArgument as TerminalMode); append([logText(`  ${textArgument === "shell" ? "Shell" : "AI chat"}. ${textArgument === "shell" ? "Enter commands; help lists them." : "Ask naturally. /help lists commands; switch to Shell to return."}`,"success")]); }
        else append([logText("  Usage: mode shell | ai", "muted")]);
        break;
      case "tour": doTour(textArgument); break;
      case "next": doTour("next"); break;
      case "back": doTour("back"); break;
      case "recruiter": doRecruiter(args); break;
      case "skills": doRecruiter(["skills",...args]); break;
      case "experience": doResume("experience"); break;
      case "education": doResume("education"); break;
      case "highlight": doHighlight(textArgument); break;
      case "cursor":
        if (!["on","off"].includes(textArgument)) append([logText("  cursor on | off — toggle the assistant’s visual pointer", "muted")]);
        else { setCursorEnabled(textArgument === "on"); if(textArgument==="off")setPointerTarget(null); append([logText(`  Assistant pointer ${textArgument}.`,"success")]); }
        break;
      case "pet":
        if (["cat","bot","crab","off"].includes(textArgument)) {setPet(textArgument as TerminalPet);savePreference("pet",textArgument);append([logText(`  Terminal pet: ${textArgument}`,"success")]);}
        else append([logText("  pet cat | bot | crab | off — choose a companion", "muted")]);
        break;
      case "animations":
        if (["scan","type","off"].includes(textArgument)) {setAnimation(textArgument as TerminalAnimation);savePreference("animation",textArgument);append([logText(`  Text animations: ${textArgument}. Reduced-motion preferences are respected.`,"success")]);}
        else append([logText("  animations scan | type | off", "muted")]);
        break;
      case "window": doWindow(args); break;
      case "focus": focusCommandInput(); break;
      case "togglemusic":
        toggleAudio("music", args[0]);
        break;
      case "togglekeystrokeclicks":
        toggleAudio("clicks", args[0]);
        break;
      case "stop":
        stopAI();
        break;
      case "about":
        doAbout();
        break;
      case "reload":
        requestedRef.current = false;
        setData(null);
        setDataError(false);
        setDataVersion(value => value + 1);
        append([logText("  Reloading terminal data...", "muted")]);
        break;
      case "?":
      case "help":
        doHelp();
        break;
      case "clear":
      case "cls":
        doClear();
        break;
      case "home":
        doHome();
        break;
      case "ls":
        doLs();
        break;
      case "pwd":
        doPwd();
        break;
      case "cd":
        doCd(textArgument);
        break;
      case "open":
      case "nano":
        doOpen(textArgument);
        break;
      case "search":
        doSearch(textArgument);
        break;
      case "select":
        doSelect(args[0]);
        break;
      case "clients":
        doClients();
        break;
      case "featured":
        doFeatured();
        break;
      case "projects":
        doProjects();
        break;
      case "articles":
        doArticles();
        break;
      case "resume":
        doResume(textArgument || "all");
        break;
      case "contact":
        void doStartForm("contact", rest);
        break;
      case "subscribe":
        void doStartForm("subscribe", rest);
        break;
      case "unsubscribe":
        void doStartForm("unsubscribe", rest);
        break;
      case "set":
        doSet(args[0] ?? "", args.slice(1).join(" "));
        break;
      case "send":
        void doSend();
        break;
      case "cancel":
        doCancel();
        break;
      case "spotify":
        void doSpotify();
        break;
      case "browse":
      case "browser":
        doBrowse(textArgument);
        break;
      case "togglebackground":
        doToggleBackground();
        break;
      case "terms":
        doTerms();
        break;
      case "privacy":
        doPrivacy();
        break;
      case "visitors":
        doVisitors();
        break;
      case "snake":
        setGameMode("snake");
        append([logText("  Starting Snake... ESC to exit", "success")]);
        break;
      case "pacman":
        setGameMode("pacman");
        append([logText("  Starting Pac-Man... ESC to exit", "success")]);
        break;
      case "exit":
        closeTerminal();
        break;
      case "quit":
      case "q":
        if (gameModeRef.current) {
          setGameMode(null);
          append([logText("  Game exited.", "success")]);
        } else {
          closeTerminal();
        }
        break;
      default:
        append([
          logText(
            `  ${cmd}: command not found — Type "help" for commands`,
            "error"
          ),
        ]);
    }
  }

  function toggleAudio(kind: "music" | "clicks", value?: string) {
    const ref = kind === "music" ? musicEnabledRef : keystrokesEnabledRef;
    if (value && !["on", "off"].includes(value.toLowerCase())) { append([logText(`  Usage: toggle${kind === "music" ? "music" : "keystrokeclicks"} [on|off]`, "error")]); return; }
    const next = value ? value.toLowerCase() === "on" : !ref.current;
    ref.current = next;
    try { localStorage.setItem(`mdcran_terminal_${kind}`, next ? "on" : "off"); } catch { /* Optional device preference. */ }
    if (kind === "music") {
      const audio = getOrCreateCrtThemeAudio();
      audio.muted = !next;
      if (next) void audio.play().catch(() => append([logText("  Music could not play. Try togglemusic on again after interacting with the terminal.", "error")]));
      else audio.pause();
    }
    append([logText(`  ${kind === "music" ? "Music" : "Keystroke clicks"}: ${next ? "on" : "off"}`, "success")]);
  }

  function stopAI(announce = true) {
    if (!aiRequestRef.current) { if (announce) append([logText("  No AI response in progress.", "muted")]); return; }
    aiRequestRef.current.abort();
    aiRequestRef.current = null;
    setAiBusy(false);
    const id = aiEntryRef.current;
    setLogs(previous => previous.map(entry => entry.id === id ? { ...entry, text: `${entry.text === "  Michael is thinking..." ? "" : entry.text}\n  [Response stopped]`, instant: true } : entry));
  }

  async function doAsk(question: string, agentMode = false) {
    if (question.toLowerCase() === "clear") { stopAI(false); aiHistoryRef.current = []; append([logText("  AI conversation cleared.", "success")]); return; }
    if (!question) { append([logText('  ask <question> (or ai <question>) — ask Michael’s portfolio assistant.'), logText('  Example: ask What AI projects has Michael built?'), logText('  Follow-up questions keep context. Use ai clear to reset; stop or Ctrl+C cancels.', "muted")]); return; }
    if (aiRequestRef.current) { append([logText("  An answer is still streaming. Type stop before asking another question.", "muted")]); return; }
    if (question.length > 4000) { append([logText("  Keep questions under 4,000 characters.", "error")]); return; }
    clearPreview();
    setHighlight("");
    setSpotifyLive(null);
    setResults([]);
    const controller = new AbortController();
    aiRequestRef.current = controller;
    setAiBusy(true);
    const entry = { ...logText("  Michael is thinking...", "accent"), instant: true };
    aiEntryRef.current = entry.id;
    append([entry]);
    try {
      const answer = await streamTerminalAnswer({ question, agent: agentMode, history: aiHistoryRef.current, signal: controller.signal,
        onText: text => { if (!controller.signal.aborted) setLogs(previous => previous.map(line => line.id === entry.id ? { ...line, text: `  MICHAEL\n  ${text}`, instant: false } : line)); } });
      if (controller.signal.aborted) return;
      aiHistoryRef.current = [...aiHistoryRef.current, { role: "user", content: question }, { role: "assistant", content: answer.text.slice(0,6000) }].slice(-12) as TerminalTurn[];
      if (answer.sources.length) append([logLinks(answer.sources)]);
      if (agentMode && data) {
        const actions=terminalActions(answer.actions,data.projects);
        for (const action of actions) {
          if(controller.signal.aborted)break;
          if(action.type==="project") {
            const project=data.projects.find(item=>item.id===action.id);
            if(project) { showProject(project);setHighlight(project.title);pointAt("preview","Agent · opened project");append([logText(`  Agent opened ${project.title}.`,"success")]); }
          } else if(action.type==="resume") {doResume(action.section);pointAt("transcript","Agent · resume");}
          else if(action.type==="projects") {doRecruiter(["projects"]);pointAt("results","Agent · projects");}
          else if(action.type==="highlight") doHighlight(action.text,true);
          else if(action.type==="focus") pointAt(action.zone,"Agent · evidence");
          await new Promise(resolve=>setTimeout(resolve,350));
        }
        if (!actions.length) append([logText("  Agent answered without opening content. Try: show my resume or open Coretex.","muted")]);
      }
    } catch (error) {
      if (!controller.signal.aborted) setLogs(previous => previous.map(line => line.id === entry.id && line.text === "  Michael is thinking..." ? { ...line, text: "  AI response unavailable.", tone: "error" } : line));
      if (!controller.signal.aborted) append([logText(`  AI: ${error instanceof Error ? error.message : "Could not complete the response."}`, "error")]);
    } finally {
      if (aiRequestRef.current === controller) { aiRequestRef.current = null; setAiBusy(false); }
    }
  }

  // ── /visitors ──────────────────────────────────────────────────────────────

  async function doVisitors() {
    const epoch = requestEpochRef.current;
    append([logText("  Fetching visitor data...", "muted")]);
    try {
      const res = await fetch("/api/data/visitors");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (epoch !== requestEpochRef.current) return;
      const { countries, total } = data as {
        countries: { countryName: string; count: number }[];
        total: number;
      };
      if (!countries.length) {
        append([logText("  No visitor data available.", "muted")]);
        return;
      }
      const lines: LogEntry[] = [
        logText(""),
        logText("  ┌────────────────────────────────┬──────────┐", "accent"),
        logText("  │ Country                        │  Visits  │", "accent"),
        logText("  ├────────────────────────────────┼──────────┤", "accent"),
      ];
      for (const c of countries.slice(0, 20)) {
        const name = (" " + c.countryName).padEnd(31).slice(0, 31) + " ";
        const cnt = String(c.count).padStart(6);
        lines.push(logText(`  │${name}│  ${cnt}  │`));
      }
      lines.push(logText("  └────────────────────────────────┴──────────┘", "accent"));
      lines.push(logText(`  Total unique visitors: ${total}`, "success"));
      if (countries.length > 20) {
        lines.push(logText(`  (showing top 20 of ${countries.length} countries)`, "muted"));
      }
      append(lines);
    } catch {
      append([logText("  Failed to fetch visitor data.", "error")]);
    }
  }

  // ── /togglebackground ─────────────────────────────────────────────────────

  function doToggleBackground() {
    const next = !gifEnabled;
    setGifEnabled(next);
    append([logText(`  Background: ${next ? "enabled" : "disabled"}`, "muted")]);
  }

  // ── /browse ────────────────────────────────────────────────────────────────

  function doBrowse(rawUrl: string) {
    const trimmed = rawUrl.trim();

    if (!trimmed) {
      if (browseUrl) {
        setBrowseUrl(null);
        append([logText("  Browser closed.", "muted")]);
      } else {
        append([
          logText("  Usage: browse <url>", "error"),
          logText("  Example: browse wikipedia.org", "muted"),
          logText("  Note: some sites block embedding — use ↗ to open in a new tab", "muted"),
        ]);
      }
      return;
    }

    const { url, blocked } = sanitizeBrowseUrl(trimmed);

    try {
      new URL(url);
    } catch {
      append([logText(`  Invalid URL: ${trimmed}`, "error")]);
      return;
    }

    if (blocked) {
      append([logText("  Access denied: that site is blocked by the content filter.", "error")]);
      return;
    }

    clearPreview();
    setSpotifyLive(null);
    setBrowserMinimized(false);
    setBrowseUrl(url);
    append([
      logText(`  Opening ${url}`, "success"),
      logText("  Note: some sites block embedding — click ↗ to open in a new tab", "muted"),
    ]);
  }

  // ── /help ──────────────────────────────────────────────────────────────────

  function doHelp() {
    const W = 52;
    const bar = "─".repeat(W);
    append([
      logText(""),
      ...boxHeader("MDCRAN CLI  ·  COMMAND REFERENCE"),
      logText(""),
      logText("  ▸ WORKSPACE", "muted"),
      logText("    mode shell|ai         Switch between commands and AI chat"),
      logText("    tour [next|back|stop] Interactive terminal walkthrough"),
      logText("    recruiter            Resume, evidence, role matching & contact"),
      logText("    resume <section>     summary / experience / education / skills"),
      logText("    resume download      Published PDF and printable resume"),
      logText("    highlight <phrase>   Highlight displayed text; clear to reset"),
      logText("    cursor on|off        Assistant’s visible pointer"),
      logText("    window float|max|crt Resize or restore the CRT window"),
      logText("    window size 1000 700 Set floating window size"),
      logText("    pet cat|bot|crab|off  Choose your terminal companion"),
      logText("    animations scan|type|off  Text reveal style"),
      logText("    focus                Focus the command line"),
      logText(""),
      logText("  ▸ FILESYSTEM", "muted"),
      logText(`  ${"─".repeat(W)}`, "muted"),
      logText("    ls                   List current directory contents"),
      logText("    pwd                  Print working directory path"),
      logText("    cd <path>            Change directory  (.. up · / root)"),
      logText("    home                 Jump to root  /"),
      logText("    open <slug>          Open project, article, or client"),
      logText("    clear                Clear terminal screen"),
      logText(""),
      logText("  ▸ CONTENT", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    about                Portfolio introduction"),
      logText("    clients              Browse all clients"),
      logText("    featured             Featured portfolio work"),
      logText("    projects             All projects"),
      logText("    articles             All articles"),
      logText("    resume               Full résumé & work history"),
      logText("    spotify              Now playing on Spotify"),
      logText("    terms  /  privacy    Legal documents"),
      logText(""),
      logText("  ▸ SEARCH", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    select <number>      Open a numbered result (or type its number)"),
      logText("    search <query>       Search projects, articles, clients & videos"),
      logText(""),
      logText("  ▸ CONTACT", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    contact <name> <email> <subject> <message> [phone]"),
      logText("    subscribe <name> <email-or-phone>"),
      logText("    unsubscribe <email-or-phone>"),
      logText("    With no arguments, contact/subscribe/unsubscribe start a draft"),
      logText("    set <field> <value>   Edit a draft; quote values with spaces"),
      logText("    send / cancel        Submit or discard the active draft"),
      logText(""),
      logText("  ▸ WEB", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    browse <url>         Embed a website in the terminal panel"),
      logText("    browse               Close the embedded browser"),
      logText(""),
      logText("  ▸ DATA", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    visitors             View visitor traffic by country"),
      logText(""),
      logText("  ▸ GAMES", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    snake                Play Snake (arrows/WASD, P to pause, ESC to exit)"),
      logText("    pacman               Play Pac-Man (arrows/WASD, P to pause, ESC to exit)"),
      logText(""),
      logText("  ▸ OTHER", "muted"),
      logText(`  ${bar}`, "muted"),
      logText("    reload               Retry or refresh portfolio data"),
      logText("    Tab: autocomplete; Up/Down: history or results; Esc: exit"),
      logText("    togglemusic [on|off]  Toggle the terminal soundtrack"),
      logText("    togglekeystrokeclicks [on|off]  Toggle typing/output clicks"),
      logText("    ask <question>       Talk to Michael’s AI portfolio assistant"),
      logText("    ai clear / stop      Reset AI history / stop a response"),
      logText("    togglebackground    Toggle retro GIF background on/off"),
      logText('    exit                 Type "exit" to close'),
      logText("    help                 Show this screen"),
      logText(""),
      logText(`  ${"─".repeat(W)}`, "muted"),
      logText('  Type "exit" to close', "muted"),
      logText(`  ${"─".repeat(W)}`, "muted"),
      logText(""),
    ]);
  }

  // ── /home ──────────────────────────────────────────────────────────────────

  function doHome() {
    setCwd([]);
    append([logText("  Navigated to /", "success")]);
  }

  // ── /clear ─────────────────────────────────────────────────────────────────

  function doClear() {
    setHighlight("");
    setPointerTarget(null);
    setLogs([
      logText(ASCII, "accent"),
      logText(""),
      logText("  MDCRAN CLI · YOUR PORTFOLIO WORKSPACE", "accent"),
      logText('  Type "help" for commands  |  Type "exit" to close', "muted"),
      logText('  resume · recruiter · search · tour · mode ai', "muted"),
      logText(""),
    ]);
    setPreview(null);
    setBrowseUrl(null);
    prevBrowseUrlRef.current = null;
    setResults([]);
    setSelectedResultIdx(0);
    setResultsLabel("Search Results");
  }

  // ── /ls ───────────────────────────────────────────────────────────────────

  function doLs() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    clearPreview();
    const items = directoryItems(cwd, data);
    if (!items.length) {
      append([logText("  (empty directory)", "muted")]);
    } else {
      append([
        logText(""),
        logText(`  ┌─ ${pathLabel(cwd)} ${"─".repeat(Math.max(0, 46 - pathLabel(cwd).length))}`, "muted"),
        logText(""),
        ...items.map((it) => logText(it)),
        logText(""),
        logText(`  ${items.length} item${items.length === 1 ? "" : "s"}`, "muted"),
        logText(""),
      ]);
    }
  }

  // ── /pwd ──────────────────────────────────────────────────────────────────

  function doPwd() {
    append([logText(`  ${pathLabel(cwd)}`)]);
  }

  // ── /cd ───────────────────────────────────────────────────────────────────

  function doCd(target: string) {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    const t = target.trim();
    const next = resolveTerminalPath(cwd, t);
    if (next) {
      setCwd(next);
      append([logText(`  ${pathLabel(next)}`, "muted")]);
      return;
    }

    append([
      logText(
        `  cd: '${t}': No such directory. Type /ls to see available directories.`,
        "error"
      ),
    ]);
  }

  // ── /open ─────────────────────────────────────────────────────────────────

  function doOpen(query: string) {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    if (!query) {
      append([logText("  Usage: open <slug>  (or nano <slug>)", "muted")]);
      return;
    }
    const q = normalize(query);

    const project = data.projects.find(
      (p) => p.slug === q || p.id === q || normalize(p.title) === q
    );
    if (project) {
      showProject(project);
      return;
    }

    const article = data.articles.find(
      (a) => a.slug === q || a.id === q || normalize(a.title) === q
    );
    if (article) {
      showArticle(article);
      return;
    }

    const client = data.clients.find(
      (c) => c.id === q || normalize(c.name) === q
    );
    if (client) {
      showClient(client);
      return;
    }

    append([
      logText(`  '${query}' not found. Try:  search ${query}`, "error"),
    ]);
    clearPreview();
  }

  // ── /search ───────────────────────────────────────────────────────────────

  function doSearch(query: string) {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    if (!query) {
      append([logText("  Usage: search <query>", "muted")]);
      return;
    }

    const hits = buildSearch(data, query);
    setResults(hits);
    setSelectedResultIdx(0);
    setResultsLabel("Search Results");

    if (!hits.length) {
      append([logText(`  No results for "${query}".`, "muted")]);
      return;
    }

    const KIND_LABEL: Record<string, string> = {
      route:   "ROUTE  ",
      project: "PROJ   ",
      article: "ARTICLE",
      client:  "CLIENT ",
      video:   "VIDEO  ",
    };

    append([
      logText(""),
      ...boxHeader(`SEARCH  ·  "${query.slice(0, 36)}"`),
      logText(`  ${hits.length} result${hits.length === 1 ? "" : "s"} found`, "muted"),
      logText(""),
      ...hits.map((hit, i) =>
        logText(
          `  [${String(i + 1).padStart(2)}]  ${KIND_LABEL[hit.kind] ?? "       "}  ${hit.label}`
        )
      ),
      logText(""),
      logText("  Type a number to open  ·  e.g.  1", "muted"),
    ]);
  }

  // ── /select ───────────────────────────────────────────────────────────────

  function doSelect(arg: string) {
    const n = Number(arg);
    if (!/^\d+$/.test(arg ?? "") || !Number.isSafeInteger(n) || n < 1) {
      append([logText("  Usage: select <number>", "muted")]);
      return;
    }
    openResult(n - 1);
  }

  function openResult(idx: number) {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    if (idx < 0 || idx >= results.length) {
      append([
        logText(
          `  No result #${idx + 1}. Run  search <query>  first.`,
          "error"
        ),
      ]);
      return;
    }
    const hit = results[idx];
    setResults([]);
    setSelectedResultIdx(0);
    setResultsLabel("Search Results");
    if (hit.kind === "route") {
      clearPreview();
      setCwd(hit.path);
      append([
        logText(`  Navigated to ${pathLabel(hit.path)}`, "success"),
      ]);
    } else if (hit.kind === "project") {
      const p = data.projects.find((x) => x.id === hit.id);
      if (p) showProject(p);
    } else if (hit.kind === "article") {
      const a = data.articles.find((x) => x.id === hit.id);
      if (a) showArticle(a);
    } else if (hit.kind === "client") {
      const c = data.clients.find((x) => x.id === hit.id);
      if (c) showClient(c);
    } else if (hit.kind === "video") {
      window.open(hit.url, "_blank", "noopener,noreferrer");
      append([
        logText(`  Opened video: ${hit.label}`, "success"),
      ]);
    }
  }

  // ── Show project ──────────────────────────────────────────────────────────

  function showProject(p: Project) {
    const internalUrl = projectUrl(
      p.category,
      p.slug,
      p.subcategory ?? undefined
    );
    const links: Array<{ label: string; href: string }> = [
      { label: "View project page", href: internalUrl },
    ];
    if (p.liveUrl) links.push({ label: "Live site ↗", href: p.liveUrl });
    if (p.externalUrl)
      links.push({ label: "External link ↗", href: p.externalUrl });
    if (
      p.pricing?.downloadUrl &&
      p.pricing.status === "free"
    )
      links.push({ label: "Download ↓", href: p.pricing.downloadUrl });

    const relatedClients =
      p.clientIds
        ?.map((clientId) => data?.clients.find((client) => client.id === clientId))
        .filter((client): client is Client => Boolean(client)) ?? [];
    const lines: LogEntry[] = [
      logText(""),
      ...boxHeader(p.title.toUpperCase()),
      logText(""),
      ...(p.description ? [logText(`  ${summarizeText(p.description, 320)}`)] : []),
      ...(p.longDescription
        ? [logText(""), logText(`  ${summarizeText(p.longDescription, 520)}`)]
        : []),
      logText(""),
      logText(`  ${"─".repeat(52)}`, "muted"),
      logText(`  Type      ${p.subcategory ?? p.category ?? "—"}`),
      ...(p.pricing?.status === "free"
        ? [logText("  Pricing   FREE")]
        : []),
      ...(p.pricing?.price ? [logText(`  Price     ${formatMoney(p.pricing.price)}`)] : []),
      ...(p.publishDate ? [logText(`  Date      ${formatDate(p.publishDate)}`)] : []),
      ...(relatedClients.length
        ? [logText(`  Client    ${relatedClients.map((client) => client.name).join(", ")}`)]
        : []),
      ...(p.tags?.length
        ? [logText(`  Tags      ${p.tags.join("  ·  ")}`, "muted")]
        : []),
      ...(p.credits?.length
        ? [
            logText(
              `  Credits   ${p.credits
                .slice(0, 4)
                .map((credit) => `${credit.name} (${credit.role})`)
                .join("  ·  ")}`,
              "muted"
            ),
          ]
        : []),
    ];

    if (links.length) {
      lines.push(logText(""));
      lines.push(logText("  LINKS", "muted"));
      for (const link of links) {
        lines.push(logLinks([link]));
      }
    }

    if (p.videos?.length) {
      lines.push(logText(""));
      lines.push(logText(`  VIDEOS (${p.videos.length})`, "muted"));
      for (const [index, video] of p.videos.slice(0, 3).entries()) {
        const title = videoTitleText(video.title, video.youtubeId, index);
        lines.push(logText(`  [${index + 1}] ${title}`));
        if (video.viewCount) {
          lines.push(logText(`    Views: ${formatCount(video.viewCount)}`, "muted"));
        }
        lines.push(
          logLinks([
            {
              label: videoLinkText(video.title, video.youtubeId, index),
              href: `https://youtu.be/${video.youtubeId}`,
            },
          ])
        );
      }
      if (p.videos.length > 3) {
        lines.push(logText(`  + ${p.videos.length - 3} more video(s)`, "muted"));
      }
    }

    lines.push(logText(""));
    append(lines);

    setPreview({
      title: p.title,
      subtitle: `${p.subcategory ?? p.category ?? "Project"}`,
      linkUrl: internalUrl,
      linkLabel: "View project page →",
      projectData: p,
    });
  }

  // ── Show article ──────────────────────────────────────────────────────────

  function showArticle(a: Article) {
    const articleHref = `/articles/${a.slug}`;
    const articleVideos = a.sections.filter(
      (section) => section.type === "video" && section.youtubeId
    );
    const lines: LogEntry[] = [
      logText(""),
      ...boxHeader(a.title.toUpperCase()),
      logText(""),
      logText(`  Published   ${formatDate(a.publishDate)}  ·  ${a.author}`),
      logText(""),
      ...(a.excerpt ? [logText(`  ${summarizeText(a.excerpt, 360)}`)] : []),
      logText(""),
      logText(`  ${"─".repeat(52)}`, "muted"),
      logText(`  Category    ${a.category}`),
      logText(`  Sections    ${a.sections.length}`),
      ...(a.updatedDate ? [logText(`  Updated     ${formatDate(a.updatedDate)}`)] : []),
      ...(a.tags?.length
        ? [logText(`  Tags        ${a.tags.join("  ·  ")}`, "muted")]
        : []),
    ];

    lines.push(logText(""));
    lines.push(logText("  LINKS", "muted"));
    lines.push(logLinks([{ label: "Read full article", href: articleHref }]));

    if (articleVideos.length) {
      lines.push(logText(""));
      lines.push(logText(`  VIDEOS (${articleVideos.length})`, "muted"));
      for (const [index, section] of articleVideos.slice(0, 3).entries()) {
        const youtubeId = section.youtubeId;
        if (!youtubeId) continue;
        const title = videoTitleText(section.caption, youtubeId, index);
        lines.push(logText(`  [${index + 1}] ${title}`));
        lines.push(
          logLinks([
            {
              label: videoLinkText(section.caption, youtubeId, index),
              href: `https://youtu.be/${youtubeId}`,
            },
          ])
        );
      }
      if (articleVideos.length > 3) {
        lines.push(logText(`  + ${articleVideos.length - 3} more video(s)`, "muted"));
      }
    }

    lines.push(logText(""));
    append(lines);

    setPreview({
      title: a.title,
      subtitle: `${a.category}  ·  ${formatDate(a.publishDate)}`,
      linkUrl: articleHref,
      linkLabel: "Read article →",
      articleData: a,
    });
  }

  // ── Show client ───────────────────────────────────────────────────────────

  function showClient(c: Client) {
    const clientProjects =
      data?.projects.filter((project) => project.clientIds?.includes(c.id)) ?? [];
    const clientVideos = clientProjects.flatMap((project) =>
      (project.videos ?? []).map((video) => ({ project, video }))
    );
    const clientOptions: SearchHit[] = [
      ...clientProjects.map((project) => ({
        kind: "project" as const,
        id: project.id,
        label: `${project.title} (${project.slug})`,
      })),
      ...clientVideos.map((item) => ({
        kind: "video" as const,
        url: `https://youtu.be/${item.video.youtubeId}`,
        label: `Video: ${item.video.title || item.video.youtubeId} [${item.project.title}]`,
      })),
    ];
    setResults(clientOptions);
    setSelectedResultIdx(0);
    setResultsLabel("Client Options");
    const lines: LogEntry[] = [
      logText(""),
      ...boxHeader(c.name.toUpperCase()),
      logText(""),
      logText(`  ${"─".repeat(52)}`, "muted"),
    ];

    if (c.roles?.length)
      lines.push(logText(`  Roles      ${c.roles.join(", ")}`));
    if (c.location) lines.push(logText(`  Location   ${c.location}`));
    if (c.followerCount) lines.push(logText(`  Followers  ${formatCount(c.followerCount)}`));
    if (c.viewCount) lines.push(logText(`  Views      ${formatCount(c.viewCount)}`));
    if (clientProjects.length) lines.push(logText(`  Projects   ${clientProjects.length}`));
    if (clientVideos.length) lines.push(logText(`  Videos     ${clientVideos.length}`));
    if (c.bio) {
      lines.push(logText(""));
      lines.push(logText(`  ${summarizeText(c.bio, 420)}`));
    }
    if (c.quote) {
      lines.push(logText(""));
      lines.push(
        logText(
          `  "${c.quote.text}"${c.quote.context ? `  — ${c.quote.context}` : ""}`,
          "muted"
        )
      );
    }
    if (c.socialLinks?.length) {
      lines.push(logText(""));
      lines.push(logText("  SOCIALS", "muted"));
      lines.push(
        logLinks(
          c.socialLinks.map((s) => ({
            label: `${s.platform.toUpperCase()}${
              s.handle
                ? ` ${s.handle.trim().startsWith("@") ? s.handle.trim() : `@${s.handle.trim()}`}`
                : ""
            }`,
            href: s.url,
          }))
        )
      );
    }

    if (clientProjects.length) {
      lines.push(logText(""));
      lines.push(logText("  PROJECTS", "muted"));
      for (const project of clientProjects.slice(0, 5)) {
        lines.push(logText(`  - ${project.title}`, "default"));
        lines.push(logText(`    open ${project.slug}`, "muted"));
      }
      if (clientProjects.length > 5) {
        lines.push(logText(`  + ${clientProjects.length - 5} more project(s)`, "muted"));
      }
    }

    if (clientVideos.length) {
      lines.push(logText(""));
      lines.push(logText(`  VIDEOS (${clientVideos.length})`, "muted"));
      for (const [index, item] of clientVideos.slice(0, 4).entries()) {
        const title = videoTitleText(item.video.title, item.video.youtubeId, index);
        lines.push(logText(`  [${index + 1}] ${title}`));
        lines.push(logText(`    From: ${item.project.title}`, "muted"));
        if (item.video.viewCount) {
          lines.push(logText(`    Views: ${formatCount(item.video.viewCount)}`, "muted"));
        }
        lines.push(
          logLinks([
            {
              label: videoLinkText(item.video.title, item.video.youtubeId, index),
              href: `https://youtu.be/${item.video.youtubeId}`,
            },
          ])
        );
      }
      if (clientVideos.length > 4) {
        lines.push(logText(`  + ${clientVideos.length - 4} more video(s)`, "muted"));
      }
    }

    if (clientOptions.length) {
      lines.push(logText(""));
      lines.push(logText("  OPTIONS", "muted"));
      lines.push(
        logText(
          "  Use Arrow Up/Down, then Enter to open the highlighted project or video.",
          "muted"
        )
      );
    }

    lines.push(logText(""));

    append(lines);

    const previewImage = assetUrl(c.bannerUrl || c.avatarUrl);
    if (previewImage) {
      setPreview({
        title: c.name,
        subtitle: c.roles?.join(", "),
        imageUrl: previewImage,
        imageAlt: c.name,
        details: [
          c.followerCount ? `Followers: ${formatCount(c.followerCount)}` : "",
          c.viewCount ? `Views: ${formatCount(c.viewCount)}` : "",
          clientProjects.length ? `Projects: ${clientProjects.length}` : "",
          clientVideos.length ? `Videos: ${clientVideos.length}` : "",
        ].filter(Boolean),
        quote: c.quote?.text,
        linkUrl: `/clients/${c.id}`,
        linkLabel: "View client page",
        caption: [
          c.location ?? "",
          clientProjects.length ? `${clientProjects.length} project${clientProjects.length === 1 ? "" : "s"}` : "",
          clientVideos.length ? `${clientVideos.length} video${clientVideos.length === 1 ? "" : "s"}` : "",
        ]
          .filter(Boolean)
          .join("  ·  "),
      });
    }
  }

  // ── /about ────────────────────────────────────────────────────────────────

  function doAbout() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    const about = data.siteContent?.homeAbout;

    append([
      logText(""),
      ...boxHeader("MICHAEL CRAN  ·  MDCRAN"),
      logText(""),
      ...(about?.description
        ? [logText(`  ${summarizeText(about.description, 460)}`)]
        : []),
      ...(about?.supportingText
        ? [logText(""), logText(`  ◈  ${about.supportingText}`, "muted")]
        : []),
      ...(about?.tags?.length
        ? [
            logText(""),
            logText(`  ${about.tags.map((t) => `[ ${t} ]`).join("  ")}`, "muted"),
          ]
        : []),
      logText(""),
      logText("  ─── Links " + "─".repeat(42), "muted"),
      logLinks([
        { label: "View resume →", href: "/resume" },
        { label: "Contact me →", href: "/contact" },
      ]),
      logText(""),
    ]);

    // Open the right preview pane with the about photos
    const aboutImages = (about?.images ?? [])
      .map((img) => ({ url: imageAssetSrc(img.src) ?? "", alt: img.alt ?? "Michael Cran" }))
      .filter((img) => Boolean(img.url));
    if (aboutImages.length) {
      setPreview({
        title: "Michael Cran",
        subtitle: about?.supportingText ?? "MDCran",
        imageUrl: aboutImages[0].url,
        imageAlt: aboutImages[0].alt,
        images: aboutImages,
        linkUrl: "/resume",
        linkLabel: "View resume",
        caption: about?.tags?.map((t) => `[ ${t} ]`).join("  ") ?? "",
      });
    }
  }

  // ── /clients ──────────────────────────────────────────────────────────────

  function doClients() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }

    const hits: SearchHit[] = data.clients.map((c) => ({
      kind: "client" as const,
      id: c.id,
      label: c.name,
    }));
    setResults(hits);
    setSelectedResultIdx(0);
    setResultsLabel("Clients");

    append([
      logText(""),
      ...boxHeader(`CLIENTS  ·  ${data.clients.length} total`),
      logText(""),
      logText(`  ${"#".padEnd(4)}  ${"NAME".padEnd(22)}  ${"ID / open <id>".padEnd(22)}  ROLES`, "muted"),
      logText(`  ${"─".repeat(66)}`, "muted"),
      ...data.clients.map((c, i) =>
        logText(
          `  ${String(i + 1).padStart(2)}    ${c.name.slice(0, 22).padEnd(22)}  ${c.id.slice(0, 22).padEnd(22)}  ${c.roles.slice(0, 1).join(", ")}`
        )
      ),
      logText(""),
      logText("  open <id>  or  type number to select", "muted"),
      logText(""),
    ]);
  }

  // ── /featured ─────────────────────────────────────────────────────────────

  function doFeatured() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }

    const hits: SearchHit[] = data.featuredProjects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      label: p.title,
    }));
    setResults(hits);
    setSelectedResultIdx(0);
    setResultsLabel("Featured Projects");

    append([
      logText(""),
      ...boxHeader("★  FEATURED WORK"),
      logText(""),
      logText(`  ${"#".padEnd(4)}  ${"TITLE".padEnd(24)}  ${"SLUG / open <slug>".padEnd(26)}  TYPE`, "muted"),
      logText(`  ${"─".repeat(70)}`, "muted"),
      ...data.featuredProjects.map((p, i) =>
        logText(
          `  ${String(i + 1).padStart(2)}    ${p.title.slice(0, 24).padEnd(24)}  ${p.slug.slice(0, 26).padEnd(26)}  ${p.subcategory ?? p.category ?? ""}`
        )
      ),
      logText(""),
      logText("  open <slug>  or  type number to select", "muted"),
      logText(""),
    ]);
  }

  // ── /projects ─────────────────────────────────────────────────────────────

  function doProjects() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }

    const hits: SearchHit[] = data.projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      label: p.title,
    }));
    setResults(hits);
    setSelectedResultIdx(0);
    setResultsLabel("Projects");

    append([
      logText(""),
      ...boxHeader(`ALL PROJECTS  ·  ${data.projects.length} total`),
      logText(""),
      logText(`  ${"#".padEnd(4)}  ${"TITLE".padEnd(24)}  ${"SLUG / open <slug>".padEnd(26)}  TYPE`, "muted"),
      logText(`  ${"─".repeat(70)}`, "muted"),
      ...data.projects.map((p, i) =>
        logText(
          `  ${String(i + 1).padStart(2)}    ${p.title.slice(0, 24).padEnd(24)}  ${p.slug.slice(0, 26).padEnd(26)}  ${p.subcategory ?? p.category ?? ""}`
        )
      ),
      logText(""),
      logText("  open <slug>  or  type number to select", "muted"),
      logText(""),
    ]);
  }

  // ── /articles ─────────────────────────────────────────────────────────────

  function doArticles() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }

    const sorted = [...data.articles].sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );

    const hits: SearchHit[] = sorted.map((a) => ({
      kind: "article" as const,
      id: a.id,
      label: a.title,
    }));
    setResults(hits);
    setSelectedResultIdx(0);
    setResultsLabel("Articles");

    append([
      logText(""),
      ...boxHeader(`ALL ARTICLES  ·  ${sorted.length} total`),
      logText(""),
      logText(`  ${"#".padEnd(4)}  ${"TITLE".padEnd(28)}  ${"SLUG / open <slug>".padEnd(24)}  DATE`, "muted"),
      logText(`  ${"─".repeat(70)}`, "muted"),
      ...sorted.map((a, i) =>
        logText(
          `  ${String(i + 1).padStart(2)}    ${a.title.slice(0, 28).padEnd(28)}  ${a.slug.slice(0, 24).padEnd(24)}  ${a.publishDate}`
        )
      ),
      logText(""),
      logText("  open <slug>  or  type number to select", "muted"),
      logText(""),
    ]);
  }

  // ── /resume ───────────────────────────────────────────────────────────────

  function doResume(section = "all") {
    if (!data) { append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Resume is loading. Try again in a moment.","muted")]);return; }
    setResults([]);
    if (["download","pdf","print"].includes(section)) { append([logText("  Open the published resume or use the print view to save a PDF.","success"),logLinks(resumeLinks(data.resumeProfile))]);return; }
    if (!(RESUME_SECTIONS as readonly string[]).includes(section)) { append([logText("  resume [all|summary|experience|education|skills|certifications|awards|download|print]","muted")]);return; }
    append([logText(""),...resumeLines(data,section as ResumeSection).map(line=>logText(`  ${line.text}`,line.heading?"accent":"default")),logText(""),logLinks(resumeLinks(data.resumeProfile))]);
  }

  function pointAt(zone:TerminalPointerTarget["zone"],label:string) {
    if(cursorEnabled)setPointerTarget({token:Date.now(),zone,label});
  }

  function doHighlight(query:string, quiet=false) {
    if(!query || query==="clear") {setHighlight("");setPointerTarget(null);return;}
    if(query.length>120) {append([logText("  Highlight a phrase up to 120 characters.","error")]);return;}
    const found=latestLogsRef.current.some(entry=>entry.text?.toLowerCase().includes(query.toLowerCase()));
    if (!found && quiet) return;
    setHighlight(query);
    if(found)pointAt("transcript","Highlighted evidence");
    else append([logText(`  No displayed text matches “${query}”. Open content first, then try highlight again.`,"muted")]);
  }

  function savePreference(key:string,value:string) {
    try {localStorage.setItem(`mdcran_terminal_${key}`,value);} catch { /* Optional preference. */ }
  }

  function doWindow(args:string[]) {
    if(args[0]==="crt")setFloating(window.innerWidth < 900);
    else if(args[0]==="float" || args[0]==="reset") {setFloating(true);setWindowSize(terminalWindowSize(1100,760,window.innerWidth,window.innerHeight));}
    else if(args[0]==="max") {setFloating(true);setWindowSize(terminalWindowSize(window.innerWidth,window.innerHeight,window.innerWidth,window.innerHeight));}
    else if(args[0]==="size" && args.length===3 && args.slice(1).every(value=>/^\d{3,4}$/.test(value))) {setFloating(true);setWindowSize(terminalWindowSize(Number(args[1]),Number(args[2]),window.innerWidth,window.innerHeight));}
    else {append([logText("  window float | max | crt | reset | size <width> <height>","muted")]);return;}
    if (tourStep === TOUR_STEPS.length - 1) setTourTried(true);
    append([logText(args[0]==="crt" && window.innerWidth>=900 ? "  CRT view restored. Use the orange button to resize again." : "  Drag the bottom-right corner to resize. Use the orange button to restore the window.","success")]);
  }

  function toggleTerminalWindow() {
    if (window.innerWidth < 900 && floating) {
      const maximized = windowSize.width >= window.innerWidth - 25 && windowSize.height >= window.innerHeight - 25;
      if (maximized) {
        setWindowSize(terminalWindowSize(window.innerWidth * .86, window.innerHeight * .78, window.innerWidth, window.innerHeight));
        if (tourStep === TOUR_STEPS.length - 1) setTourTried(true);
      } else doWindow(["max"]);
    } else doWindow([floating ? "crt" : "float"]);
  }

  function doTour(action:string) {
    if (action === "try") {
      if (tourStep === null) { doTour("start"); return; }
      const step = TOUR_STEPS[tourStep];
      if ((tourStep===1||tourStep===2) && !data) return;
      setTourTried(true);
      if (step.target === "window") toggleTerminalWindow();
      else if (step.mode === "ai") {
        setMode("ai");
        // Preserve an existing question; preparing an example never sends it.
        if (!input.trim()) { setInput(step.command); tourDraftRef.current=step.command; }
        focusCommandInput();
      } else execute(step.command);
      return;
    }
    const next = terminalTourStep(action,tourStep);
    if (next === undefined) {append([logText("  tour [start|next|back|try|1-5|stop]","muted")]);return;}
    if (tourDraftRef.current && input === tourDraftRef.current) setInput("");
    tourDraftRef.current="";
    stopAI(false);setPointerTarget(null);setTourTried(false);setTourStep(next);
    if (next === null) {
      append([logText(action === "next" ? "  You’re ready to explore. Use Shell for commands or AI chat for questions. Tour is here whenever you need it." : "  Tour closed. Keep exploring, or open Tour to start again.","success")]);
      focusCommandInput();
      return;
    }
    clearPreview();setBrowseUrl(null);setResults([]);setHighlight("");setMode(TOUR_STEPS[next].mode);
  }

  function doRecruiter(args:string[]) {
    if(!data) {append([logText("  Portfolio data is loading. Try again shortly, or reload after a failure.","muted")]);return;}
    const action=args[0]||"summary",query=args.slice(1).join(" ");
    if(action==="resume") {doResume(query||"all");return;}
    if(action==="fit") {
      if(!query) {append([logText("  recruiter fit <role or job description> — compare against published evidence","muted")]);return;}
      void doAsk(`Compare this role or job description with Michael's published work: ${query}. Cite specific public projects, distinguish demonstrated skills from gaps, and do not infer availability, work authorization, years of experience, or unlisted qualifications.`,false);return;
    }
    if(action==="contact") {
      append([logText("  CONNECT WITH MICHAEL","accent"),logLinks([{label:"Contact Michael",href:"/contact"},...resumeLinks(data.resumeProfile)])]);return;
    }
    if(action==="summary") {
      doResume("summary");
      append([logText("  RECRUITER COMMANDS","accent"),logText("  recruiter projects [technology] · recruiter skills [technology]"),logText("  recruiter fit <role or job description> · recruiter contact"),logText("  resume experience · resume education · resume download"),logText("  Published portfolio evidence; availability and role fit can be discussed directly.","muted")]);return;
    }
    if(action==="skills" && !query) {doResume("skills");return;}
    if(action==="skills" || action==="projects") {
      const matches=recruiterProjects(data,query);
      setResults(matches.map(project=>({kind:"project" as const,id:project.id,label:project.title,slug:project.slug})));
      setSelectedResultIdx(0);setResultsLabel(query?`Evidence · ${query}`:"Engineering evidence");
      append([logText(`  ${matches.length} engineering project${matches.length===1?"":"s"}${query?` matching “${query}”`:""}`,"accent"),...matches.map((project,index)=>logText(`  [${index+1}] ${project.title} · ${(project.tags??[]).join(", ")}`)),logText(matches.length?"  Select a result below or type its number to inspect the project.":"  No published project matches every term. Try a specific technology or ask recruiter fit.","muted")]);return;
    }
    append([logText("  recruiter [summary|projects|skills|fit|resume|contact]","muted")]);
  }

  // ── Forms ─────────────────────────────────────────────────────────────────

  async function sendForm(mode: TerminalFormMode, payload: TerminalForm) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setBusy(true);
    append([logText("  Sending...", "muted")]);
    try {
      await submitTerminalForm(mode, payload);
      append([logText(mode === "contact" ? "  Message sent." : mode === "subscribe" ? "  Subscription saved." : "  Unsubscribed.", "success")]);
      setFormMode(null);
      setFormState(EMPTY_FORM);
    } catch (error) {
      append([logText(`  ${error instanceof Error ? error.message : "Submission failed. Please try again."}`, "error")]);
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  async function doStartForm(mode: FormMode, rawArgs = "") {
    if (!mode) return;
    const args = parseArguments(rawArgs).values;
    if (!args.length) {
      setFormMode(mode);
      setFormState(EMPTY_FORM);
      const fields = mode === "contact" ? "name, email, subject, message; optional phone" : mode === "subscribe" ? "email or phone; optional name" : "identifier (email or phone)";
      append([logText(`  ${mode.toUpperCase()} DRAFT`, "accent"),
        logText(`  Fields: ${fields}`),
        logText('  Use set <field> "value", then send to submit or cancel to discard.'),
        logText(mode === "subscribe" ? "  Sending consents to receiving updates at the supplied address or number." : mode === "contact" ? "  Sending consents to being contacted about this message." : "  Sending removes the supplied address or number from updates.", "muted")]);
      return;
    }
    const expected = mode === "contact" ? [4, 5] : mode === "subscribe" ? [2] : [1];
    if (!expected.includes(args.length)) {
      append([logText(mode === "contact" ? '  Usage: contact "name" email "subject" "message" [phone]' : mode === "subscribe" ? '  Usage: subscribe "name" <email-or-phone>' : "  Usage: unsubscribe <email-or-phone>", "error")]);
      return;
    }
    const contact = assignContactValue(mode === "subscribe" ? args[1] : args[0]);
    const payload = mode === "contact" ? { ...EMPTY_FORM, name: args[0], email: args[1], subject: args[2], message: args[3], phone: args[4] ?? "" }
      : { ...EMPTY_FORM, ...contact, name: mode === "subscribe" ? args[0] : "" };
    setFormMode(mode);
    setFormState(payload);
    await sendForm(mode, payload);
  }

  function doSet(field: string, value: string) {
    if (!formMode) { append([logText("  Start a draft with contact, subscribe, or unsubscribe.", "muted")]); return; }
    const allowed = formMode === "contact" ? ["name", "email", "phone", "subject", "message"] : formMode === "subscribe" ? ["name", "email", "phone"] : ["identifier"];
    if (!allowed.includes(field.toLowerCase())) { append([logText(`  Available fields: ${allowed.join(", ")}`, "error")]); return; }
    setFormState(previous => ({ ...previous, [field.toLowerCase()]: value }));
    append([logText(`  ${field}: ${value || "[empty]"}`, "success")]);
  }

  async function doSend() {
    if (!formMode) { append([logText("  No active draft. Start with contact, subscribe, or unsubscribe.", "muted")]); return; }
    await sendForm(formMode, formState);
  }

  function doCancel() {
    setFormMode(null);
    setFormState(EMPTY_FORM);
    append([logText("  Draft cancelled.", "muted")]);
  }

  // ── /spotify ──────────────────────────────────────────────────────────────

  const refreshSpotify = React.useCallback(async (announce = true) => {
    const epoch = requestEpochRef.current;
    if (announce) {
      append([logText("  Fetching Spotify...", "muted")]);
    }

    try {
      const res = await fetch("/api/spotify");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const track = (await res.json()) as SpotifyTrack;
      if (epoch !== requestEpochRef.current) return;
      const activeTrack = resolveSpotifyTrack(track);

      if (!activeTrack?.title) {
        setSpotifyLive(null);
        setPreview(null);
        if (announce) {
          append([
            logText(""),
            logText(DIV, "muted"),
            logText("  SPOTIFY", "accent"),
            logText(DIV, "muted"),
            logText(""),
            logText("  No current or recent playback found.", "muted"),
            logText(""),
          ]);
        }
        return;
      }

      const nextState = { track, fetchedAt: Date.now() };
      setSpotifyLive(nextState);
      setSpotifyClock(Date.now());
      const isLive = Boolean(track.isPlaying && track.title);
      setPreview(spotifyPreviewState(nextState, nextState.fetchedAt));

      if (!announce) return;

      const lines: LogEntry[] = [
        logText(""),
        logText(DIV, "muted"),
        logText(`  ${isLive ? "NOW PLAYING" : "LAST PLAYED"}`, "accent"),
        logText(DIV, "muted"),
        logText(""),
        logText(`  ${activeTrack.title}`),
        logText(`  ${activeTrack.artist ?? ""}`, "muted"),
        logText(""),
        logText(
          `  ${isLive ? "LIVE" : relativeTimeText(activeTrack.playedAt, nextState.fetchedAt) || "recent"}`,
          "muted"
        ),
        logText(""),
      ];

      if (isLive) {
        const currentProgress = spotifyProgressNow(nextState, nextState.fetchedAt);
        const currentDuration = activeTrack.durationMs;
        const timeEntry = logText(
          `  ${durationText(currentProgress)} / ${durationText(currentDuration)}`
        );
        const barEntry = logText(`  ${progressBar(currentProgress, currentDuration)}`);
        // Store IDs so the clock effect can update them in place
        spotifyProgressEntryIds.current = { time: timeEntry.id, bar: barEntry.id };
        lines.splice(lines.length - 2, 0, timeEntry, barEntry);
      } else {
        spotifyProgressEntryIds.current = null;
      }

      if (activeTrack.songUrl) {
        lines.push(
          logLinks([{ label: "Listen on Spotify", href: activeTrack.songUrl }])
        );
      }
      lines.push(logText(""));
      append(lines);
    } catch {
      if (announce) {
        append([
          logText(
            "  Failed to fetch Spotify data. Make sure Spotify is connected.",
            "error"
          ),
        ]);
      }
    }
  }, [append]);

  async function doSpotify() {
    await refreshSpotify(true);
  }

  React.useEffect(() => {
    if (!active || !spotifyLive) return;
    const interval = window.setInterval(() => {
      void refreshSpotify(false);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [active, spotifyLive, refreshSpotify]);

  // ── /terms ────────────────────────────────────────────────────────────────

  function doTerms() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    const terms = data.siteContent?.termsPage;
    const lines: LogEntry[] = [
      logText(""),
      logText(DIV, "muted"),
      logText("  TERMS OF SERVICE", "accent"),
      logText(DIV, "muted"),
    ];

    if (terms?.lastUpdated) {
      lines.push(logText(""));
      lines.push(
        logText(`  Last updated: ${terms.lastUpdated}`, "muted")
      );
    }

    if (terms?.sections?.length) {
      for (const s of terms.sections) {
        lines.push(logText(""));
        if (s.heading)
          lines.push(logText(`  ${s.heading.toUpperCase()}`, "muted"));
        if (s.body) lines.push(logText(`  ${s.body}`));
        if (s.bullets?.length) {
          for (const b of s.bullets)
            lines.push(logText(`    · ${b}`));
        }
      }
    } else {
      lines.push(logText(""));
      lines.push(
        logLinks([{ label: "View Terms of Service", href: "/terms" }])
      );
    }

    lines.push(logText(""));
    append(lines);
  }

  // ── /privacy ──────────────────────────────────────────────────────────────

  function doPrivacy() {
    if (!data) {
      append([logText(dataError ? "  Data unavailable. Type reload to retry." : "  Data loading, please wait...", dataError ? "error" : "muted")]);
      return;
    }
    const privacy = data.siteContent?.privacyPage;
    const lines: LogEntry[] = [
      logText(""),
      logText(DIV, "muted"),
      logText("  PRIVACY POLICY", "accent"),
      logText(DIV, "muted"),
    ];

    if (privacy?.lastUpdated) {
      lines.push(logText(""));
      lines.push(
        logText(`  Last updated: ${privacy.lastUpdated}`, "muted")
      );
    }

    if (privacy?.sections?.length) {
      for (const s of privacy.sections) {
        lines.push(logText(""));
        if (s.heading)
          lines.push(logText(`  ${s.heading.toUpperCase()}`, "muted"));
        if (s.body) lines.push(logText(`  ${s.body}`));
        if (s.bullets?.length) {
          for (const b of s.bullets)
            lines.push(logText(`    · ${b}`));
        }
      }
    } else {
      lines.push(logText(""));
      lines.push(
        logLinks([{ label: "View Privacy Policy", href: "/privacy" }])
      );
    }

    lines.push(logText(""));
    append(lines);
  }

  // ── Keyboard input ────────────────────────────────────────────────────────

  function handleCommandControlKey(key: string) {
    const hasNavigableResults = results.length > 0 && input.trim() === "";

    if (key === "Escape") {
      if (tourStep !== null) doTour("stop");
      else closeTerminal();
      return true;
    }

    if (key === "Enter") {
      playCommandSfx();
      if (hasNavigableResults) {
        openResult(selectedResultIdx);
        return true;
      }
      const val = input;
      setInput("");
      execute(val);
      return true;
    }

    if (key === "ArrowUp") {
      if (hasNavigableResults) {
        setSelectedResultIdx((prev) =>
          prev <= 0 ? Math.max(0, results.length - 1) : prev - 1
        );
        return true;
      }
      if (historyIdxRef.current === -1) historyDraftRef.current = input;
      const nextIdx = historyIdxRef.current + 1;
      if (nextIdx < historyRef.current.length) {
        historyIdxRef.current = nextIdx;
        setInput(historyRef.current[nextIdx]);
      }
      return true;
    }

    if (key === "ArrowDown") {
      if (hasNavigableResults) {
        setSelectedResultIdx((prev) =>
          prev >= results.length - 1 ? 0 : prev + 1
        );
        return true;
      }
      const nextIdx = historyIdxRef.current - 1;
      if (nextIdx < 0) {
        historyIdxRef.current = -1;
        setInput(historyDraftRef.current);
      } else {
        historyIdxRef.current = nextIdx;
        setInput(historyRef.current[nextIdx]);
      }
      return true;
    }

    if (key === "Tab") {
      if (!ghostSuffix) return false;
      if (ghostSuffix) {
        // Accept the ghost suggestion exactly as displayed
        setInput((prev) => prev + ghostSuffix);
      }
      return true;
    }

    return false;
  }

  commandControlKeyRef.current = handleCommandControlKey;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && aiRequestRef.current && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) { e.preventDefault(); stopAI(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || (e.shiftKey && e.key === "Tab")) return;
    if (e.nativeEvent.isComposing || gameModeRef.current) return;
    if (handleCommandControlKey(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      dismissStartupInputHint();
      setCrtPulseTick((current) => current + 1);
      playTypeSfx();
    }
  }

  function handleTerminalSurfaceKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (powerState !== "on" || busy || gameModeRef.current) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target === inputRef.current) return;
    if (e.target instanceof Element && e.target.closest("button,a,input,select,textarea,[contenteditable=true]")) return;

    if (handleCommandControlKey(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      setInput((current) => current + e.key);
      setCrtPulseTick((current) => current + 1);
      playTypeSfx();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      setInput((current) => current.slice(0, -1));
      playTypeSfx();
    }
  }

  function handleTerminalSurfaceWheel(e: React.WheelEvent<HTMLElement>) {
    if (powerState !== "on" || e.ctrlKey) return;

    const transcript = transcriptRef.current;
    if (!transcript || transcript.scrollHeight <= transcript.clientHeight) return;

    let deltaY = e.deltaY;
    if (e.deltaMode === 1) deltaY *= 16;
    if (e.deltaMode === 2) deltaY *= transcript.clientHeight;

    transcript.scrollTop += deltaY;
    e.preventDefault();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // On the /terminal route we always render (to show the "Turn On TV" button
  // + Three.js environment even before the user has activated the terminal).
  // On other routes we only render when the terminal overlay is active.
  if (!active && !isTerminalRoute) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex select-none items-center justify-center overflow-hidden bg-[#050403] px-3 py-3 md:px-5 md:py-5 font-jb"
      style={{
        padding: isThreeStage ? 0 : undefined,
        background: isThreeStage
          ? "radial-gradient(circle at 50% 12%, rgba(80, 255, 190, 0.08), transparent 18%), radial-gradient(circle at 50% 62%, rgba(70, 120, 255, 0.06), transparent 28%), radial-gradient(circle at 50% 100%, rgba(50, 255, 180, 0.05), transparent 26%), linear-gradient(180deg, #040606 0%, #020304 46%, #000101 100%)"
          : "radial-gradient(circle at 50% 18%, rgba(122, 96, 54, 0.12), transparent 28%), radial-gradient(circle at 50% 50%, rgba(20, 83, 45, 0.08), transparent 38%), linear-gradient(180deg, #120f0b 0%, #060503 40%, #020201 100%)",
      }}
    >
      {isThreeStage && powerState !== "off" && (
        <CRTThreeCanvas
          powerState={powerState}
          pulseTick={crtPulseTick}
          screenRef={shellCaptureRef}
          className="pointer-events-none absolute inset-0 z-0"
          onSceneStateChange={handleThreeSceneStateChange}
        />
      )}

      {/* ── "Turn On TV" power button — shown on /terminal before boot ─── */}
      {isTerminalRoute && powerState === "off" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center">
            <button
              onClick={handleTurnOn}
                className="group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-full border border-[#4ade80]/20 bg-[#040806] transition-all hover:border-[#4ade80]/60 hover:bg-[#070f08] focus:outline-none"
                style={{
                  boxShadow: "0 0 50px rgba(74,222,128,0.08), inset 0 0 24px rgba(74,222,128,0.04)",
                  transitionDuration: `${POWER_BUTTON_HOVER_MS}ms`,
                }}
              >
              <div
                className="absolute inset-4 rounded-full border border-[#4ade80]/15 transition-colors group-hover:border-[#4ade80]/40"
                style={{
                  boxShadow: "inset 0 0 14px rgba(74,222,128,0.06)",
                  transitionDuration: `${POWER_BUTTON_HOVER_MS}ms`,
                }}
              />
              {/* Power icon */}
              <svg
                className="relative z-10 h-10 w-10 text-[#4ade80]/40 transition-colors group-hover:text-[#4ade80]/80"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden
                style={{ transitionDuration: `${POWER_BUTTON_HOVER_MS}ms` }}
              >
                <path strokeLinecap="round" d="M12 3v5M5.636 5.636a9 9 0 1 0 12.728 0" />
              </svg>
              <span className="sr-only">Turn On TV</span>
            </button>
          </div>
          <Link
            href="/"
            className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2 text-[11px] tracking-[0.18em] transition-colors"
            style={{
              color: "rgba(240, 253, 244, 0.52)",
              textShadow: "0 0 12px rgba(74, 222, 128, 0.14)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(240, 253, 244, 0.82)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(240, 253, 244, 0.52)";
            }}
          >
            &lt;- MDCran.com
          </Link>
        </div>
      )}
      {/* Terminal shell — hidden in Three.js off-state; shown as overlay otherwise */}
      {powerState !== "off" && (
      <div
        ref={shellCaptureRef}
        tabIndex={powerState === "on" ? 0 : -1}
        data-window={floating ? "floating" : "crt"}
        data-tour={tourStep !== null ? TOUR_STEPS[tourStep].target : undefined}
        data-animation={animation}
        className={`${workspaceStyles.workspace} crt-shell power-${powerState} ${isThreeStage ? "terminal-capture-shell" : ""} relative z-10 flex h-full w-full max-w-[1700px] flex-col overflow-hidden rounded-[28px] border border-[#6d6553]/30 bg-[#090a08] outline-none`}
        style={{
          // In Three.js mode: keep the terminal constrained to the CRT screen area.
          width:       floating ? `${windowSize.width}px` : isThreeStage ? "67vw" : undefined,
          height:      floating ? `${windowSize.height}px` : isThreeStage ? "93vh" : undefined,
          maxWidth:    floating ? "calc(100vw - 24px)" : isThreeStage ? "67vw" : undefined,
          maxHeight:   floating ? "calc(100dvh - 24px)" : isThreeStage ? "93vh" : undefined,
          borderColor: isThreeStage ? "transparent" : undefined,
          boxShadow:   isThreeStage
            ? "none"
            : "0 0 0 2px rgba(31, 27, 21, 0.85), 0 0 0 8px rgba(74, 64, 49, 0.45), 0 24px 80px rgba(0, 0, 0, 0.68), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -18px 40px rgba(0,0,0,0.55)",
          background:  isThreeStage
            ? "linear-gradient(180deg, rgba(4,10,7,0.62) 0%, rgba(4,10,7,0.55) 100%)"
            : "linear-gradient(180deg, rgba(49,44,36,0.18) 0%, rgba(10,10,8,0.86) 10%, rgba(3,8,5,0.98) 100%)",
          borderRadius: isThreeStage ? 28 : undefined,
        }}
        onFocus={(e) => {
          if (e.target === e.currentTarget) {
            scheduleCommandRefocus(0);
          }
        }}
        onClick={(event) => {
          if(event.target instanceof Element && event.target.closest("button,a,input,textarea,select,[data-terminal-target]"))return;
          if(window.getSelection()?.toString())return;
          focusTerminalSurface();
        }}
        onWheel={handleTerminalSurfaceWheel}
        onKeyDownCapture={handleTerminalSurfaceKeyDown}
      >
      {/* Retro GIF cycling background — behind all effect layers; adjust RETRO_GIF_INSET to control bleed */}
      {gifVisible && gifEnabled && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={retroGifIdx}
          src={`/retro_${retroGifIdx}.gif`}
          alt=""
          className="pointer-events-none absolute z-0 object-cover"
          style={{
            inset: RETRO_GIF_INSET,
            width: `calc(100% - ${RETRO_GIF_INSET * 2}px)`,
            height: `calc(100% - ${RETRO_GIF_INSET * 2}px)`,
            opacity: floating ? 0.16 : 0.48,
            filter: "saturate(1.8) brightness(1.2)",
          }}
        />
      )}
      {/* CRT CSS overlays */}
      <>
      {/* Global scanline overlay */}
      <div
        className="pointer-events-none absolute inset-[10px] z-0 rounded-[22px]"
        style={{
          inset: isThreeStage ? 6 : undefined,
          borderRadius: isThreeStage ? 22 : undefined,
          background:
            "repeating-linear-gradient(180deg, rgba(217,251,227,0.014), rgba(217,251,227,0.014) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(0,0,0,0.24) 3px, rgba(0,0,0,0.24) 4px)",
          opacity: 0.76,
        }}
      />
      <div
        className="pointer-events-none absolute inset-[10px] z-0 rounded-[22px]"
        style={{
          inset: isThreeStage ? 6 : undefined,
          borderRadius: isThreeStage ? 22 : undefined,
          background:
            "radial-gradient(circle at center, transparent 48%, rgba(0, 0, 0, 0.5) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-[22px]"
        style={isThreeStage ? { inset: 6, borderRadius: 22 } : undefined}
      >
        <div
          className="absolute inset-[8px] rounded-[24px] border border-[#9ca88c]/10"
          style={{
            boxShadow:
              "inset 0 0 12px rgba(255,255,255,0.03), inset 0 0 26px rgba(0, 0, 0, 0.72), inset 0 0 100px rgba(20, 83, 45, 0.08), inset 0 14px 22px rgba(203, 178, 123, 0.04)",
          }}
        />
        <div
          className="absolute inset-[10px] rounded-[22px]"
          style={{
            background:
              "repeating-linear-gradient(180deg, rgba(134,239,172,0.02), rgba(134,239,172,0.02) 1px, transparent 1px, transparent 3px)",
            mixBlendMode: "screen",
            opacity: 0.34,
          }}
        />
        <div
          className="absolute inset-[10px] rounded-[22px]"
          style={{
            background:
              "linear-gradient(90deg, rgba(212, 69, 69, 0.022), rgba(74,222,128,0.014) 22%, rgba(134,239,172,0.014) 52%, rgba(74, 163, 255, 0.018) 78%, rgba(212,69,69,0.022))",
            opacity: 0.55,
          }}
        />
        <div
          className="absolute inset-[10px] rounded-[22px]"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,0,0,0.02) 0 1px, rgba(0,255,0,0.02) 1px 2px, rgba(64,160,255,0.02) 2px 3px, transparent 3px 6px)",
            mixBlendMode: "screen",
            opacity: 0.22,
          }}
        />
        <div
          className="absolute inset-[10px] rounded-[22px]"
          style={{
            background:
              "radial-gradient(circle at center, rgba(134, 239, 172, 0.028), transparent 58%)",
          }}
        />
        <div
          className="absolute inset-[10px] rounded-[22px]"
          style={{
            background:
              "radial-gradient(ellipse at 50% -6%, rgba(255,255,255,0.08), transparent 34%), radial-gradient(ellipse at 50% 108%, rgba(255,255,255,0.03), transparent 30%)",
            opacity: 0.75,
          }}
        />
        <div className="crt-static-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-phosphor-mask absolute inset-[10px] rounded-[22px]" />
        <div className="crt-shadow-mask-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-interlace-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-moire-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-roll-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-sweep-line absolute inset-x-[10px] top-[10px] h-24 rounded-[22px]" />
        <div className="crt-overlay-image-1 absolute inset-[10px] rounded-[22px]" />
        <div className="crt-overlay-image-2 absolute inset-[10px] rounded-[22px]" />
        <div className="crt-overlay-image-3 absolute inset-[10px] rounded-[22px]" />
        <div className="crt-overlay-grid absolute inset-[10px] rounded-[22px]" />
        <div className="crt-composite-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-dust-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-glare-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-edge-shadow-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-beam-raster absolute inset-[10px] rounded-[22px]" />
        <div className="crt-refresh-band-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-tear-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-rgb-fringe absolute inset-[10px] rounded-[22px]" />
        <div className="crt-afterimage-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-static-burst-layer absolute inset-[10px] rounded-[22px]" />
        <div className="crt-vignette-pulse absolute inset-[10px] rounded-[22px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[7] overflow-hidden rounded-[22px]"
        style={isThreeStage ? { inset: 6, borderRadius: 22 } : undefined}
      >
        <div className="crt-hud-corners absolute inset-[18px] rounded-[18px]" />
        <div className="crt-hud-reticle absolute right-[7.5%] top-[12%]" />
        <div className="crt-hud-reticle crt-hud-reticle-alt absolute left-[6%] bottom-[16%]" />
        <div className="crt-scope-rail absolute left-[12px] top-[72px] bottom-[72px] w-8" />
        <div className="crt-scope-rail crt-scope-rail-right absolute right-[12px] top-[72px] bottom-[72px] w-8" />
        <div className="crt-geo-triangles absolute inset-[10px] rounded-[22px]" />
        <div className="crt-signal-band absolute inset-x-[10px] top-[20%] h-12" />
        <div className="crt-signal-band crt-signal-band-late absolute inset-x-[10px] top-[68%] h-10" />
        <div className="crt-orbit-grid absolute inset-[10px] rounded-[22px]" />
      </div>
      </>
      <div
        className="crt-power-mask pointer-events-none absolute inset-[10px] z-[8] rounded-[22px]"
        style={isThreeStage ? { inset: 6, borderRadius: 22 } : undefined}
      >
        <div className="crt-power-vertical" />
        <div className="crt-power-horizontal" />
        <div className="crt-power-dot" />
        <div className="crt-power-flash" />
      </div>
      <div
        className="crt-neon-glitch-layer pointer-events-none absolute inset-[10px] z-[9] rounded-[22px]"
        style={isThreeStage ? { inset: 6, borderRadius: 22 } : undefined}
      />
      <div
        className="relative z-10 h-full"
        style={
          isThreeStage
            ? {
                width: "66.6667%",
                height: "66.6667%",
                padding: "12px",
                transform: "scale(1.5)",
                transformOrigin: "top left",
              }
            : undefined
        }
      >
      <div className="flex h-full flex-col">
      {/* Header bar */}
      <div
        className="crt-content-layer relative z-[13] flex items-center justify-between border-b border-[#8ea06f]/10 bg-[linear-gradient(180deg,rgba(38,45,33,0.82),rgba(8,17,10,0.9))] px-5 h-11 shrink-0"
        style={
          isThreeStage
            ? {
                borderBottomColor: "rgba(142,160,111,0.04)",
                background: "rgba(4, 14, 8, 0.22)",
              }
            : undefined
        }
      >
        {/* Traffic lights: red closes, orange toggles window sizing, green indicates power. */}
        <div className="flex items-center gap-[2px]">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeTerminal(); }}
            title="Exit terminal"
            aria-label="Exit terminal"
            className={workspaceStyles.windowControl}
            style={{ "--window-dot":"#ff5f57", "--window-glow":"#ff5f5759" } as React.CSSProperties}
          ><span aria-hidden="true">×</span></button>
          <button
            type="button"
            onClick={event=>{event.stopPropagation();toggleTerminalWindow();}}
            className={workspaceStyles.windowControl}
            data-tour-target="window"
            aria-label={floating ? "Restore terminal window size" : "Use resizable terminal window"}
            title={floating ? "Restore window size" : "Resize terminal window"}
            style={{ "--window-dot":"#ffbd2e", "--window-glow":"#ffbd2e40" } as React.CSSProperties}
          ><span aria-hidden="true">{floating ? "−" : "+"}</span></button>
          <span
            aria-hidden="true"
            className="mx-1 block h-2.5 w-2.5 rounded-full"
            style={{ background: "#28c840", boxShadow: "0 0 8px rgba(40,200,64,0.35)" }}
          />
        </div>

        <div
          className="text-[#86efac]/45 text-[8px] tracking-wider select-none"
          style={{ textShadow: "0 0 8px rgba(74, 222, 128, 0.16)" }}
        >
          {pathLabel(cwd)}
        </div>

        <span
          className="hidden sm:block text-[#86efac]/35 text-[7px] tracking-wider select-none"
          style={{ textShadow: "0 0 8px rgba(74, 222, 128, 0.16)" }}
        >
          Type &quot;exit&quot; to close
        </span>
      </div>

      <TerminalToolbar mode={mode} run={execute} tourActive={tourStep !== null} disabled={busy || Boolean(gameMode) || powerState!=="on"} />
      {tourStep !== null && <TerminalTour step={tourStep} run={execute} tried={tourTried} dataReady={Boolean(data)} />}
      {/* Body */}
      <div
        ref={browserBodyRef}
        className="crt-content-layer relative z-10 flex flex-1 min-h-0"
        style={isThreeStage ? { background: "rgba(3, 12, 7, 0.08)" } : undefined}
      >
        {/* Transcript — always visible */}
        <div
          ref={transcriptRef}
          data-terminal-target="transcript"
          role="region" aria-label="Terminal output" tabIndex={0}
          className="select-text flex-1 min-w-0 overflow-y-auto px-5 pt-4 pb-3 text-[0.6125rem]"
          style={{ textShadow: "0 0 7px rgba(74, 222, 128, 0.12)" }}
          onScroll={event => {
            const node=event.currentTarget;followOutputRef.current=node.scrollHeight-node.scrollTop-node.clientHeight<70;
          }}
        >
          {loading && (
            <div className="text-[#86efac]/45 text-[0.525rem] py-2">
              Loading terminal data...
            </div>
          )}
          <TerminalTranscript entries={logs} highlight={highlight} enabled={animation !== "off"}
            active={powerState === "on" && !gameMode} onPrint={playPrintSfx} onProgress={followTranscriptOutput}/>
          <div className="h-3" />
        </div>

        {/* Game floating window — overlays the transcript like the browser */}
        {gameMode && (
          <div
            className="absolute z-50 rounded-sm border border-[#4ade80]/20 bg-[#020b05] shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(74,222,128,0.06)] flex flex-col overflow-hidden"
            style={{
              left: "6%",
              top: "4%",
              width: "88%",
              height: "92%",
              animation: "none",
              transform: "none",
            }}
          >
            {/* Title bar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[#4ade80]/10 bg-[#020b05]/95 px-2.5 py-1.5 select-none">
              <div className="flex shrink-0 items-center gap-[5px]">
                <button
                  onClick={() => setGameMode(null)}
                  title="Close"
                  className="h-[10px] w-[10px] rounded-full transition-opacity hover:opacity-80"
                  style={{ background: "#ff5f57", boxShadow: "0 0 4px rgba(255,95,87,0.5)" }}
                />
                <span
                  className="block h-[10px] w-[10px] rounded-full"
                  style={{ background: "#ffbd2e", boxShadow: "0 0 4px rgba(255,189,46,0.4)" }}
                />
                <span
                  className="block h-[10px] w-[10px] rounded-full"
                  style={{ background: "#28c840", boxShadow: "0 0 4px rgba(40,200,64,0.5)" }}
                />
              </div>
              <span className="text-[0.525rem] text-[#86efac]/50 tracking-wider uppercase ml-1">
                {gameMode === "snake" ? "Snake Game" : "Pac-Man"}
              </span>
            </div>
            {/* Game content */}
            <div className="flex-1 min-h-0 bg-black">
              {gameMode === "snake" && <SnakeGame onExit={() => setGameMode(null)} />}
              {gameMode === "pacman" && <PacmanGame onExit={() => setGameMode(null)} />}
            </div>
          </div>
        )}

        {/* Preview panel (sidebar) — only shown when no browser and preview is active */}
        {!browseUrl && activePreview && (
          <div data-terminal-target="preview" className="absolute inset-x-2 bottom-14 top-12 z-40 flex shrink-0 flex-col overflow-hidden rounded-sm border border-[#4ade80]/15 bg-[#031008] md:static md:z-auto md:w-64 md:rounded-none md:border-0 md:border-l lg:w-72">
            <PreviewPanel
              preview={activePreview}
              clients={data?.clients ?? []}
              onClose={() => {
                setSpotifyLive(null);
                setPreview(null);
              }}
            />
          </div>
        )}

        {/* Floating browser window — absolutely positioned overlay */}
        {browseUrl && browserFloatSize.w > 0 && (
          <div
            className="hidden md:block absolute z-50 rounded-sm border border-[#4ade80]/20 bg-[#020b05] shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(74,222,128,0.06)]"
            style={{
              left: browserFloatPos.x,
              top: browserFloatPos.y,
              width: browserMinimized ? "auto" : browserFloatSize.w,
              height: browserMinimized ? "auto" : browserFloatSize.h,
              minWidth: 220,
              overflow: "visible", // keep resize handles outside clip region
            }}
          >
            {/* Inner clip wrapper so browser content stays bounded */}
            <div className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none" style={{ zIndex: 1 }} />

            {/* ── Edge resize handles ── */}
            <div className="absolute inset-x-2 top-0 h-1.5 z-[65] cursor-ns-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY; const startTop = browserFloatPosRef.current.y; const startH = browserFloatSizeRef.current.h;
              const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                if (!container) return;
                const dy = ev.clientY - startY;
                const newH = Math.max(160, startH - dy);
                const newY = Math.max(0, Math.min(startTop + dy, container.offsetHeight - 160));
                browserFloatPosRef.current = { ...browserFloatPosRef.current, y: newY };
                browserFloatSizeRef.current = { ...browserFloatSizeRef.current, h: newH };
                setBrowserFloatPos((p) => ({ ...p, y: newY }));
                setBrowserFloatSize((s) => ({ ...s, h: newH }));
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
            <div className="absolute inset-x-2 bottom-0 h-1.5 z-[65] cursor-ns-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY; const startH = browserFloatSizeRef.current.h; const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                const dy = ev.clientY - startY;
                const maxH = container ? container.offsetHeight - browserFloatPosRef.current.y - 4 : 800;
                const newH = Math.max(160, Math.min(maxH, startH + dy));
                browserFloatSizeRef.current = { ...browserFloatSizeRef.current, h: newH };
                setBrowserFloatSize((s) => ({ ...s, h: newH }));
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
            <div className="absolute inset-y-2 left-0 w-1.5 z-[65] cursor-col-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startLeft = browserFloatPosRef.current.x; const startW = browserFloatSizeRef.current.w;
              const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                if (!container) return;
                const dx = ev.clientX - startX;
                const newW = Math.max(220, startW - dx);
                const newX = Math.max(0, Math.min(startLeft + dx, container.offsetWidth - 220));
                browserFloatPosRef.current = { ...browserFloatPosRef.current, x: newX };
                browserFloatSizeRef.current = { ...browserFloatSizeRef.current, w: newW };
                setBrowserFloatPos((p) => ({ ...p, x: newX }));
                setBrowserFloatSize((s) => ({ ...s, w: newW }));
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
            <div className="absolute inset-y-2 right-0 w-1.5 z-[65] cursor-col-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startW = browserFloatSizeRef.current.w; const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                const dx = ev.clientX - startX;
                const maxW = container ? container.offsetWidth - browserFloatPosRef.current.x - 4 : 1200;
                const newW = Math.max(220, Math.min(maxW, startW + dx));
                browserFloatSizeRef.current = { ...browserFloatSizeRef.current, w: newW };
                setBrowserFloatSize((s) => ({ ...s, w: newW }));
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />

            {/* ── Corner resize handles (8×8, sit above edge handles) ── */}
            {/* Top-left */}
            <div className="absolute top-0 left-0 w-3 h-3 z-[70] cursor-nwse-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startY = e.clientY;
              const startLeft = browserFloatPosRef.current.x; const startTop = browserFloatPosRef.current.y;
              const startW = browserFloatSizeRef.current.w; const startH = browserFloatSizeRef.current.h;
              const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                if (!container) return;
                const dx = ev.clientX - startX; const dy = ev.clientY - startY;
                const newW = Math.max(220, startW - dx);
                const newH = Math.max(160, startH - dy);
                const newX = Math.max(0, Math.min(startLeft + dx, container.offsetWidth - 220));
                const newY = Math.max(0, Math.min(startTop + dy, container.offsetHeight - 160));
                browserFloatPosRef.current = { x: newX, y: newY };
                browserFloatSizeRef.current = { w: newW, h: newH };
                setBrowserFloatPos({ x: newX, y: newY });
                setBrowserFloatSize({ w: newW, h: newH });
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
            {/* Top-right */}
            <div className="absolute top-0 right-0 w-3 h-3 z-[70] cursor-nesw-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startY = e.clientY;
              const startTop = browserFloatPosRef.current.y;
              const startW = browserFloatSizeRef.current.w; const startH = browserFloatSizeRef.current.h;
              const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                if (!container) return;
                const dx = ev.clientX - startX; const dy = ev.clientY - startY;
                const maxW = container.offsetWidth - browserFloatPosRef.current.x - 4;
                const newW = Math.max(220, Math.min(maxW, startW + dx));
                const newH = Math.max(160, startH - dy);
                const newY = Math.max(0, Math.min(startTop + dy, container.offsetHeight - 160));
                browserFloatPosRef.current = { ...browserFloatPosRef.current, y: newY };
                browserFloatSizeRef.current = { w: newW, h: newH };
                setBrowserFloatPos((p) => ({ ...p, y: newY }));
                setBrowserFloatSize({ w: newW, h: newH });
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
            {/* Bottom-left */}
            <div className="absolute bottom-0 left-0 w-3 h-3 z-[70] cursor-nesw-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startY = e.clientY;
              const startLeft = browserFloatPosRef.current.x;
              const startW = browserFloatSizeRef.current.w; const startH = browserFloatSizeRef.current.h;
              const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                if (!container) return;
                const dx = ev.clientX - startX; const dy = ev.clientY - startY;
                const newW = Math.max(220, startW - dx);
                const newX = Math.max(0, Math.min(startLeft + dx, container.offsetWidth - 220));
                const maxH = container.offsetHeight - browserFloatPosRef.current.y - 4;
                const newH = Math.max(160, Math.min(maxH, startH + dy));
                browserFloatPosRef.current = { ...browserFloatPosRef.current, x: newX };
                browserFloatSizeRef.current = { w: newW, h: newH };
                setBrowserFloatPos((p) => ({ ...p, x: newX }));
                setBrowserFloatSize({ w: newW, h: newH });
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />
            {/* Bottom-right */}
            <div className="absolute bottom-0 right-0 w-3 h-3 z-[70] cursor-nwse-resize" onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX; const startY = e.clientY;
              const startW = browserFloatSizeRef.current.w; const startH = browserFloatSizeRef.current.h;
              const container = browserBodyRef.current;
              const onMove = (ev: MouseEvent) => {
                const dx = ev.clientX - startX; const dy = ev.clientY - startY;
                const maxW = container ? container.offsetWidth - browserFloatPosRef.current.x - 4 : 1200;
                const maxH = container ? container.offsetHeight - browserFloatPosRef.current.y - 4 : 800;
                const newW = Math.max(220, Math.min(maxW, startW + dx));
                const newH = Math.max(160, Math.min(maxH, startH + dy));
                browserFloatSizeRef.current = { w: newW, h: newH };
                setBrowserFloatSize({ w: newW, h: newH });
              };
              const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
              setIsBrowserDragging(true); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
            }} />

            {/* Drag shield — covers iframe during drag/resize so mouseup fires correctly */}
            {isBrowserDragging && <div className="absolute inset-0 z-[60]" />}

            <BrowserPanel
              url={browseUrl}
              onClose={() => { setBrowseUrl(null); setBrowserMinimized(false); prevBrowseUrlRef.current = null; }}
              onNavigate={(url) => { setBrowseUrl(url); setBrowserMinimized(false); }}
              onMinimize={() => setBrowserMinimized((prev) => !prev)}
              minimized={browserMinimized}
              onTitleBarDragStart={(e) => {
                const startX = e.clientX;
                const startY = e.clientY;
                const startPosX = browserFloatPosRef.current.x;
                const startPosY = browserFloatPosRef.current.y;
                const container = browserBodyRef.current;
                const onMove = (ev: MouseEvent) => {
                  if (!container) return;
                  const dx = ev.clientX - startX;
                  const dy = ev.clientY - startY;
                  const newX = Math.max(0, Math.min(container.offsetWidth - browserFloatSizeRef.current.w, startPosX + dx));
                  const newY = Math.max(0, Math.min(container.offsetHeight - 32, startPosY + dy));
                  browserFloatPosRef.current = { x: newX, y: newY };
                  setBrowserFloatPos({ x: newX, y: newY });
                };
                const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); setIsBrowserDragging(false); };
                setIsBrowserDragging(true);
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
              }}
            />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="crt-content-layer relative z-10 border-t border-[#8ea06f]/10 bg-[linear-gradient(180deg,rgba(8,17,10,0.9),rgba(22,28,17,0.82))] px-5 py-3 shrink-0"
        style={
          isThreeStage
            ? {
                borderTopColor: "rgba(142,160,111,0.04)",
                background: "rgba(4, 14, 8, 0.22)",
              }
            : undefined
        }
      >
        {results.length > 0 && (
          <div data-terminal-target="results" className="mb-2 max-h-[min(28vh,200px)] overflow-y-auto rounded border border-[#4ade80]/15 bg-[#05160c]/90 px-2 py-2">
            <div className="mb-1 px-1 text-[7px] tracking-wider text-[#86efac]/45 uppercase">
              {resultsLabel} · Arrow keys to select · Enter to open
            </div>
            <div className="flex flex-col gap-1">
              {results
                .slice(
                  Math.max(
                    0,
                    Math.min(selectedResultIdx - 2, Math.max(0, results.length - 6))
                  ),
                  Math.max(
                    0,
                    Math.min(selectedResultIdx - 2, Math.max(0, results.length - 6))
                  ) + 6
                )
                .map((result, index) => {
                const start = Math.max(
                  0,
                  Math.min(selectedResultIdx - 2, Math.max(0, results.length - 6))
                );
                const actualIndex = start + index;
                const isActive = actualIndex === selectedResultIdx;
                const kind =
                  result.kind === "project"
                    ? "PROJ"
                    : result.kind === "article"
                    ? "ART"
                    : result.kind === "client"
                    ? "CLI"
                    : "ROUTE";
                return (
                  <button
                    type="button"
                    onClick={() => openResult(actualIndex)}
                    aria-label={`Open result ${actualIndex + 1}: ${result.label}`}
                    key={`${result.kind}-${"id" in result ? result.id : result.label}-${index}`}
                    className={`w-full rounded px-2 py-1 text-left text-[0.525rem] leading-snug focus-visible:outline-2 focus-visible:outline-[#4ade80] ${
                      isActive
                        ? "bg-[#0d2e1a] text-[#dcfce7]"
                        : "text-[#86efac]/65"
                    }`}
                    style={
                      isActive
                        ? { boxShadow: "inset 0 0 0 1px rgba(74, 222, 128, 0.18)" }
                        : undefined
                    }
                  >
                    <span className="mr-2 text-[#86efac]/45">[{actualIndex + 1}]</span>
                    <span className="mr-2 text-[#86efac]/45">{kind}</span>
                    <span>{result.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {commandUsageHint && (
          <div className="mb-2 rounded border border-[#4ade80]/15 bg-[#05160c]/85 px-3 py-2 text-[8px] text-[#86efac]/55">
            / {commandUsageHint}
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[9px] text-[#b1cbbb]">
          <span role="status">{aiBusy ? "Michael is responding · stop or Ctrl+C cancels" : formMode ? `Editing ${formMode} draft · send or cancel` : mode === "shell" ? "SHELL · help for commands" : `${mode.toUpperCase()} · ask naturally · mode shell to return`}</span>
          <TerminalCompanion pet={pet} busy={aiBusy||busy} mode={mode}/>
        </div>
        {ghostSuffix && inputFocused && mode==="shell" && (
          <div id="terminal-command-suggestion" className="mb-1.5 flex items-start gap-2 px-1 text-[10px] leading-4 text-[#86efac]/70">
            <kbd className="shrink-0 rounded border border-[#86efac]/20 px-1 text-[9px]">Tab</kbd>
            <span className="min-w-0 break-words">{input}<span className="text-[#dcfce7]">{ghostSuffix}</span></span>
          </div>
        )}
        {showStartupInputHint && !inputFocused && <div className="mb-1.5 px-1 text-[9px] text-[#86efac]/65">Start typing to focus the command line.</div>}
        <div data-tour-target="command" className="flex items-center gap-2 rounded border border-[#86efac]/25 bg-[#031008] px-3 py-2 focus-within:border-[#86efac]/70">
          <label htmlFor="terminal-overlay-input" className="text-[#4ade80] text-[11px] shrink-0 select-none">{mode === "shell" ? promptLabel(cwd) : "michael >"}</label>
          <input ref={inputRef} id="terminal-overlay-input" name="terminal_command" type="text" aria-label="Terminal command input"
            aria-describedby={ghostSuffix && inputFocused && mode==="shell" ? "terminal-command-suggestion" : undefined}
            autoFocus={powerState === "on"} value={input} disabled={busy || Boolean(gameMode) || powerState!=="on"}
            onChange={event=>{dismissStartupInputHint();setInput(event.target.value);}} onKeyDown={handleKeyDown}
            onFocus={()=>setInputFocused(true)} onBlur={()=>setInputFocused(false)}
            spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
            placeholder={busy?"Processing…":mode==="shell"?"Type a command…":"Ask about Michael’s work…"}
            className="min-w-0 flex-1 select-text bg-transparent text-[12px] leading-6 text-[#dcfce7] caret-[#86efac] outline-none placeholder:text-[#86efac]/45" />
        </div>
      </div>
      </div>
      </div>
      {floating && <TerminalResize shell={shellCaptureRef} onSize={resizeWindow}/>}
      {cursorEnabled && <TerminalPointer shell={shellCaptureRef} target={pointerTarget}/>}
      </div>
      )}
      <style jsx>{`
        .terminal-capture-shell {
          /* In Three.js mode the shell is a full-screen HTML overlay.
             No 3D perspective transform needed — Three.js provides that. */
          transform:
            perspective(2200px)
            translate3d(var(--crt-dom-shift-x, 0px), var(--crt-dom-shift-y, 0px), 0)
            rotateX(var(--crt-dom-rot-x, 0deg))
            rotateY(var(--crt-dom-rot-y, 0deg))
            rotateZ(var(--crt-dom-rot-z, 0deg))
            scale(var(--crt-dom-scale, 1)) !important;
          transform-origin: 50% 50%;
          transform-style: preserve-3d;
          animation: none;
          will-change: transform, filter;
          filter:
            saturate(1.04)
            brightness(1.02)
            contrast(1.04)
            drop-shadow(0 0 18px rgba(68, 255, 165, 0.08))
            drop-shadow(0 0 30px rgba(70, 190, 255, 0.04));
        }

        .crt-shell {
          transform: perspective(2200px) rotateX(0.45deg) scale(1.002);
          transform-style: preserve-3d;
          box-shadow:
            0 34px 70px rgba(0, 0, 0, 0.52),
            0 0 0 1px rgba(255, 255, 255, 0.02);
          animation: crtShellFloat 8s ease-in-out infinite;
        }

        .crt-shell::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 22px;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 48%, rgba(116, 255, 176, 0.07), transparent 34%),
            radial-gradient(circle at 10% 14%, rgba(255, 255, 255, 0.05), transparent 18%),
            radial-gradient(circle at 84% 10%, rgba(90, 170, 255, 0.045), transparent 16%),
            radial-gradient(circle at 50% 62%, rgba(255, 255, 255, 0.025), transparent 26%);
          mix-blend-mode: screen;
          filter: blur(0.65px);
          animation: crtPulseGlow 6s ease-in-out infinite;
          z-index: 3;
        }

        .crt-shell::after {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 22px;
          pointer-events: none;
          box-shadow:
            inset 0 0 80px rgba(0, 0, 0, 0.58),
            inset 0 0 18px rgba(255, 255, 255, 0.03);
          z-index: 6;
        }

        .power-starting .crt-content-layer {
          animation:
            crtPowerOnContent 0.72s cubic-bezier(0.16, 0.82, 0.2, 1) forwards,
            crtPowerOnStabilize 0.18s steps(2) 0.52s 2,
            crtContentDrift 9s ease-in-out 0.72s infinite,
            crtContentJitter 0.18s steps(2) 0.72s infinite;
        }

        .power-stopping .crt-content-layer {
          animation: crtPowerOffContent 0.62s cubic-bezier(0.55, 0, 0.82, 0.32) forwards;
        }

        .power-starting.crt-shell::before {
          animation:
            crtStartupBloom 2.5s cubic-bezier(0.16, 0.82, 0.2, 1) forwards,
            crtPulseGlow 0.18s steps(2) 3;
        }

        .power-stopping.crt-shell::before {
          animation:
            crtShutdownBloom 0.62s cubic-bezier(0.55, 0, 0.82, 0.32) forwards,
            crtPulseGlow 0.14s steps(2) 4;
        }

        .crt-content-layer {
          animation:
            crtContentDrift 9s ease-in-out infinite,
            crtContentJitter 0.18s steps(2) infinite;
          will-change: transform, opacity;
          filter:
            brightness(1.02)
            saturate(1.08)
            contrast(1.06)
            drop-shadow(0 0 7px rgba(150, 255, 210, 0.08))
            drop-shadow(1.4px 0 0 rgba(255, 70, 70, 0.05))
            drop-shadow(-1.4px 0 0 rgba(70, 170, 255, 0.05));
        }

        .crt-static-layer {
          pointer-events: none;
          z-index: 1;
          opacity: 0.18;
          mix-blend-mode: screen;
          background:
            radial-gradient(circle, rgba(255,255,255,0.9) 0.65px, transparent 0.7px) 0 0 / 10px 10px,
            radial-gradient(circle, rgba(98,255,170,0.4) 0.55px, transparent 0.6px) 5px 3px / 12px 12px,
            radial-gradient(circle, rgba(255,90,90,0.22) 0.5px, transparent 0.55px) 2px 8px / 14px 14px;
          filter: blur(0.15px);
          animation:
            crtStaticShift 0.24s steps(2) infinite,
            crtStaticFlicker 0.18s steps(2) infinite;
        }

        .crt-neon-glitch-layer {
          opacity: 0.16;
          mix-blend-mode: screen;
          background:
            linear-gradient(
              90deg,
              transparent 0 8%,
              rgba(255, 60, 140, 0.16) 8% 13%,
              transparent 13% 26%,
              rgba(70, 255, 210, 0.2) 26% 31%,
              transparent 31% 48%,
              rgba(80, 140, 255, 0.18) 48% 54%,
              transparent 54% 69%,
              rgba(255, 200, 70, 0.16) 69% 73%,
              transparent 73% 100%
            ),
            repeating-linear-gradient(
              180deg,
              transparent 0 32px,
              rgba(255,255,255,0.035) 32px 34px,
              transparent 34px 74px
            );
          filter: blur(0.5px) saturate(1.25);
          animation:
            crtNeonGlitchShift 1.7s steps(3) infinite,
            crtNeonGlitchFlicker 0.65s steps(2) infinite,
            crtNeonGlitchSweep 5.2s linear infinite;
        }

        .crt-input-cursor {
          width: 0.62em;
          height: 1.05em;
          border-radius: 1px;
          background:
            linear-gradient(180deg, rgba(220, 252, 231, 0.96), rgba(74, 222, 128, 0.92));
          box-shadow:
            0 0 10px rgba(74, 222, 128, 0.42),
            0 0 18px rgba(74, 222, 128, 0.2);
          opacity: 0.7;
          animation: crtCursorBlink 1.05s steps(2) infinite;
        }

        .crt-input-cursor-active {
          opacity: 0.96;
        }

        .crt-input-hint {
          animation: crtInputHintPulse 1.35s ease-in-out infinite;
        }

        .crt-phosphor-mask {
          pointer-events: none;
          z-index: 2;
          opacity: 0.18;
          mix-blend-mode: screen;
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 60, 60, 0.08) 0 1px,
              rgba(70, 255, 170, 0.08) 1px 2px,
              rgba(70, 150, 255, 0.08) 2px 3px,
              transparent 3px 4px
            );
          animation:
            crtPhosphorShift 0.32s steps(2) infinite,
            crtPhosphorPulse 4s ease-in-out infinite;
        }

        .crt-shadow-mask-layer {
          pointer-events: none;
          z-index: 2;
          opacity: 0.11;
          mix-blend-mode: screen;
          background:
            radial-gradient(circle, rgba(255,70,70,0.16) 0 0.5px, transparent 0.7px) 0 0 / 6px 6px,
            radial-gradient(circle, rgba(90,255,180,0.18) 0 0.52px, transparent 0.72px) 2px 1px / 6px 6px,
            radial-gradient(circle, rgba(70,170,255,0.16) 0 0.5px, transparent 0.7px) 4px 2px / 6px 6px;
          filter: blur(0.15px);
          animation:
            crtShadowMaskShift 0.36s steps(2) infinite,
            crtShadowMaskPulse 5.8s ease-in-out infinite;
        }

        .crt-interlace-layer {
          pointer-events: none;
          z-index: 2;
          opacity: 0.13;
          mix-blend-mode: screen;
          background:
            repeating-linear-gradient(
              180deg,
              transparent 0 2px,
              rgba(255,255,255,0.03) 2px 3px,
              transparent 3px 5px,
              rgba(150,235,255,0.02) 5px 6px
            );
          animation:
            crtInterlaceDrift 0.28s steps(2) infinite,
            crtInterlacePulse 2.8s ease-in-out infinite;
        }

        .crt-moire-layer {
          pointer-events: none;
          z-index: 2;
          opacity: 0.08;
          mix-blend-mode: screen;
          background:
            repeating-linear-gradient(
              92deg,
              rgba(255,255,255,0.028) 0 1px,
              transparent 1px 4px
            ),
            repeating-linear-gradient(
              88deg,
              rgba(150,235,255,0.02) 0 1px,
              transparent 1px 5px
            );
          background-size: 120% 100%, 100% 100%;
          animation: crtMoireShift 11s linear infinite;
        }

        .crt-roll-layer {
          pointer-events: none;
          z-index: 2;
          opacity: 0.15;
          mix-blend-mode: screen;
          background:
            linear-gradient(
              180deg,
              transparent 0%,
              rgba(255,255,255,0.02) 12%,
              rgba(255,255,255,0.08) 16%,
              rgba(160,255,220,0.12) 18%,
              rgba(255,255,255,0.02) 23%,
              transparent 34%,
              transparent 100%
            );
          background-size: 100% 220%;
          animation: crtVerticalRoll 8s linear infinite;
        }

        .crt-sweep-line {
          pointer-events: none;
          z-index: 4;
          opacity: 0.34;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.03) 18%,
              rgba(120,255,195,0.24) 48%,
              rgba(255,255,255,0.03) 72%,
              rgba(255,255,255,0) 100%
            );
          filter: blur(10px);
          animation: crtSweepLine 5.5s linear infinite;
        }

        .crt-overlay-image-1,
        .crt-overlay-image-2,
        .crt-overlay-image-3,
        .crt-overlay-grid,
        .crt-composite-layer,
        .crt-dust-layer,
        .crt-glare-layer,
        .crt-edge-shadow-layer,
        .crt-beam-raster,
        .crt-refresh-band-layer,
        .crt-tear-layer,
        .crt-rgb-fringe,
        .crt-afterimage-layer,
        .crt-static-burst-layer,
        .crt-vignette-pulse {
          pointer-events: none;
        }

        .crt-overlay-image-1 {
          z-index: 1;
          opacity: 0.08;
          mix-blend-mode: screen;
          background-image: url("/crt-overlay-1.jpg");
          background-size: cover;
          background-position: center;
          animation: crtOverlayDrift 28s ease-in-out infinite alternate;
          filter: saturate(0.7) contrast(1.15);
        }

        .crt-overlay-image-2 {
          z-index: 1;
          opacity: 0.09;
          mix-blend-mode: screen;
          background-image: url("/crt-overlay-2.avif");
          background-size: cover;
          background-position: center;
          animation: crtOverlayPan 38s linear infinite;
          filter: saturate(0.85) contrast(1.12);
        }

        .crt-overlay-image-3 {
          z-index: 2;
          opacity: 0.055;
          mix-blend-mode: lighten;
          background-image: url("/crt-overlay-4.webp");
          background-size: 135% auto;
          background-position: center;
          animation: crtOverlayZoom 16s ease-in-out infinite alternate;
          filter: saturate(0.95) blur(0.4px);
        }

        .crt-overlay-grid {
          z-index: 2;
          opacity: 0.1;
          mix-blend-mode: screen;
          background-image:
            linear-gradient(rgba(150, 235, 255, 0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(150, 235, 255, 0.12) 1px, transparent 1px),
            url("/crt-overlay-3.webp");
          background-size: 80px 80px, 80px 80px, 140% auto;
          background-position: center, center, center;
          animation:
            crtGridDrift 20s linear infinite,
            crtGridPulse 6s ease-in-out infinite;
        }

        .crt-composite-layer {
          z-index: 3;
          opacity: 0.1;
          mix-blend-mode: screen;
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255,70,70,0.04) 0 2px,
              rgba(90,255,180,0.015) 2px 4px,
              rgba(70,170,255,0.04) 4px 6px,
              transparent 6px 10px
            ),
            repeating-linear-gradient(
              180deg,
              transparent 0 2px,
              rgba(255,255,255,0.018) 2px 3px,
              transparent 3px 5px
            );
          background-size: 140% 100%, 100% 100%;
          filter: blur(0.35px) saturate(1.08);
          animation:
            crtCompositeCrawl 0.72s linear infinite,
            crtCompositeFlicker 4.8s ease-in-out infinite;
        }

        .crt-vignette-pulse {
          z-index: 4;
          opacity: 0.38;
          background:
            radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.36) 64%, rgba(0,0,0,0.72) 100%),
            radial-gradient(circle at 50% 8%, rgba(255,255,255,0.06), transparent 22%);
          animation: crtVignetteShift 7s ease-in-out infinite;
        }

        .crt-dust-layer {
          z-index: 3;
          opacity: 0.2;
          mix-blend-mode: screen;
          background:
            radial-gradient(circle, rgba(255,255,255,0.5) 0.4px, transparent 0.55px) 0 0 / 28px 28px,
            radial-gradient(circle, rgba(255,255,255,0.26) 0.5px, transparent 0.7px) 12px 8px / 34px 34px,
            radial-gradient(circle, rgba(130,255,210,0.14) 0.45px, transparent 0.65px) 6px 17px / 42px 42px,
            radial-gradient(circle, rgba(120,90,60,0.1) 0.7px, transparent 1px) 4px 11px / 56px 56px;
          animation:
            crtDustFloat 18s linear infinite,
            crtDustFlicker 3.2s ease-in-out infinite;
        }

        .crt-glare-layer {
          z-index: 4;
          opacity: 0.3;
          background:
            linear-gradient(108deg, rgba(255,255,255,0.12), rgba(255,255,255,0.024) 22%, transparent 38%),
            radial-gradient(ellipse at 18% 10%, rgba(255,255,255,0.14), transparent 28%),
            radial-gradient(ellipse at 78% 16%, rgba(160,220,255,0.08), transparent 22%),
            radial-gradient(ellipse at 50% 4%, rgba(255,255,255,0.06), transparent 20%);
          mix-blend-mode: screen;
          animation:
            crtGlassSweep 14s ease-in-out infinite,
            crtGlareBreath 7s ease-in-out infinite;
        }

        .crt-edge-shadow-layer {
          z-index: 4;
          opacity: 0.98;
          background:
            radial-gradient(circle at 50% 50%, transparent 44%, rgba(0,0,0,0.24) 64%, rgba(0,0,0,0.54) 100%),
            linear-gradient(90deg, rgba(0,0,0,0.4), transparent 7%, transparent 93%, rgba(0,0,0,0.4)),
            linear-gradient(180deg, rgba(0,0,0,0.34), transparent 7%, transparent 93%, rgba(0,0,0,0.46));
          animation: crtEdgeBreath 9s ease-in-out infinite;
        }

        .crt-beam-raster {
          z-index: 3;
          opacity: 0.18;
          mix-blend-mode: screen;
          background:
            linear-gradient(
              180deg,
              transparent 0%,
              rgba(170,255,225,0.04) 40%,
              rgba(170,255,225,0.22) 49%,
              rgba(170,255,225,0.04) 58%,
              transparent 100%
            );
          background-size: 100% 180px;
          animation:
            crtBeamRace 1.8s linear infinite,
            crtBeamFlicker 0.16s steps(2) infinite;
          filter: blur(2.2px);
        }

        .crt-refresh-band-layer {
          z-index: 4;
          opacity: 0.12;
          mix-blend-mode: screen;
          background:
            linear-gradient(
              180deg,
              transparent 0%,
              rgba(255,255,255,0.02) 8%,
              rgba(150,235,255,0.12) 12%,
              rgba(150,235,255,0.02) 16%,
              transparent 28%,
              transparent 100%
            );
          background-size: 100% 240%;
          filter: blur(4px);
          animation:
            crtRefreshSweep 3.2s linear infinite,
            crtRefreshFlicker 0.12s steps(2) infinite;
        }

        .crt-tear-layer {
          z-index: 5;
          opacity: 0;
          background:
            linear-gradient(
              180deg,
              transparent 0%,
              transparent 42%,
              rgba(180,255,225,0.18) 43%,
              rgba(180,255,225,0.04) 45%,
              transparent 48%,
              transparent 100%
            );
          mix-blend-mode: screen;
          animation:
            crtTearBurst 11s steps(1) infinite,
            crtTearDrift 11s linear infinite;
        }

        .crt-rgb-fringe {
          z-index: 2;
          opacity: 0.18;
          background:
            linear-gradient(90deg, rgba(255,70,70,0.28), transparent 22%, transparent 78%, rgba(70,170,255,0.28)),
            linear-gradient(180deg, rgba(255,255,255,0.04), transparent 18%, transparent 82%, rgba(255,255,255,0.04));
          mix-blend-mode: screen;
          filter: blur(2px);
          animation:
            crtRgbShift 0.22s steps(2) infinite,
            crtChromaticPulse 4.2s ease-in-out infinite;
        }

        .crt-afterimage-layer {
          z-index: 4;
          opacity: 0.1;
          mix-blend-mode: screen;
          background:
            linear-gradient(90deg, rgba(70,170,255,0.03), rgba(255,255,255,0.02), rgba(255,70,70,0.03)),
            radial-gradient(circle at 50% 50%, rgba(116,255,176,0.03), transparent 52%);
          filter: blur(7px);
          animation:
            crtAfterimageLag 2.6s ease-in-out infinite,
            crtGhostDrift 7.5s ease-in-out infinite;
        }

        .crt-static-burst-layer {
          z-index: 5;
          opacity: 0;
          mix-blend-mode: screen;
          background:
            radial-gradient(circle, rgba(255,255,255,0.8) 0.55px, transparent 0.7px) 0 0 / 8px 8px,
            radial-gradient(circle, rgba(150,235,255,0.22) 0.45px, transparent 0.6px) 3px 4px / 10px 10px;
          filter: blur(0.2px);
          animation:
            crtNoiseBurst 13s steps(1) infinite,
            crtNoiseDrift 0.18s steps(3) infinite;
        }

        .power-starting .crt-rgb-fringe {
          opacity: 0.3;
          filter: blur(2.5px) saturate(1.18);
          animation-duration: 0.08s, 0.34s;
        }

        .power-starting .crt-afterimage-layer {
          opacity: 0.16;
          filter: blur(9px);
        }

        .power-starting .crt-static-burst-layer {
          opacity: 0.08;
        }

        .power-stopping .crt-rgb-fringe {
          opacity: 0.34;
          filter: blur(2.8px) saturate(1.24);
          animation-duration: 0.06s, 0.18s;
        }

        .power-stopping .crt-afterimage-layer {
          opacity: 0.18;
          filter: blur(9px);
        }

        .power-stopping .crt-tear-layer,
        .power-stopping .crt-static-burst-layer {
          opacity: 0.18;
        }

        .crt-hud-corners {
          opacity: 0.22;
          background:
            linear-gradient(#8de2ff, #8de2ff) left top / 42px 2px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) left top / 2px 42px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) right top / 42px 2px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) right top / 2px 42px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) left bottom / 42px 2px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) left bottom / 2px 42px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) right bottom / 42px 2px no-repeat,
            linear-gradient(#8de2ff, #8de2ff) right bottom / 2px 42px no-repeat;
          filter: drop-shadow(0 0 4px rgba(141, 226, 255, 0.35));
          animation:
            crtHudPulse 4.5s ease-in-out infinite,
            crtHudShift 12s ease-in-out infinite;
        }

        .crt-hud-reticle {
          width: 92px;
          height: 92px;
          border-radius: 999px;
          border: 1px solid rgba(150, 235, 255, 0.24);
          box-shadow:
            0 0 10px rgba(150, 235, 255, 0.1),
            inset 0 0 10px rgba(150, 235, 255, 0.08);
          opacity: 0.18;
          animation:
            crtReticleSpin 18s linear infinite,
            crtReticlePulse 5s ease-in-out infinite;
        }

        .crt-hud-reticle::before,
        .crt-hud-reticle::after {
          content: "";
          position: absolute;
          inset: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .crt-hud-reticle::before {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 1px solid rgba(116, 255, 176, 0.2);
        }

        .crt-hud-reticle::after {
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(150,235,255,0.26), transparent);
          box-shadow: 0 0 6px rgba(150, 235, 255, 0.14);
        }

        .crt-hud-reticle-alt {
          width: 74px;
          height: 74px;
          opacity: 0.14;
          animation-duration: 14s, 3.8s;
          animation-direction: reverse, normal;
        }

        .crt-scope-rail {
          opacity: 0.18;
          overflow: hidden;
        }

        .crt-scope-rail::before,
        .crt-scope-rail::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 999px;
        }

        .crt-scope-rail::before {
          background:
            repeating-linear-gradient(
              180deg,
              transparent 0 10px,
              rgba(116, 255, 176, 0.16) 10px 12px,
              transparent 12px 18px
            );
          filter: blur(0.2px);
          animation: crtScopeFlow 3.8s linear infinite;
        }

        .crt-scope-rail::after {
          left: 10px;
          right: 10px;
          background:
            linear-gradient(
              180deg,
              transparent 0%,
              rgba(150,235,255,0.02) 18%,
              rgba(150,235,255,0.22) 50%,
              rgba(150,235,255,0.02) 82%,
              transparent 100%
            );
          filter: blur(2px);
          animation: crtScopePulse 4.6s ease-in-out infinite;
        }

        .crt-scope-rail-right::before {
          animation-duration: 4.6s;
          animation-direction: reverse;
        }

        .crt-scope-rail-right::after {
          animation-duration: 3.6s;
        }

        .crt-geo-triangles {
          opacity: 0.08;
          mix-blend-mode: screen;
          background-image:
            linear-gradient(60deg, transparent 47%, rgba(150,235,255,0.16) 49%, transparent 51%),
            linear-gradient(-60deg, transparent 47%, rgba(150,235,255,0.12) 49%, transparent 51%);
          background-size: 220px 220px, 220px 220px;
          animation:
            crtTrianglesDrift 22s linear infinite,
            crtTrianglesPulse 5s ease-in-out infinite;
        }

        .crt-signal-band {
          opacity: 0.11;
          background:
            linear-gradient(
              90deg,
              transparent 0%,
              rgba(90, 170, 255, 0.02) 18%,
              rgba(90, 170, 255, 0.18) 50%,
              rgba(90, 170, 255, 0.02) 82%,
              transparent 100%
            );
          filter: blur(5px);
          animation:
            crtBandSweep 8s linear infinite,
            crtBandFlicker 0.3s steps(2) infinite;
        }

        .crt-signal-band-late {
          animation-duration: 11s, 0.24s;
          animation-direction: reverse, normal;
          opacity: 0.08;
        }

        .crt-orbit-grid {
          opacity: 0.08;
          mix-blend-mode: screen;
          background:
            radial-gradient(circle at 50% 50%, rgba(116,255,176,0.14) 0 1px, transparent 1px 100%),
            radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(150,235,255,0.1) 18.25%, transparent 18.7%),
            radial-gradient(circle at 50% 50%, transparent 0 31%, rgba(150,235,255,0.08) 31.25%, transparent 31.7%);
          animation:
            crtOrbitBreath 8s ease-in-out infinite,
            crtOrbitRotate 28s linear infinite;
          transform-origin: center;
        }

        .crt-power-mask {
          overflow: hidden;
          opacity: 0;
        }

        .crt-power-vertical,
        .crt-power-horizontal,
        .crt-power-dot,
        .crt-power-flash {
          position: absolute;
          inset: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .crt-power-vertical {
          width: 2px;
          height: 0;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0), rgba(180,255,225,0.95), rgba(255,255,255,0));
          box-shadow:
            0 0 16px rgba(180,255,225,0.55),
            0 0 36px rgba(150,235,255,0.32);
          opacity: 0;
        }

        .crt-power-horizontal {
          width: 0;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(180,255,225,0.98), rgba(255,255,255,0));
          box-shadow:
            0 0 18px rgba(180,255,225,0.65),
            0 0 40px rgba(90,170,255,0.38);
          opacity: 0;
        }

        .crt-power-dot {
          width: 0;
          height: 0;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(170,255,225,1) 28%, rgba(120,225,255,0.7) 56%, rgba(120,225,255,0) 100%);
          box-shadow:
            0 0 22px rgba(180,255,225,0.65),
            0 0 50px rgba(120,225,255,0.36);
          opacity: 0;
        }

        .crt-power-flash {
          inset: 0;
          transform: none;
          background:
            radial-gradient(circle at center, rgba(255,255,255,0.55), rgba(180,255,225,0.18) 24%, rgba(255,255,255,0) 58%);
          opacity: 0;
        }

        .power-starting .crt-power-mask,
        .power-stopping .crt-power-mask {
          opacity: 1;
        }

        .power-starting .crt-power-vertical {
          animation: crtStartupVertical 1.0s cubic-bezier(0.16, 0.82, 0.2, 1) 1.2s forwards;
        }

        .power-starting .crt-power-horizontal {
          animation: crtStartupHorizontal 1.0s cubic-bezier(0.16, 0.82, 0.2, 1) 0.5s forwards;
        }

        .power-starting .crt-power-dot {
          animation: crtStartupDot 1.0s ease-out forwards;
          box-shadow:
            0 0 28px rgba(180,255,225,0.72),
            0 0 72px rgba(120,225,255,0.42);
        }

        .power-starting .crt-power-flash {
          animation: crtStartupFlash 2.3s ease-out forwards;
        }

        .power-stopping .crt-power-vertical {
          animation: crtShutdownVertical 0.34s cubic-bezier(0.55, 0, 0.82, 0.32) 0.08s forwards;
        }

        .power-stopping .crt-power-horizontal {
          animation: crtShutdownHorizontal 0.42s cubic-bezier(0.2, 0.75, 0.28, 1) forwards;
        }

        .power-stopping .crt-power-dot {
          animation: crtShutdownDot 0.24s ease-in 0.34s forwards;
          box-shadow:
            0 0 30px rgba(180,255,225,0.8),
            0 0 80px rgba(120,225,255,0.5);
        }

        .power-stopping .crt-power-flash {
          animation: crtShutdownFlash 0.3s ease-out forwards;
        }

        @keyframes crtStaticShift {
          0% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(-1px, 1px, 0); }
          50% { transform: translate3d(1px, -1px, 0); }
          75% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes crtStaticFlicker {
          0% { opacity: 0.08; }
          20% { opacity: 0.16; }
          40% { opacity: 0.1; }
          60% { opacity: 0.19; }
          80% { opacity: 0.11; }
          100% { opacity: 0.14; }
        }

        @keyframes crtVerticalRoll {
          0% { background-position: 0 -140%; }
          100% { background-position: 0 180%; }
        }

        @keyframes crtSweepLine {
          0% { transform: translateY(-16%); opacity: 0.08; }
          10% { opacity: 0.2; }
          50% { opacity: 0.28; }
          100% { transform: translateY(calc(100vh - 180px)); opacity: 0.06; }
        }

        @keyframes crtOverlayDrift {
          0% { transform: scale(1.04) translate3d(-1.5%, -1%, 0); }
          100% { transform: scale(1.12) translate3d(1.5%, 1%, 0); }
        }

        @keyframes crtOverlayPan {
          0% { transform: translate3d(-2%, 0, 0) scale(1.08); }
          50% { transform: translate3d(2%, -1.2%, 0) scale(1.12); }
          100% { transform: translate3d(-2%, 1.2%, 0) scale(1.08); }
        }

        @keyframes crtOverlayZoom {
          0% { transform: scale(1.04) rotate(-0.6deg); opacity: 0.045; }
          50% { opacity: 0.07; }
          100% { transform: scale(1.14) rotate(0.6deg); opacity: 0.055; }
        }

        @keyframes crtGridDrift {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(40px, 28px, 0); }
        }

        @keyframes crtGridPulse {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.14; }
        }

        @keyframes crtVignetteShift {
          0%, 100% { opacity: 0.24; }
          50% { opacity: 0.36; }
        }

        @keyframes crtStartupBloom {
          0% { opacity: 0.45; filter: blur(2.8px) brightness(1.5); }
          45% { opacity: 0.75; filter: blur(1.6px) brightness(1.85); }
          100% { opacity: 1; filter: blur(0.65px) brightness(1); }
        }

        @keyframes crtShutdownBloom {
          0% { opacity: 1; filter: blur(0.65px) brightness(1); }
          38% { opacity: 0.88; filter: blur(1.6px) brightness(1.45); }
          100% { opacity: 0.16; filter: blur(2.8px) brightness(2.1); }
        }

        @keyframes crtPulseGlow {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }

        @keyframes crtDustFloat {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-8px, 5px, 0); }
          100% { transform: translate3d(6px, -4px, 0); }
        }

        @keyframes crtDustFlicker {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.18; }
        }

        @keyframes crtPhosphorShift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0.6px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes crtPhosphorPulse {
          0%, 100% { opacity: 0.11; }
          50% { opacity: 0.17; }
        }

        @keyframes crtShadowMaskShift {
          0% { transform: translate3d(0, 0, 0); }
          33% { transform: translate3d(0.4px, 0, 0); }
          66% { transform: translate3d(-0.4px, 0.2px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes crtShadowMaskPulse {
          0%, 100% { opacity: 0.07; }
          50% { opacity: 0.12; }
        }

        @keyframes crtInterlaceDrift {
          0% { transform: translateY(0); }
          50% { transform: translateY(0.8px); }
          100% { transform: translateY(0); }
        }

        @keyframes crtInterlacePulse {
          0%, 100% { opacity: 0.07; }
          50% { opacity: 0.12; }
        }

        @keyframes crtMoireShift {
          0% { transform: translate3d(-1%, 0, 0) scale(1.01); }
          50% { transform: translate3d(1%, 0.4%, 0) scale(1.015); }
          100% { transform: translate3d(-1%, 0, 0) scale(1.01); }
        }

        @keyframes crtCompositeCrawl {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 32px 0, 0 2px; }
        }

        @keyframes crtCompositeFlicker {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }

        @keyframes crtGlassSweep {
          0%, 100% { transform: translate3d(-4%, 0, 0) skewX(-3deg); }
          50% { transform: translate3d(4%, 0, 0) skewX(-1deg); }
        }

        @keyframes crtGlareBreath {
          0%, 100% { opacity: 0.13; }
          50% { opacity: 0.24; }
        }

        @keyframes crtEdgeBreath {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 0.88; }
        }

        @keyframes crtBeamRace {
          0% { background-position: 0 -180px; }
          100% { background-position: 0 180px; }
        }

        @keyframes crtBeamFlicker {
          0%, 100% { opacity: 0.12; }
          50% { opacity: 0.2; }
        }

        @keyframes crtRefreshSweep {
          0% { background-position: 0 -240%; }
          100% { background-position: 0 240%; }
        }

        @keyframes crtRefreshFlicker {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.14; }
        }

        @keyframes crtTearBurst {
          0%, 88%, 100% { opacity: 0; }
          89% { opacity: 0.22; }
          90% { opacity: 0.08; }
          91% { opacity: 0.18; }
          92% { opacity: 0; }
        }

        @keyframes crtTearDrift {
          0% { transform: translateY(-8%); }
          100% { transform: translateY(8%); }
        }

        @keyframes crtRgbShift {
          0% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(0.8px, 0, 0); }
          50% { transform: translate3d(-0.8px, 0, 0); }
          75% { transform: translate3d(0.4px, 0.2px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes crtChromaticPulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.16; }
        }

        @keyframes crtAfterimageLag {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.12; }
        }

        @keyframes crtGhostDrift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0.8px, 0.4px, 0); }
          100% { transform: translate3d(-0.6px, 0, 0); }
        }

        @keyframes crtNoiseBurst {
          0%, 91%, 100% { opacity: 0; }
          92% { opacity: 0.12; }
          93% { opacity: 0.05; }
          94% { opacity: 0.14; }
          95% { opacity: 0; }
        }

        @keyframes crtNoiseDrift {
          0% { transform: translate3d(0, 0, 0); }
          33% { transform: translate3d(-1px, 1px, 0); }
          66% { transform: translate3d(1px, -1px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes crtNeonGlitchShift {
          0%, 100% { transform: translate3d(0, 0, 0) scaleX(1); }
          20% { transform: translate3d(-6px, 0, 0) scaleX(1.01); }
          42% { transform: translate3d(5px, 0, 0) scaleX(0.995); }
          61% { transform: translate3d(-3px, 1px, 0) scaleX(1.015); }
          79% { transform: translate3d(4px, -1px, 0) scaleX(0.99); }
        }

        @keyframes crtNeonGlitchFlicker {
          0%, 100% { opacity: 0.09; }
          18% { opacity: 0.18; }
          19% { opacity: 0.06; }
          36% { opacity: 0.22; }
          37% { opacity: 0.1; }
          68% { opacity: 0.2; }
          69% { opacity: 0.08; }
        }

        @keyframes crtNeonGlitchSweep {
          0% { background-position: -220px 0, 0 0; }
          100% { background-position: 220px 0, 0 120px; }
        }

        @keyframes crtPowerOnContent {
          0% { opacity: 0; transform: scaleY(0.004) scaleX(0.008); filter: brightness(3) saturate(1.25); }
          16% { opacity: 0.98; transform: scaleY(0.008) scaleX(0.03); filter: brightness(2.7) saturate(1.2); }
          40% { opacity: 1; transform: scaleY(0.016) scaleX(1); filter: brightness(2.1) saturate(1.14); }
          68% { opacity: 1; transform: scaleY(1.03) scaleX(1); filter: brightness(1.34) saturate(1.08); }
          84% { opacity: 0.985; transform: scaleY(0.985) scaleX(1); filter: brightness(1.08) saturate(1.03); }
          100% { opacity: 1; transform: scaleY(1) scaleX(1); filter: brightness(1) saturate(1); }
        }

        @keyframes crtPowerOffContent {
          0% { opacity: 1; transform: scaleY(1) scaleX(1); filter: brightness(1) saturate(1); }
          24% { opacity: 0.99; transform: scaleY(1.01) scaleX(1.002); filter: brightness(1.14) saturate(1.04); }
          54% { opacity: 0.98; transform: scaleY(0.016) scaleX(1); filter: brightness(1.95) saturate(1.14); }
          76% { opacity: 0.94; transform: scaleY(0.012) scaleX(0.16); filter: brightness(2.28) saturate(1.2); }
          100% { opacity: 0; transform: scaleY(0.004) scaleX(0.006); filter: brightness(2.8) saturate(1.26); }
        }

        @keyframes crtPowerOnStabilize {
          0% { opacity: 1; filter: brightness(1.18); }
          50% { opacity: 0.992; filter: brightness(0.94); }
          100% { opacity: 1; filter: brightness(1); }
        }

        @keyframes crtContentDrift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          35% { transform: translate3d(0.35px, -0.3px, 0); }
          70% { transform: translate3d(-0.35px, 0.25px, 0); }
        }

        @keyframes crtContentJitter {
          0% { opacity: 1; }
          48% { opacity: 0.998; }
          50% { opacity: 0.986; }
          52% { opacity: 1; }
          100% { opacity: 1; }
        }

        @keyframes crtHudPulse {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.28; }
        }

        @keyframes crtHudShift {
          0%, 100% { transform: scale(1) translate3d(0, 0, 0); }
          50% { transform: scale(1.006) translate3d(2px, -1px, 0); }
        }

        @keyframes crtReticleSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes crtReticlePulse {
          0%, 100% { opacity: 0.12; transform: scale(0.98); }
          50% { opacity: 0.24; transform: scale(1.03); }
        }

        @keyframes crtScopeFlow {
          0% { transform: translateY(-14%); }
          100% { transform: translateY(14%); }
        }

        @keyframes crtScopePulse {
          0%, 100% { transform: translateY(-30%); opacity: 0.08; }
          50% { transform: translateY(30%); opacity: 0.22; }
        }

        @keyframes crtTrianglesDrift {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 220px 0, -220px 0; }
        }

        @keyframes crtTrianglesPulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.1; }
        }

        @keyframes crtBandSweep {
          0% { transform: translate3d(-12%, 0, 0) scaleX(0.9); }
          50% { transform: translate3d(8%, 0, 0) scaleX(1.05); }
          100% { transform: translate3d(-12%, 0, 0) scaleX(0.9); }
        }

        @keyframes crtBandFlicker {
          0%, 100% { opacity: 0.07; }
          50% { opacity: 0.14; }
        }

        @keyframes crtOrbitBreath {
          0%, 100% { transform: scale(0.96); opacity: 0.05; }
          50% { transform: scale(1.03); opacity: 0.1; }
        }

        @keyframes crtOrbitRotate {
          0% { rotate: 0deg; }
          100% { rotate: 360deg; }
        }

        @keyframes crtStartupVertical {
          0% { height: 2px; opacity: 0; }
          18% { height: 2px; opacity: 0.14; }
          74% { height: 100%; opacity: 0.7; }
          100% { height: 100%; opacity: 0; }
        }

        @keyframes crtStartupHorizontal {
          0% { width: 0; opacity: 0; }
          12% { width: 0; opacity: 0.88; }
          62% { width: 100%; opacity: 0.92; }
          100% { width: 100%; opacity: 0; }
        }

        @keyframes crtStartupDot {
          0% { width: 3px; height: 3px; opacity: 0; }
          24% { width: 18px; height: 18px; opacity: 0.98; }
          58% { width: 76px; height: 7px; opacity: 0.9; }
          100% { width: 120px; height: 3px; opacity: 0; }
        }

        @keyframes crtStartupFlash {
          0% { opacity: 0.18; }
          20% { opacity: 0.86; }
          54% { opacity: 0.34; }
          100% { opacity: 0; }
        }

        @keyframes crtShutdownHorizontal {
          0% { width: 100%; opacity: 0.12; }
          22% { width: 100%; opacity: 0.92; }
          68% { width: 18%; opacity: 1; }
          100% { width: 0; opacity: 0; }
        }

        @keyframes crtShutdownVertical {
          0% { height: 100%; opacity: 0; }
          18% { height: 100%; opacity: 0.26; }
          56% { height: 32%; opacity: 0.76; }
          100% { height: 0; opacity: 0; }
        }

        @keyframes crtShutdownDot {
          0% { width: 0; height: 0; opacity: 0; }
          36% { width: 6px; height: 6px; opacity: 0.55; }
          72% { width: 14px; height: 14px; opacity: 0.98; }
          100% { width: 2px; height: 2px; opacity: 0; }
        }

        @keyframes crtShutdownFlash {
          0% { opacity: 0; }
          18% { opacity: 0.14; }
          44% { opacity: 0.4; }
          100% { opacity: 0; }
        }

        @keyframes crtShellFloat {
          0%, 100% { transform: perspective(2200px) rotateX(0.45deg) translateY(0); }
          50% { transform: perspective(2200px) rotateX(0.65deg) translateY(-1px); }
        }

        @keyframes crtCursorBlink {
          0%, 46% { opacity: 0.96; }
          47%, 100% { opacity: 0.08; }
        }

        @keyframes crtInputHintPulse {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.42; }
        }

        @keyframes browserScanScroll {
          0%   { background-position: 0 0; }
          100% { background-position: 0 9px; }
        }

        @keyframes browserBeamSweep {
          0%   { top: -4px; }
          100% { top: 100%; }
        }

        @keyframes browserFlicker {
          0%, 100% { background: rgba(0,0,0,0); }
          50%       { background: rgba(0,0,0,0.016); }
        }

        @keyframes browserLoadStatic {
          0%   { opacity: 0.92; }
          40%  { opacity: 0.58; }
          75%  { opacity: 0.22; }
          100% { opacity: 0;    }
        }
      `}</style>
    </div>
  );
}
