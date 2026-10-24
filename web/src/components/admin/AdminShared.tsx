"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";

import dynamic from "next/dynamic";













import type { ArticleSection, ProjectStatus, Campaign as StoredCampaign, CampaignStatus, ContactSubmission, RateLimitRecord, RizzSubmission, ImageAsset, SiteContent, ResumeProfile } from "@/lib/types";



import { SKILL_ICON_NAMES, SkillIcon } from "@/lib/skill-icons";


export const ContentStudio = dynamic(() => import("@/components/admin/ContentStudio"));

export const OperationsCenter = dynamic(() => import("@/components/admin/OperationsCenter"));

export const BackupManager = dynamic(() => import("@/components/admin/BackupManager"));

export const PublishingStudio = dynamic(() => import("@/components/admin/PublishingStudio"));

export const AIStudio = dynamic(() => import("@/components/admin/AIStudio"));

export const ContentHealth = dynamic(() => import("@/components/admin/ContentHealth"));

export const AnalyticsDashboard = dynamic(() => import("@/components/admin/AnalyticsDashboard"));

export const SessionsControl = dynamic(() => import("@/components/admin/SessionsControl"));

export const BookingAdmin = dynamic(() => import("@/components/admin/BookingAdmin"));

export const IdentitiesAdmin = dynamic(() => import("@/components/admin/IdentitiesAdmin"));

export const DeviceCandidates = dynamic(() => import("@/components/admin/DeviceCandidates"));

export const DiscordSettings = dynamic(() => import("@/components/admin/DiscordSettings"));

export const AiRoutingConditions = dynamic(() => import("@/components/admin/AiRoutingConditions"));

export const RizzSettings = dynamic(() => import("@/components/admin/RizzSettings"));

export const RizzSubmissions = dynamic(() => import("@/components/admin/RizzSubmissions"));

export type Contact = ContactSubmission;

export type RateLimit = RateLimitRecord;

export type RizzEntry = RizzSubmission;

export type Campaign = StoredCampaign;

export type MetricsAuditTarget = "project-views";

export type MetricsAuditResponse = {
  lines?: string[];
  totalProjectViews?: number;
  refreshedAt?: string;
};

export type R2BrowserFile = {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  publicUrl: string;
};

export type R2BrowserFolder = {
  name: string;
  prefix: string;
};

export type R2BrowserResponse = {
  prefix: string;
  folders: R2BrowserFolder[];
  files: R2BrowserFile[];
  mode: "browse" | "search";
};

export type NavSection =
  | "dashboard"
  | "projects"
  | "articles"
  | "clients"
  | "r2-assets"
  | "site-content"
  | "resume"
  | "analytics"
  | "sessions"
  | "contacts"
  | "rate-limits"
  | "ai"
  | "contact-form-entries"
  | "campaigns"
  | "rizz"
  | "bar"
  | "visitors"
  | "booking"
  | "identities"
  | "crossdevice"
  | "traffic"
  | "status"
  | "database"
  | "discord" | "content-studio" | "operations" | "publishing" | "content-health";

export const DEFAULT_RESUME_PROFILE: ResumeProfile = {
  fullName: "Michael Cran",
  title: "Software Engineer & Developer",
  location: "Orlando, Florida",
  email: "mdcranberry@gmail.com",
  linkedinUrl: "https://www.linkedin.com/in/mdcran/",
  githubUrl: "https://github.com/mdcran",
  pdfUrl: "",
  sectionOrder: ["experience", "featured", "education", "volunteer"],
};

export const PROJECT_VIEWS_AUDIT_CACHE_KEY = "mdcran-admin-project-views-audit";

export const PROJECT_VIEWS_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function toEditableImageAsset(image?: string | ImageAsset | null): ImageAsset {
  if (!image) {
    return { src: "", alt: "" };
  }

  if (typeof image === "string") {
    return { src: image, alt: "" };
  }

  return {
    src: image.src ?? "",
    alt: image.alt ?? "",
  };
}

export function cleanImageAsset(image: ImageAsset): ImageAsset | null {
  const src = image.src.trim();
  if (!src) return null;

  const alt = image.alt?.trim();

  return {
    src,
    ...(alt ? { alt } : {}),
  };
}

export function normalizeSectionForEditor(section: ArticleSection): ArticleSection {
  if (section.type !== "gallery") {
    return section;
  }

  return {
    ...section,
    images: (section.images?.length ? section.images : [""]).map((image) => toEditableImageAsset(image)),
  };
}

export function normalizeSectionForSave(section: ArticleSection): ArticleSection {
  if (section.type !== "gallery") {
    return section;
  }

  const images = (section.images ?? [])
    .map((image) => cleanImageAsset(toEditableImageAsset(image)))
    .filter((image): image is ImageAsset => !!image);

  return {
    ...section,
    images,
  };
}

export { fmtDate, fmtDateTime } from "@/lib/admin-date";

export function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatBytes(bytes?: number): string {
  const value = Math.max(0, bytes ?? 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

export function isImageAssetFile(fileName: string): boolean {
  return /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i.test(fileName);
}

export function r2DisplayName(key: string): string {
  const parts = key.split("/").filter(Boolean);
  if (parts.length <= 1) return key;
  return parts.slice(-2).join("/");
}

export function formatContactSource(source?: string): string {
  if (!source) return "—";
  if (source === "contact-form") return "Contact page";
  if (source === "home-page" || source === "subscribe-form") return "Home page";
  if (source === "subscribe-page") return "Subscribe page";
  if (source === "admin-center") return "Admin Center";
  return humanizeChoice(source);
}

export function formatRateLimitScope(scope?: string): string {
  if (!scope) return "—";
  if (scope === "contact-form") return "Contact page";
  if (scope === "subscribe-form") return "Home page / Subscribe page";
  return humanizeChoice(scope);
}

export function campaignDeliveredCount(campaign: Campaign): number {
  return campaign.deliveredContactIds?.length ?? 0;
}

export function campaignRemainingCount(campaign: Campaign): number {
  return Math.max((campaign.contactIds?.length ?? campaign.recipients ?? 0) - campaignDeliveredCount(campaign), 0);
}

export function compareStrings(a?: string, b?: string, direction: "asc" | "desc" = "asc"): number {
  const left = (a ?? "").toLowerCase();
  const right = (b ?? "").toLowerCase();
  if (left === right) return 0;
  const result = left < right ? -1 : 1;
  return direction === "asc" ? result : -result;
}

export function compareDates(a?: string, b?: string, direction: "newest" | "oldest" = "newest"): number {
  const left = new Date(a ?? 0).getTime();
  const right = new Date(b ?? 0).getTime();
  return direction === "newest" ? right - left : left - right;
}

export function humanizeChoice(value?: string): string {
  if (!value) return "â€”";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function humanizeChoiceList(values?: string[]): string {
  if (!values || values.length === 0) return "â€”";
  return values.map((value) => humanizeChoice(value)).join(", ");
}

export function DragReorderList<T>({ items, keyFn, onReorder, renderItem }: {
  items: T[];
  keyFn: (item: T, idx: number) => string;
  onReorder: (from: number, to: number) => void;
  renderItem: (item: T, idx: number) => React.ReactNode;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  return (
    <div>
      {items.map((item, i) => (
        <div key={keyFn(item, i)} className="relative">
          {/* Drop indicator line — shows above this item when dragging over the top half */}
          {dragIdx !== null && dropIdx === i && dropIdx !== dragIdx && (
            <div className="absolute -top-px left-2 right-2 h-0.5 bg-[#ef4242] rounded-full z-10 shadow-[0_0_6px_rgba(239,66,66,0.5)]" />
          )}
          <div
            draggable
            onDragStart={() => { setDragIdx(i); setDropIdx(null); }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              const rect = e.currentTarget.getBoundingClientRect();
              const midY = rect.top + rect.height / 2;
              setDropIdx(e.clientY < midY ? i : i + 1);
            }}
            onDragLeave={() => setDropIdx(null)}
            onDrop={() => {
              if (dragIdx !== null && dropIdx !== null && dropIdx !== dragIdx) {
                const target = dropIdx > dragIdx ? dropIdx - 1 : dropIdx;
                if (target !== dragIdx) onReorder(dragIdx, target);
              }
              setDragIdx(null);
              setDropIdx(null);
            }}
            onDragEnd={() => { setDragIdx(null); setDropIdx(null); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-sm bg-white/2 border cursor-grab active:cursor-grabbing transition-colors mb-1 ${dragIdx === i ? "opacity-30" : ""} border-white/6`}
          >
            {renderItem(item, i)}
          </div>
          {/* Drop indicator line — shows below the last item when dragging over the bottom half */}
          {dragIdx !== null && dropIdx === i + 1 && i === items.length - 1 && dropIdx !== dragIdx && (
            <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-[#ef4242] rounded-full z-10 shadow-[0_0_6px_rgba(239,66,66,0.5)]" />
          )}
        </div>
      ))}
    </div>
  );
}

export function arrayMove<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export const inputCls =
  "w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 h-9 text-sm text-white outline-none placeholder-white/25 transition-colors";

export const textareaCls =
  "w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-y min-h-[80px] leading-relaxed";

export const labelCls = "block text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5";

export const btnRed = "px-4 h-9 bg-[#ef4242] hover:bg-[#d93838] text-white text-xs font-medium rounded-sm transition-colors";

export const btnGhost = "inline-flex items-center justify-center px-4 h-8 min-w-[60px] border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-xs rounded-sm transition-colors";

export const btnOutlineRed = "inline-flex items-center justify-center px-3 h-8 text-[11px] border border-[#ef4242]/40 text-[#ef4242] hover:bg-[#ef4242]/10 rounded-sm transition-colors";

export const btnOutline = "inline-flex items-center justify-center px-3 h-8 text-[11px] border border-white/15 text-white/50 hover:text-white hover:border-white/30 rounded-sm transition-colors";

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelCls}>
      {children}
      {required && <span className="text-[#ef4242] ml-0.5">*</span>}
    </label>
  );
}

export function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0">{children}</div>;
}

export type EditableActionLink = SiteContent["footer"]["bottomLinks"][number];

export function StringChipEditor({
  items,
  onChange,
  placeholder,
  addLabel = "Add",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addItem() {
    const next = draft.trim();
    if (!next) return;
    onChange([...items, next]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          className={inputCls}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className={`${btnOutline} cursor-pointer`} onClick={addItem}>
          {addLabel}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null) return;
              onChange(arrayMove(items, dragIndex, index));
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className="inline-flex max-w-full cursor-move items-center gap-2 rounded-sm border border-white/10 bg-black/20 px-2.5 py-2 text-xs text-white/75"
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              className="text-white/35 transition-colors hover:text-[#ef4242]"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              aria-label={`Remove ${item}`}
            >
              x
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-white/25">No items yet.</p>}
      </div>
    </div>
  );
}

export function ActionLinkListEditor({
  items,
  onChange,
}: {
  items: EditableActionLink[];
  onChange: (items: EditableActionLink[]) => void;
}) {
  const [labelDraft, setLabelDraft] = useState("");
  const [hrefDraft, setHrefDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function addItem() {
    const label = labelDraft.trim();
    const href = hrefDraft.trim();
    if (!label && !href) return;

    onChange([
      ...items,
      {
        label: label || href || "Link",
        href: href || "/",
      },
    ]);
    setLabelDraft("");
    setHrefDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_1.4fr_auto]">
        <input
          className={inputCls}
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          placeholder="Link label"
        />
        <input
          className={inputCls}
          value={hrefDraft}
          onChange={(e) => setHrefDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="/link"
        />
        <button type="button" className={`${btnOutline} cursor-pointer`} onClick={addItem}>
          Add Link
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null) return;
              onChange(arrayMove(items, dragIndex, index));
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className="grid cursor-move grid-cols-1 gap-2 rounded-sm border border-white/8 bg-black/20 p-3 lg:grid-cols-[1fr_1.4fr_auto]"
          >
            <input
              className={inputCls}
              value={item.label}
              onChange={(e) =>
                onChange(items.map((entry, itemIndex) => (
                  itemIndex === index ? { ...entry, label: e.target.value } : entry
                )))
              }
            />
            <input
              className={inputCls}
              value={item.href}
              onChange={(e) =>
                onChange(items.map((entry, itemIndex) => (
                  itemIndex === index ? { ...entry, href: e.target.value } : entry
                )))
              }
            />
            <button
              type="button"
              className="text-xs text-[#ef4242]/70 transition-colors hover:text-[#ef4242]"
              onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-white/25">No links yet.</p>}
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  fullPage,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  fullPage?: boolean;
}) {
  if (fullPage) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/8 bg-[#0d0d0d] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back
            </button>
            <div className="w-px h-5 bg-white/10" />
            <h2 className="font-nord text-sm text-white tracking-wide">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <div
          className={`bg-[#0d0d0d] border border-white/10 rounded-sm ${wide ? "max-w-3xl" : "max-w-2xl"} w-full max-h-[calc(100dvh-3rem)] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="font-nord text-base text-white">{title}</h2>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function IconPickerButton({
  value,
  onChange,
  label = "Icon",
}: {
  value?: string;
  onChange: (icon: string | undefined) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query
    ? SKILL_ICON_NAMES.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : SKILL_ICON_NAMES;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 h-9 text-[11px] border border-white/15 text-white/50 hover:text-white hover:border-white/30 rounded-sm transition-colors"
        title={`${label}: ${value || "none"}`}
      >
        {value ? <SkillIcon name={value} size={14} className="text-[#ef4242]" /> : <span className="text-white/30">◇</span>}
        <span className="truncate max-w-[80px]">{value || label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-64 rounded-sm border border-white/15 bg-[#0d0d0d] p-2 shadow-xl">
            <input
              autoFocus
              className="w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-2 h-7 text-xs text-white outline-none placeholder-white/25 mb-2"
              placeholder="Search icons…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onChange(undefined); setOpen(false); }}
                className={`flex items-center justify-center h-8 rounded-sm border text-[10px] ${!value ? "border-[#ef4242]/50 text-[#ef4242]" : "border-white/10 text-white/30 hover:border-white/30"}`}
                title="No icon"
              >
                ✕
              </button>
              {filtered.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={`flex items-center justify-center h-8 rounded-sm border transition-colors ${value === name ? "border-[#ef4242]/50 bg-[#ef4242]/10 text-[#ef4242]" : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"}`}
                  title={name}
                >
                  <SkillIcon name={name} size={15} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DeleteDialog({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm rounded-sm border border-white/10 bg-[#0d0d0d] p-6 space-y-4">
          <p className="text-sm text-white/80">
            Delete <span className="text-white font-medium">&quot;{label}&quot;</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button className={btnGhost} onClick={onCancel}>Cancel</button>
            <button className={btnRed} onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PricingBadge({ status }: { status: ProjectStatus }) {
  const map: Record<ProjectStatus, string> = {
    free: "bg-emerald-500/15 text-emerald-400",
    for_sale: "bg-amber-500/15 text-amber-400",
    unavailable: "bg-white/8 text-white/40",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-sm ${map[status]}`}>
      {status === "for_sale" ? "For Sale" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const map = { draft: "bg-white/8 text-white/40", sent: "bg-emerald-500/15 text-emerald-400", scheduled: "bg-amber-500/15 text-amber-400" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-sm ${map[status]}`}>{status}</span>;
}

export function stripHtmlPreview(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toLocalDateTimeInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function SeedDatabaseCard({ onSeeded }: { onSeeded: () => void }) {
  const [seeding, setSeeding] = React.useState(false);
  const [results, setResults] = React.useState<{ collection: string; seeded: number; skipped: boolean }[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSeed() {
    setSeeding(true);
    setResults(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: false }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Seed failed"); return; }
      setResults(data.results);
      onSeeded();
    } catch (e) {
      setError(String(e));
    } finally {
      setSeeding(false);
    }
  }

  const anySeeded = results?.some((r) => !r.skipped);

  return (
    <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <p className="font-nord text-sm text-white">Seed Database</p>
          <p className="text-xs text-white/35 mt-0.5">
            Populate empty MongoDB collections from the built-in data.ts defaults. Existing records are never overwritten.
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="shrink-0 h-8 px-4 text-xs tracking-wider uppercase border border-white/15 text-white/70 hover:text-white hover:border-white/30 rounded-sm transition-colors disabled:opacity-40"
        >
          {seeding ? "Seeding…" : "Seed Empty Collections"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {results && (
        <div className="space-y-1">
          {results.map((r) => (
            <div key={r.collection} className="flex items-center gap-3 text-xs">
              <span className={r.skipped ? "text-white/30" : "text-emerald-400"}>
                {r.skipped ? "—" : "✓"}
              </span>
              <span className="text-white/60 w-28">{r.collection}</span>
              <span className="text-white/40">
                {r.skipped ? "already has data — skipped" : `${r.seeded} record${r.seeded !== 1 ? "s" : ""} inserted`}
              </span>
            </div>
          ))}
          {anySeeded && <p className="text-xs text-emerald-400/70 pt-1">Done. Data refreshed above.</p>}
          {!anySeeded && <p className="text-xs text-white/30 pt-1">All collections already have data — nothing was seeded.</p>}
        </div>
      )}
    </div>
  );
}
