"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSWRConfig } from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import TapsChart from "@/components/admin/TapsChart";
import { isValidEmail, isValidPhoneNumber } from "@/lib/contact-validation";
import type {
  Project,
  Article,
  Client,
  Experience,
  Education,
  Skill,
  Certification,
  Award,
  ClubMembership,
  ArticleSection,
  SocialLink,
  Platform,
  ArticleCategory,
  Category,
  Subcategory,
  ProjectStatus,
  Campaign as StoredCampaign,
  CampaignType,
  CampaignStatus,
  ContactSubmission,
  RateLimitRecord,
  RizzSubmission,
  ImageAsset,
  SiteContent,
} from "@/lib/types";
import { defaultSiteContent } from "@/lib/site-content";
import { assetUrl } from "@/lib/utils";

/* ─── Local-only types ───────────────────────────────────── */
type Contact = ContactSubmission;
type RateLimit = RateLimitRecord;
type RizzEntry = RizzSubmission;
type Campaign = StoredCampaign;
type MetricsAuditTarget = "project-views";
type MetricsAuditResponse = {
  lines?: string[];
  totalProjectViews?: number;
  refreshedAt?: string;
};

type R2BrowserFile = {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  publicUrl: string;
};

type R2BrowserFolder = {
  name: string;
  prefix: string;
};

type R2BrowserResponse = {
  prefix: string;
  folders: R2BrowserFolder[];
  files: R2BrowserFile[];
  mode: "browse" | "search";
};

type NavSection =
  | "dashboard"
  | "projects"
  | "articles"
  | "clients"
  | "r2-assets"
  | "site-content"
  | "resume"
  | "contacts"
  | "rate-limits"
  | "contact-form-entries"
  | "campaigns"
  | "rizz";

const SKILL_CATEGORY_OPTIONS = ["technology", "creative", "languages", "other"] as const;
const PROJECT_VIEWS_AUDIT_CACHE_KEY = "mdcran-admin-project-views-audit";
const PROJECT_VIEWS_REFRESH_INTERVAL_MS = 20 * 60 * 1000;

/* ─── Utility helpers ─────────────────────────────────────── */
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toEditableImageAsset(image?: string | ImageAsset | null): ImageAsset {
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

function cleanImageAsset(image: ImageAsset): ImageAsset | null {
  const src = image.src.trim();
  if (!src) return null;

  const alt = image.alt?.trim();

  return {
    src,
    ...(alt ? { alt } : {}),
  };
}

function normalizeSectionForEditor(section: ArticleSection): ArticleSection {
  if (section.type !== "gallery") {
    return section;
  }

  return {
    ...section,
    images: (section.images?.length ? section.images : [""]).map((image) => toEditableImageAsset(image)),
  };
}

function normalizeSectionForSave(section: ArticleSection): ArticleSection {
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

function fmtDate(d?: string): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

function fmtDateTime(d?: string): string {
  if (!d) return "â€”";
  try {
    return new Date(d).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatBytes(bytes?: number): string {
  const value = Math.max(0, bytes ?? 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

function isImageAssetFile(fileName: string): boolean {
  return /\.(?:png|jpe?g|gif|webp|avif|svg|ico)$/i.test(fileName);
}

function formatContactSource(source?: string): string {
  if (!source) return "—";
  if (source === "contact-form") return "Contact page";
  if (source === "home-page" || source === "subscribe-form") return "Home page";
  if (source === "subscribe-page") return "Subscribe page";
  if (source === "admin-center") return "Admin Center";
  return humanizeChoice(source);
}

function formatRateLimitScope(scope?: string): string {
  if (!scope) return "—";
  if (scope === "contact-form") return "Contact page";
  if (scope === "subscribe-form") return "Home page / Subscribe page";
  return humanizeChoice(scope);
}

/* ─── Shared UI primitives ───────────────────────────────── */
function campaignDeliveredCount(campaign: Campaign): number {
  return campaign.deliveredContactIds?.length ?? 0;
}

function campaignRemainingCount(campaign: Campaign): number {
  return Math.max((campaign.contactIds?.length ?? campaign.recipients ?? 0) - campaignDeliveredCount(campaign), 0);
}

function compareStrings(a?: string, b?: string, direction: "asc" | "desc" = "asc"): number {
  const left = (a ?? "").toLowerCase();
  const right = (b ?? "").toLowerCase();
  if (left === right) return 0;
  const result = left < right ? -1 : 1;
  return direction === "asc" ? result : -result;
}

function compareDates(a?: string, b?: string, direction: "newest" | "oldest" = "newest"): number {
  const left = new Date(a ?? 0).getTime();
  const right = new Date(b ?? 0).getTime();
  return direction === "newest" ? right - left : left - right;
}

function humanizeChoice(value?: string): string {
  if (!value) return "â€”";
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function humanizeChoiceList(values?: string[]): string {
  if (!values || values.length === 0) return "â€”";
  return values.map((value) => humanizeChoice(value)).join(", ");
}

function arrayMove<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

const inputCls =
  "w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 h-9 text-sm text-white outline-none placeholder-white/25 transition-colors";
const textareaCls =
  "w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none";
const labelCls = "block text-[10px] tracking-[0.2em] uppercase text-white/40 mb-1.5";
const btnRed = "px-4 h-9 bg-[#ef4242] hover:bg-[#d93838] text-white text-xs font-medium rounded-sm transition-colors";
const btnGhost = "inline-flex items-center justify-center px-4 h-8 min-w-[60px] border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-xs rounded-sm transition-colors";
const btnOutlineRed = "inline-flex items-center justify-center px-3 h-8 text-[11px] border border-[#ef4242]/40 text-[#ef4242] hover:bg-[#ef4242]/10 rounded-sm transition-colors";
const btnOutline = "inline-flex items-center justify-center px-3 h-8 text-[11px] border border-white/15 text-white/50 hover:text-white hover:border-white/30 rounded-sm transition-colors";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelCls}>
      {children}
      {required && <span className="text-[#ef4242] ml-0.5">*</span>}
    </label>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-0">{children}</div>;
}

type EditableActionLink = SiteContent["footer"]["bottomLinks"][number];

function StringChipEditor({
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

function ActionLinkListEditor({
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
            key={`${item.label}-${item.href}-${index}`}
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

/* ─── Modal wrapper ──────────────────────────────────────── */
function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className={`bg-[#0d0d0d] border border-white/10 rounded-sm ${wide ? "max-w-3xl" : "max-w-2xl"} w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="font-nord text-base text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ContactEditorModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Contact | null;
  onClose: () => void;
  onSave: (contact: Contact) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [subscribed, setSubscribed] = useState(initial?.subscribed ?? true);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [error, setError] = useState("");

  function handleSave() {
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail && !trimmedPhone) {
      setError("Email or phone is required.");
      return;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      setError("Enter a valid phone number.");
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      email: trimmedEmail ? trimmedEmail.toLowerCase() : undefined,
      phone: trimmedPhone || undefined,
      subject: subject.trim() || "Admin Contact",
      message: message.trim() || "Added from the admin center.",
      source: "admin-center",
      subscribed,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
      messageRead: initial?.messageRead ?? true,
      messageReadAt: initial?.messageReadAt ?? now,
    });
  }

  return (
    <Modal title={initial ? "Edit Contact" : "Add Contact"} onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label required>Name</Label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" />
          </Field>
          <Field>
            <Label>Email</Label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </Field>
          <Field>
            <Label>Phone</Label>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
          </Field>
          <Field>
            <Label>Subscribed</Label>
            <button
              type="button"
              className={`h-9 rounded-sm border text-xs transition-colors ${
                subscribed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/4 text-white/45 hover:text-white"
              }`}
              onClick={() => setSubscribed((prev) => !prev)}
            >
              {subscribed ? "Subscribed" : "Not Subscribed"}
            </button>
          </Field>
        </div>
        <Field>
          <Label>Subject</Label>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Admin Contact" />
        </Field>
        <Field>
          <Label>Notes</Label>
          <textarea className={textareaCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Added from the admin center." />
        </Field>
        {error && <p className="text-[11px] text-[#ef4242]">{error}</p>}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={`${btnGhost} cursor-pointer`} onClick={onClose}>Cancel</button>
        <button className={`${btnRed} cursor-pointer`} onClick={handleSave}>Save Contact</button>
      </div>
    </Modal>
  );
}

function R2ImagePickerModal({
  title = "Select Image",
  onClose,
  onSelect,
}: {
  title?: string;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [prefix, setPrefix] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<R2BrowserFolder[]>([]);
  const [files, setFiles] = useState<R2BrowserFile[]>([]);
  const imageFiles = files.filter((file) => isImageAssetFile(file.name));

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (prefix) {
        params.set("prefix", prefix);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/r2${params.toString() ? `?${params.toString()}` : ""}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as R2BrowserResponse | { error?: string };

        if (!response.ok) {
          throw new Error("error" in data && data.error ? data.error : "Failed to load R2 assets.");
        }

        if (cancelled) {
          return;
        }

        const payload = data as R2BrowserResponse;
        setFolders(payload.folders);
        setFiles(payload.files);
      } catch (fetchError) {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        setFolders([]);
        setFiles([]);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load R2 assets.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, search.trim() ? 180 : 0);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [prefix, search]);

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images..."
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={btnOutline}
              onClick={() => setSearch("")}
              disabled={!search}
            >
              Clear Search
            </button>
            <button
              type="button"
              className={btnOutline}
              onClick={() => {
                const trimmed = prefix.replace(/\/$/, "");
                setSearch("");
                setPrefix(trimmed.includes("/") ? `${trimmed.slice(0, trimmed.lastIndexOf("/") + 1)}` : "");
              }}
              disabled={!prefix}
            >
              Up One Level
            </button>
          </div>
        </div>

        <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-white/35">
          <span className="text-white/50">Location:</span> {search.trim() ? `Search in ${prefix || "bucket root"}` : prefix || "bucket root"}
        </div>

        {error && (
          <div className="rounded-sm border border-[#ef4242]/20 bg-[#ef4242]/8 px-3 py-2 text-xs text-[#ef4242]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border border-white/7 bg-white/2 rounded-sm overflow-hidden">
            <div className="border-b border-white/8 px-4 py-3 text-[10px] tracking-widest uppercase text-white/35">
              Folders
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {folders.length === 0 ? (
                <div className="px-4 py-6 text-xs text-white/25">
                  {search.trim() ? "Folder browse is hidden while searching." : "No folders here."}
                </div>
              ) : (
                folders.map((folder) => (
                  <button
                    key={folder.prefix}
                    type="button"
                    className="flex w-full items-center justify-between border-b border-white/6 px-4 py-3 text-left text-xs text-white/55 transition-colors hover:bg-white/3 hover:text-white"
                    onClick={() => {
                      setSearch("");
                      setPrefix(folder.prefix);
                    }}
                  >
                    <span className="truncate">{folder.name}/</span>
                    <span className="text-white/20">Open</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="border border-white/7 bg-white/2 rounded-sm overflow-hidden">
            <div className="border-b border-white/8 px-4 py-3 text-[10px] tracking-widest uppercase text-white/35">
              Images ({imageFiles.length})
            </div>
            {imageFiles.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-white/25">
                {loading ? "Loading images..." : "No image files found here."}
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto space-y-0">
                {imageFiles.map((file) => (
                  <div key={file.key} className="border-b border-white/6 px-4 py-3 last:border-b-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <img
                          src={file.publicUrl}
                          alt={file.name}
                          className="h-14 w-20 shrink-0 rounded-sm border border-white/8 bg-black/20 object-cover"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs text-white/75">{file.name}</div>
                          <div className="truncate text-[10px] text-white/25">{file.key}</div>
                          <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-white/25">
                            <span>{formatBytes(file.size)}</span>
                            <span>{fmtDateTime(file.lastModified)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`${btnOutline} cursor-pointer`}
                        onClick={() => onSelect(file.publicUrl)}
                      >
                        Select Image
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Delete confirm dialog ──────────────────────────────── */
function DeleteDialog({ label, onCancel, onConfirm }: { label: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-sm max-w-sm w-full p-6 space-y-4">
        <p className="text-sm text-white/80">
          Delete <span className="text-white font-medium">&quot;{label}&quot;</span>? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
          <button className={btnRed} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Badge helpers ──────────────────────────────────────── */
function PricingBadge({ status }: { status: ProjectStatus }) {
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

function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const map = { draft: "bg-white/8 text-white/40", sent: "bg-emerald-500/15 text-emerald-400", scheduled: "bg-amber-500/15 text-amber-400" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-sm ${map[status]}`}>{status}</span>;
}

/* ═══════════════════════════════════════════════════════════
   PROJECT MODAL
═══════════════════════════════════════════════════════════ */
function ProjectModal({
  initial,
  clients,
  onClose,
  onSave,
}: {
  initial?: Project;
  clients: Client[];
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "arts-and-entertainment");
  const [subcategory, setSubcategory] = useState<string>(initial?.subcategory ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [coverImage, setCoverImage] = useState<ImageAsset>(() => toEditableImageAsset(initial?.coverImage));
  const [galleryImages, setGalleryImages] = useState<ImageAsset[]>(
    () => (initial?.images?.length ? initial.images.map((image) => toEditableImageAsset(image)) : [{ src: "", alt: "" }])
  );
  const [pricingStatus, setPricingStatus] = useState<ProjectStatus>(initial?.pricing.status ?? "free");
  const [price, setPrice] = useState(initial?.pricing.price ? (initial.pricing.price / 100).toFixed(2) : "");
  const [downloadUrl, setDownloadUrl] = useState(initial?.pricing.downloadUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(initial?.liveUrl ?? "");
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [publishDate, setPublishDate] = useState(initial?.publishDate ?? "");
  const [clientIds, setClientIds] = useState<string[]>(initial?.clientIds ?? []);
  const [videos, setVideos] = useState<{ youtubeId: string; title: string }[]>(
    (initial?.videos ?? []).map((v) => ({ youtubeId: v.youtubeId, title: v.title ?? "" }))
  );
  const [credits, setCredits] = useState<{ name: string; role: string }[]>(
    (initial?.credits ?? []).map((c) => ({ name: c.name, role: c.role }))
  );
  const [sections, setSections] = useState<ArticleSection[]>(
    () => (initial?.sections ?? []).map((section) => normalizeSectionForEditor(section))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [imagePickerTarget, setImagePickerTarget] = useState<
    | null
    | { kind: "cover" }
    | { kind: "gallery"; index: number }
    | { kind: "section-image"; sectionIndex: number }
    | { kind: "section-gallery"; sectionIndex: number; imageIndex: number }
  >(null);

  function validate() {
    const e: string[] = [];
    if (!title.trim()) e.push("title");
    setErrors(e);
    return e.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const finalSlug = slug.trim() || slugify(title);
    const images = galleryImages
      .map((image) => cleanImageAsset(image))
      .filter((image): image is ImageAsset => !!image);
    const cleanedVideos = videos
      .map((v) => ({ youtubeId: v.youtubeId.trim(), title: v.title.trim() }))
      .filter((v) => v.youtubeId);
    const cleanedCredits = credits
      .map((c) => ({ name: c.name.trim(), role: c.role.trim() }))
      .filter((c) => c.name && c.role);
    const cleanedSections = sections
      .map((section) => normalizeSectionForSave(section))
      .filter((section) => section.type !== "gallery" || (section.images?.length ?? 0) > 0);
    const project: Project = {
      id: initial?.id ?? uid(),
      slug: finalSlug,
      title: title.trim(),
      description: description.trim() || undefined,
      category: category as Category,
      subcategory:
        category === "arts-and-entertainment" || category === "motion-and-graphics"
          ? ((subcategory || undefined) as Subcategory | undefined)
          : undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      coverImage: cleanImageAsset(coverImage) ?? undefined,
      images: images.length ? images : undefined,
      pricing: {
        status: pricingStatus,
        price: pricingStatus === "for_sale" && price ? Math.round(parseFloat(price) * 100) : undefined,
        downloadUrl: pricingStatus === "free" && downloadUrl ? downloadUrl.trim() : undefined,
      },
      liveUrl: liveUrl.trim() || undefined,
      externalUrl: externalUrl.trim() || undefined,
      videos: cleanedVideos.length ? cleanedVideos : undefined,
      credits: cleanedCredits.length ? cleanedCredits : undefined,
      sections: cleanedSections.length ? cleanedSections : undefined,
      featured,
      publishDate: publishDate || undefined,
      clientIds: clientIds.length ? clientIds : undefined,
    };
    onSave(project);
  }

  function addSection(type: ArticleSection["type"]) {
    const defaults: Record<ArticleSection["type"], ArticleSection> = {
      text: { type: "text", content: "" },
      image: { type: "image", src: "", alt: "", caption: "" },
      gallery: { type: "gallery", images: [{ src: "", alt: "" }] },
      video: { type: "video", youtubeId: "" },
      quote: { type: "quote", content: "" },
      code: { type: "code", content: "", language: "javascript" },
      divider: { type: "divider" },
      checklist: { type: "checklist", items: [], caption: "" },
      "ingredient-list": { type: "ingredient-list", items: [], caption: "" },
      steps: { type: "steps", items: [], caption: "" },
      "store-checklist": { type: "store-checklist", items: [], caption: "" },
      "info-block": { type: "info-block", content: "", caption: "" },
    };
    setSections((prev) => [...prev, { ...defaults[type] }]);
  }

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateSection(idx: number, partial: Partial<ArticleSection>) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  }

  function updateGalleryImage(idx: number, partial: Partial<ImageAsset>) {
    setGalleryImages((prev) => prev.map((image, i) => (i === idx ? { ...image, ...partial } : image)));
  }

  function addGalleryImage() {
    setGalleryImages((prev) => [...prev, { src: "", alt: "" }]);
  }

  function removeGalleryImage(idx: number) {
    setGalleryImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ src: "", alt: "" }];
    });
  }

  function updateSectionGalleryImage(sectionIdx: number, imageIdx: number, partial: Partial<ImageAsset>) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    const nextImages = (section.images ?? [{ src: "", alt: "" }]).map((image, i) =>
      i === imageIdx ? { ...toEditableImageAsset(image), ...partial } : toEditableImageAsset(image)
    );
    updateSection(sectionIdx, { images: nextImages });
  }

  function addSectionGalleryImage(sectionIdx: number) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    updateSection(sectionIdx, { images: [...(section.images ?? []), { src: "", alt: "" }] });
  }

  function removeSectionGalleryImage(sectionIdx: number, imageIdx: number) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    const nextImages = (section.images ?? []).filter((_, i) => i !== imageIdx);
    updateSection(sectionIdx, { images: nextImages.length ? nextImages : [{ src: "", alt: "" }] });
  }

  function applySelectedImage(url: string) {
    if (!imagePickerTarget) return;

    if (imagePickerTarget.kind === "cover") {
      setCoverImage((prev) => ({ ...prev, src: url }));
    } else if (imagePickerTarget.kind === "gallery") {
      updateGalleryImage(imagePickerTarget.index, { src: url });
    } else if (imagePickerTarget.kind === "section-image") {
      updateSection(imagePickerTarget.sectionIndex, { src: url });
    } else if (imagePickerTarget.kind === "section-gallery") {
      updateSectionGalleryImage(imagePickerTarget.sectionIndex, imagePickerTarget.imageIndex, { src: url });
    }

    setImagePickerTarget(null);
  }

  const isErr = (f: string) => errors.includes(f);

  return (
    <>
    <Modal title={initial ? "Edit Project" : "New Project"} onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label required>Title</Label>
            <input
              className={`${inputCls} ${isErr("title") ? "border-[#ef4242]" : ""}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
            />
          </Field>
          <Field>
            <Label>Slug</Label>
            <input
              className={inputCls}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from title"
            />
          </Field>
        </div>

        <Field>
          <Label>Description</Label>
          <textarea className={textareaCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Project description…" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Category</Label>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => {
                const next = e.target.value;
                setCategory(next);
                if (next === "coding-projects") {
                  setSubcategory("");
                } else if (
                  next === "arts-and-entertainment" &&
                  subcategory &&
                  !["minecraft-maps", "events"].includes(subcategory)
                ) {
                  setSubcategory("");
                } else if (
                  next === "motion-and-graphics" &&
                  subcategory &&
                  !["thumbnail-design", "video-editing", "web-dev-design"].includes(subcategory)
                ) {
                  setSubcategory("");
                }
              }}
            >
              <option value="arts-and-entertainment">Arts & Entertainment</option>
              <option value="motion-and-graphics">Motion & Graphics</option>
              <option value="coding-projects">Code</option>
            </select>
          </Field>
          <Field>
            <Label>Subcategory</Label>
            <select
              className={inputCls}
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={category === "coding-projects"}
            >
              <option value="">— None —</option>
              {category === "arts-and-entertainment" && (
                <>
                  <option value="minecraft-maps">Minecraft Maps</option>
                  <option value="events">Events</option>
                </>
              )}
              {category === "motion-and-graphics" && (
                <>
                  <option value="thumbnail-design">Thumbnail Design</option>
                  <option value="video-editing">Video Editing</option>
                  <option value="web-dev-design">Web Dev & Design</option>
                </>
              )}
            </select>
          </Field>
        </div>

        <Field>
          <Label>Tags</Label>
          <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="minecraft, map, adventure (comma-separated)" />
        </Field>

        <Field>
          <Label>Cover Image URL</Label>
          <div className="grid grid-cols-[1.6fr_1fr_auto] gap-2">
            <input
              className={inputCls}
              value={coverImage.src}
              onChange={(e) => setCoverImage((prev) => ({ ...prev, src: e.target.value }))}
              placeholder="/cdn/…/cover.png"
            />
            <input
              className={inputCls}
              value={coverImage.alt ?? ""}
              onChange={(e) => setCoverImage((prev) => ({ ...prev, alt: e.target.value }))}
              placeholder="Cover alt text"
            />
            <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "cover" })}>
              Select Image
            </button>
          </div>
        </Field>

        <Field>
          <Label>Gallery Images</Label>
          <div className="space-y-2">
            {galleryImages.map((image, idx) => (
              <div key={idx} className="grid grid-cols-[1.6fr_1fr_auto_auto] gap-2">
                <input
                  className={inputCls}
                  value={image.src}
                  onChange={(e) => updateGalleryImage(idx, { src: e.target.value })}
                  placeholder="/cdn/.../image-1.png"
                />
                <input
                  className={inputCls}
                  value={image.alt ?? ""}
                  onChange={(e) => updateGalleryImage(idx, { alt: e.target.value })}
                  placeholder="Alt text"
                />
                <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "gallery", index: idx })}>
                  Select Image
                </button>
                <button
                  type="button"
                  onClick={() => removeGalleryImage(idx)}
                  className="text-[#ef4242]/60 hover:text-[#ef4242] text-sm px-1"
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addGalleryImage} className={btnOutline}>+ Add Image</button>
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field>
            <Label>Pricing Status</Label>
            <select className={inputCls} value={pricingStatus} onChange={(e) => setPricingStatus(e.target.value as ProjectStatus)}>
              <option value="free">Free</option>
              <option value="for_sale">For Sale</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </Field>
          {pricingStatus === "for_sale" && (
            <Field>
              <Label>Price (USD)</Label>
              <input className={inputCls} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9.99" />
            </Field>
          )}
          {pricingStatus === "free" && (
            <div className="col-span-2">
              <Field>
                <Label>Download URL</Label>
                <input className={inputCls} value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://…" />
              </Field>
            </div>
          )}
        </div>

        <Field>
          <Label>Live URL (optional)</Label>
          <input
            className={inputCls}
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            placeholder="https://… (site or demo)"
          />
        </Field>

        <Field>
          <Label>Read More URL (optional)</Label>
          <input
            className={inputCls}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://… (press article or case study)"
          />
        </Field>

        <Field>
          <Label>Publish Date</Label>
          <input className={inputCls} type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
        </Field>

        <Field>
          <Label>Client IDs</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {clients.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setClientIds((prev) =>
                    prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                  )
                }
                className={`px-2.5 py-1 rounded-sm text-xs border transition-colors ${
                  clientIds.includes(c.id)
                    ? "bg-[#ef4242]/15 border-[#ef4242]/50 text-[#ef4242]"
                    : "border-white/10 text-white/40 hover:text-white hover:border-white/25"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {clientIds.length > 0 && (
            <p className="text-[11px] text-white/30">Selected: {clientIds.join(", ")}</p>
          )}
        </Field>

        {/* Videos */}
        <div className="border-t border-white/8 pt-4 space-y-3">
          <Label>Videos</Label>
          <div className="space-y-2">
            {videos.map((v, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_2fr_auto] gap-2 items-center">
                <input
                  className={inputCls}
                  placeholder="YouTube ID (dQw4w9WgXcQ)"
                  value={v.youtubeId}
                  onChange={(e) => {
                    const next = [...videos];
                    next[idx] = { ...next[idx], youtubeId: e.target.value };
                    setVideos(next);
                  }}
                />
                <input
                  className={inputCls}
                  placeholder="Video title"
                  value={v.title}
                  onChange={(e) => {
                    const next = [...videos];
                    next[idx] = { ...next[idx], title: e.target.value };
                    setVideos(next);
                  }}
                />
                <button
                  type="button"
                  className={btnOutlineRed}
                  onClick={() => setVideos((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Del
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={btnOutline}
            onClick={() => setVideos((prev) => [...prev, { youtubeId: "", title: "" }])}
          >
            + Add Video
          </button>
        </div>

        {/* Credits */}
        <div className="border-t border-white/8 pt-4 space-y-3">
          <Label>Credits</Label>
          <div className="space-y-2">
            {credits.map((c, idx) => (
              <div key={idx} className="grid grid-cols-[1.2fr_1.8fr_auto] gap-2 items-center">
                <input
                  className={inputCls}
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => {
                    const next = [...credits];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setCredits(next);
                  }}
                />
                <input
                  className={inputCls}
                  placeholder="Role (Builder, Designer, etc.)"
                  value={c.role}
                  onChange={(e) => {
                    const next = [...credits];
                    next[idx] = { ...next[idx], role: e.target.value };
                    setCredits(next);
                  }}
                />
                <button
                  type="button"
                  className={btnOutlineRed}
                  onClick={() => setCredits((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Del
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={btnOutline}
            onClick={() => setCredits((prev) => [...prev, { name: "", role: "" }])}
          >
            + Add Credit
          </button>
        </div>

        <div className="border-t border-white/8 pt-4">
          <p className={labelCls}>Sections ({sections.length})</p>
          <div className="space-y-3 mb-3">
            {sections.map((sec, idx) => (
              <div key={idx} className="border border-white/8 rounded-sm p-3 bg-white/2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-widest uppercase text-white/40">{sec.type}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveSection(idx, -1)} className="text-white/30 hover:text-white text-xs px-1.5">↑</button>
                    <button type="button" onClick={() => moveSection(idx, 1)} className="text-white/30 hover:text-white text-xs px-1.5">↓</button>
                    <button type="button" onClick={() => removeSection(idx)} className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs px-1.5">x</button>
                  </div>
                </div>
                {(sec.type === "text" || sec.type === "quote") && (
                  <textarea
                    className={textareaCls}
                    rows={3}
                    value={sec.content ?? ""}
                    onChange={(e) => updateSection(idx, { content: e.target.value })}
                    placeholder={sec.type === "quote" ? "Quote text..." : "Markdown content..."}
                  />
                )}
                {sec.type === "image" && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input className={inputCls} value={sec.src ?? ""} onChange={(e) => updateSection(idx, { src: e.target.value })} placeholder="Image URL" />
                      <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-image", sectionIndex: idx })}>
                        Select Image
                      </button>
                    </div>
                    <input className={inputCls} value={sec.alt ?? ""} onChange={(e) => updateSection(idx, { alt: e.target.value })} placeholder="Alt text" />
                    <input className={inputCls} value={sec.caption ?? ""} onChange={(e) => updateSection(idx, { caption: e.target.value })} placeholder="Caption (optional)" />
                  </div>
                )}
                {sec.type === "video" && (
                  <input className={inputCls} value={sec.youtubeId ?? ""} onChange={(e) => updateSection(idx, { youtubeId: e.target.value })} placeholder="YouTube video ID" />
                )}
                {sec.type === "code" && (
                  <div className="space-y-1.5">
                    <input className={inputCls} value={sec.language ?? ""} onChange={(e) => updateSection(idx, { language: e.target.value })} placeholder="Language (e.g. javascript)" />
                    <textarea className={textareaCls} rows={4} value={sec.content ?? ""} onChange={(e) => updateSection(idx, { content: e.target.value })} placeholder="Code..." />
                  </div>
                )}
                {sec.type === "gallery" && (
                  <div className="space-y-2">
                    {(sec.images ?? [""]).map((image, imageIdx) => (
                      <div key={imageIdx} className="grid grid-cols-[1.6fr_1fr_auto_auto] gap-2">
                        <input
                          className={inputCls}
                          value={toEditableImageAsset(image).src}
                          onChange={(e) => updateSectionGalleryImage(idx, imageIdx, { src: e.target.value })}
                          placeholder="Gallery image URL"
                        />
                        <input
                          className={inputCls}
                          value={toEditableImageAsset(image).alt ?? ""}
                          onChange={(e) => updateSectionGalleryImage(idx, imageIdx, { alt: e.target.value })}
                          placeholder="Alt text"
                        />
                        <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-gallery", sectionIndex: idx, imageIndex: imageIdx })}>
                          Select Image
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSectionGalleryImage(idx, imageIdx)}
                          className="text-[#ef4242]/60 hover:text-[#ef4242] text-sm px-1"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addSectionGalleryImage(idx)} className={btnOutline}>+ Add Image</button>
                  </div>
                )}
                {sec.type === "divider" && (
                  <p className="text-[11px] text-white/25 italic">Simple horizontal divider</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["text", "image", "gallery", "video", "quote", "code", "divider"] as ArticleSection["type"][]).map((t) => (
              <button key={t} type="button" onClick={() => addSection(t)} className={btnOutline}>+ {t}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="proj-featured"
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="accent-[#ef4242]"
          />
          <label htmlFor="proj-featured" className="text-xs text-white/60 select-none">Featured project</label>
        </div>

        {errors.length > 0 && (
          <p className="text-[11px] text-[#ef4242]">Please fill in required fields: {errors.join(", ")}</p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnRed} onClick={handleSave}>Save Project</button>
      </div>
    </Modal>
    {imagePickerTarget && (
      <R2ImagePickerModal
        title="Select Project Image"
        onClose={() => setImagePickerTarget(null)}
        onSelect={applySelectedImage}
      />
    )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ARTICLE MODAL
═══════════════════════════════════════════════════════════ */
function ArticleModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Article;
  onClose: () => void;
  onSave: (a: Article) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "MDCran");
  const [publishDate, setPublishDate] = useState(initial?.publishDate ?? "");
  const [category, setCategory] = useState<ArticleCategory>(initial?.category ?? "tech");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [coverImage, setCoverImage] = useState<ImageAsset>(() => toEditableImageAsset(initial?.coverImage));
  const [sections, setSections] = useState<ArticleSection[]>(
    () => (initial?.sections ?? []).map((section) => normalizeSectionForEditor(section))
  );
  const [errors, setErrors] = useState<string[]>([]);

  function validate() {
    const e: string[] = [];
    if (!title.trim()) e.push("title");
    if (!excerpt.trim()) e.push("excerpt");
    setErrors(e);
    return e.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const finalSlug = slug.trim() || slugify(title);
    const cleanedSections = sections
      .map((section) => normalizeSectionForSave(section))
      .filter((section) => section.type !== "gallery" || (section.images?.length ?? 0) > 0);
    const article: Article = {
      id: initial?.id ?? uid(),
      slug: finalSlug,
      title: title.trim(),
      excerpt: excerpt.trim(),
      coverImage: cleanImageAsset(coverImage) ?? undefined,
      author: author.trim() || "MDCran",
      publishDate: publishDate || new Date().toISOString().slice(0, 10),
      updatedDate: initial?.updatedDate,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      category,
      sections: cleanedSections,
      featured,
    };
    onSave(article);
  }

  function addSection(type: ArticleSection["type"]) {
    const defaults: Record<ArticleSection["type"], ArticleSection> = {
      text: { type: "text", content: "" },
      image: { type: "image", src: "", alt: "", caption: "" },
      gallery: { type: "gallery", images: [{ src: "", alt: "" }] },
      video: { type: "video", youtubeId: "" },
      quote: { type: "quote", content: "" },
      code: { type: "code", content: "", language: "javascript" },
      divider: { type: "divider" },
      checklist: { type: "checklist", items: [], caption: "" },
      "ingredient-list": { type: "ingredient-list", items: [], caption: "" },
      steps: { type: "steps", items: [], caption: "" },
      "store-checklist": { type: "store-checklist", items: [], caption: "" },
      "info-block": { type: "info-block", content: "", caption: "" },
    };
    setSections((prev) => [...prev, { ...defaults[type] }]);
  }

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateSection(idx: number, partial: Partial<ArticleSection>) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  }

  function updateSectionGalleryImage(sectionIdx: number, imageIdx: number, partial: Partial<ImageAsset>) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    const nextImages = (section.images ?? [{ src: "", alt: "" }]).map((image, i) =>
      i === imageIdx ? { ...toEditableImageAsset(image), ...partial } : toEditableImageAsset(image)
    );
    updateSection(sectionIdx, { images: nextImages });
  }

  function addSectionGalleryImage(sectionIdx: number) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    updateSection(sectionIdx, { images: [...(section.images ?? []), { src: "", alt: "" }] });
  }

  function removeSectionGalleryImage(sectionIdx: number, imageIdx: number) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    const nextImages = (section.images ?? []).filter((_, i) => i !== imageIdx);
    updateSection(sectionIdx, { images: nextImages.length ? nextImages : [{ src: "", alt: "" }] });
  }

  const isErr = (f: string) => errors.includes(f);

  return (
    <>
    <Modal title={initial ? "Edit Article" : "New Article"} onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label required>Title</Label>
            <input className={`${inputCls} ${isErr("title") ? "border-[#ef4242]" : ""}`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" />
          </Field>
          <Field>
            <Label>Slug</Label>
            <input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" />
          </Field>
        </div>

        <Field>
          <Label required>Excerpt</Label>
          <textarea
            className={`${textareaCls} ${isErr("excerpt") ? "border-[#ef4242]" : ""}`}
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short description shown in article listings…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Author</Label>
            <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="MDCran" />
          </Field>
          <Field>
            <Label>Publish Date</Label>
            <input className={inputCls} type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Category</Label>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ArticleCategory)}>
              <option value="press">Press</option>
              <option value="recipe">Recipe</option>
              <option value="tech">Tech</option>
              <option value="personal">Personal</option>
              <option value="tutorial">Tutorial</option>
              <option value="announcement">Announcement</option>
            </select>
          </Field>
          <Field>
            <Label>Tags</Label>
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2, tag3" />
          </Field>
        </div>

        <Field>
          <Label>Cover Image URL</Label>
          <div className="grid grid-cols-[1.6fr_1fr_auto] gap-2">
            <input
              className={inputCls}
              value={coverImage.src}
              onChange={(e) => setCoverImage((prev) => ({ ...prev, src: e.target.value }))}
              placeholder="/cdn/…/cover.jpg"
            />
            <input
              className={inputCls}
              value={coverImage.alt ?? ""}
              onChange={(e) => setCoverImage((prev) => ({ ...prev, alt: e.target.value }))}
              placeholder="Cover alt text"
            />
            <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "cover" })}>
              Select Image
            </button>
          </div>
        </Field>

        <div className="flex items-center gap-2">
          <input id="art-featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#ef4242]" />
          <label htmlFor="art-featured" className="text-xs text-white/60 select-none">Featured article</label>
        </div>

        {/* Sections */}
        <div className="border-t border-white/8 pt-4">
          <p className={labelCls}>Sections ({sections.length})</p>
          <div className="space-y-3 mb-3">
            {sections.map((sec, idx) => (
              <div key={idx} className="border border-white/8 rounded-sm p-3 bg-white/2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-widest uppercase text-white/40">{sec.type}</span>
                  <div className="flex gap-1">
                    <button onClick={() => moveSection(idx, -1)} className="text-white/30 hover:text-white text-xs px-1.5">↑</button>
                    <button onClick={() => moveSection(idx, 1)} className="text-white/30 hover:text-white text-xs px-1.5">↓</button>
                    <button onClick={() => removeSection(idx)} className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs px-1.5">✕</button>
                  </div>
                </div>
                {(sec.type === "text" || sec.type === "quote") && (
                  <textarea
                    className={textareaCls}
                    rows={3}
                    value={sec.content ?? ""}
                    onChange={(e) => updateSection(idx, { content: e.target.value })}
                    placeholder={sec.type === "quote" ? "Quote text…" : "Markdown content…"}
                  />
                )}
                {sec.type === "image" && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input className={inputCls} value={sec.src ?? ""} onChange={(e) => updateSection(idx, { src: e.target.value })} placeholder="Image URL" />
                      <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-image", sectionIndex: idx })}>
                        Select Image
                      </button>
                    </div>
                    <input className={inputCls} value={sec.alt ?? ""} onChange={(e) => updateSection(idx, { alt: e.target.value })} placeholder="Alt text" />
                    <input className={inputCls} value={sec.caption ?? ""} onChange={(e) => updateSection(idx, { caption: e.target.value })} placeholder="Caption (optional)" />
                  </div>
                )}
                {sec.type === "video" && (
                  <input className={inputCls} value={sec.youtubeId ?? ""} onChange={(e) => updateSection(idx, { youtubeId: e.target.value })} placeholder="YouTube video ID (e.g. dQw4w9WgXcQ)" />
                )}
                {sec.type === "code" && (
                  <div className="space-y-1.5">
                    <input className={inputCls} value={sec.language ?? ""} onChange={(e) => updateSection(idx, { language: e.target.value })} placeholder="Language (e.g. javascript)" />
                    <textarea className={textareaCls} rows={4} value={sec.content ?? ""} onChange={(e) => updateSection(idx, { content: e.target.value })} placeholder="Code…" />
                  </div>
                )}
                {sec.type === "gallery" && (
                  <div className="space-y-2">
                    {(sec.images ?? [{ src: "", alt: "" }]).map((image, imageIdx) => (
                      <div key={imageIdx} className="grid grid-cols-[1.6fr_1fr_auto_auto] gap-2">
                        <input
                          className={inputCls}
                          value={toEditableImageAsset(image).src}
                          onChange={(e) => updateSectionGalleryImage(idx, imageIdx, { src: e.target.value })}
                          placeholder="Gallery image URL"
                        />
                        <input
                          className={inputCls}
                          value={toEditableImageAsset(image).alt ?? ""}
                          onChange={(e) => updateSectionGalleryImage(idx, imageIdx, { alt: e.target.value })}
                          placeholder="Alt text"
                        />
                        <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-gallery", sectionIndex: idx, imageIndex: imageIdx })}>
                          Select Image
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSectionGalleryImage(idx, imageIdx)}
                          className="text-[#ef4242]/60 hover:text-[#ef4242] text-sm px-1"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addSectionGalleryImage(idx)} className={btnOutline}>+ Add Image</button>
                  </div>
                )}
                {(sec.type === "checklist" ||
                  sec.type === "ingredient-list" ||
                  sec.type === "steps" ||
                  sec.type === "store-checklist") && (
                  <div className="space-y-1.5">
                    <input
                      className={inputCls}
                      value={sec.caption ?? ""}
                      onChange={(e) => updateSection(idx, { caption: e.target.value })}
                      placeholder="Section title (optional)"
                    />
                    <textarea
                      className={textareaCls}
                      rows={4}
                      value={(sec.items ?? []).join("\n")}
                      onChange={(e) =>
                        updateSection(idx, {
                          items: e.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="One item per line"
                    />
                  </div>
                )}
                {sec.type === "info-block" && (
                  <div className="space-y-1.5">
                    <input
                      className={inputCls}
                      value={sec.caption ?? ""}
                      onChange={(e) => updateSection(idx, { caption: e.target.value })}
                      placeholder="Caption (optional)"
                    />
                    <input
                      className={inputCls}
                      value={sec.label ?? ""}
                      onChange={(e) => updateSection(idx, { label: e.target.value })}
                      placeholder="Label (e.g. Prep Time)"
                    />
                    <input
                      className={inputCls}
                      value={sec.value ?? ""}
                      onChange={(e) => updateSection(idx, { value: e.target.value })}
                      placeholder="Value (e.g. 20 minutes)"
                    />
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={sec.content ?? ""}
                      onChange={(e) => updateSection(idx, { content: e.target.value })}
                      placeholder="Fallback text (optional)"
                    />
                  </div>
                )}
                {sec.type === "divider" && (
                  <p className="text-[11px] text-white/25 italic">— horizontal divider —</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["text", "image", "gallery", "video", "quote", "code", "divider", "checklist", "ingredient-list", "steps", "store-checklist", "info-block"] as ArticleSection["type"][]).map((t) => (
              <button key={t} onClick={() => addSection(t)} className={btnOutline}>+ {t}</button>
            ))}
          </div>
        </div>

        {errors.length > 0 && (
          <p className="text-[11px] text-[#ef4242]">Please fill in: {errors.join(", ")}</p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnRed} onClick={handleSave}>Save Article</button>
      </div>
    </Modal>
    {imagePickerTarget && (
      <R2ImagePickerModal
        title="Select Article Image"
        onClose={() => setImagePickerTarget(null)}
        onSelect={applySelectedImage}
      />
    )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLIENT MODAL
═══════════════════════════════════════════════════════════ */
function ClientModal({
  initial,
  projects: allProjects,
  onClose,
  onSave,
}: {
  initial?: Client;
  projects: Project[];
  onClose: () => void;
  onSave: (c: Client, linkedProjectIds: string[]) => void;
}) {
  const [id, setId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatarUrl ?? "");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [roles, setRoles] = useState((initial?.roles ?? []).join(", "));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initial?.socialLinks ?? []);
  const [quoteText, setQuoteText] = useState(initial?.quote?.text ?? "");
  const [quoteContext, setQuoteContext] = useState(initial?.quote?.context ?? "");
  // Derive initial linked project ids from projects that already reference this client
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>(
    initial?.id
      ? allProjects.filter((p) => p.clientIds?.includes(initial.id)).map((p) => p.id)
      : []
  );
  const [errors, setErrors] = useState<string[]>([]);

  function validate() {
    const e: string[] = [];
    if (!name.trim()) e.push("name");
    if (!id.trim()) e.push("id");
    setErrors(e);
    return e.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const client: Client = {
      id: id.trim() || slugify(name),
      name: name.trim(),
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      roles: roles.split(",").map((r) => r.trim()).filter(Boolean),
      featured,
      followerCount: initial?.followerCount,
      viewCount: initial?.viewCount,
      socialLinks: socialLinks.filter((s) => s.url.trim()),
      quote: quoteText.trim() ? { text: quoteText.trim(), context: quoteContext.trim() || undefined } : undefined,
      bannerUrl: initial?.bannerUrl,
    };
    onSave(client, linkedProjectIds);
  }

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, { platform: "youtube", url: "" }]);
  }

  function removeSocialLink(idx: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSocialLink(idx: number, partial: Partial<SocialLink>) {
    setSocialLinks((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  }

  const isErr = (f: string) => errors.includes(f);

  const platforms: Platform[] = ["youtube", "twitch", "tiktok", "instagram", "facebook", "x", "github", "website", "spotify", "discord", "other"];

  return (
    <>
    <Modal title={initial ? "Edit Client" : "New Client"} onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label required>Name</Label>
            <input className={`${inputCls} ${isErr("name") ? "border-[#ef4242]" : ""}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" />
          </Field>
          <Field>
            <Label required>ID (slug)</Label>
            <input
              className={`${inputCls} ${isErr("id") ? "border-[#ef4242]" : ""}`}
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="popularmmos"
            />
          </Field>
        </div>

        <Field>
          <Label>Bio</Label>
          <textarea className={textareaCls} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Client biography…" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Location</Label>
            <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="United States" />
          </Field>
          <Field>
            <Label>Avatar URL</Label>
            <div className="grid grid-cols-[1.6fr_auto] gap-2">
              <input className={inputCls} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="/cdn/…/avatar.jpg" />
              <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerOpen(true)}>
                Select Image
              </button>
            </div>
          </Field>
        </div>

        <Field>
          <Label>Roles</Label>
          <input className={inputCls} value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="YouTuber, Content Creator (comma-separated)" />
        </Field>

        <div className="flex items-center gap-2">
          <input id="cli-featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#ef4242]" />
          <label htmlFor="cli-featured" className="text-xs text-white/60 select-none">Featured client</label>
        </div>
        <p className="text-[11px] text-white/25">
          Followers update from linked social platforms. Video views are derived from videos attached to the client&apos;s linked projects.
        </p>

        {/* Social Links */}
        <div className="border-t border-white/8 pt-4">
          <p className={labelCls}>Social Links ({socialLinks.length})</p>
          <div className="space-y-2 mb-3">
            {socialLinks.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  className={`${inputCls} w-32 flex-shrink-0`}
                  value={link.platform}
                  onChange={(e) => updateSocialLink(idx, { platform: e.target.value as Platform })}
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input
                  className={`${inputCls} flex-1`}
                  value={link.url}
                  onChange={(e) => updateSocialLink(idx, { url: e.target.value })}
                  placeholder="URL"
                />
                <input
                  className={`${inputCls} w-32 flex-shrink-0`}
                  value={link.platform === "other" ? link.title ?? "" : link.handle ?? ""}
                  onChange={(e) =>
                    updateSocialLink(
                      idx,
                      link.platform === "other"
                        ? { title: e.target.value }
                        : { handle: e.target.value }
                    )
                  }
                  placeholder={link.platform === "other" ? "Link title" : "@handle"}
                />
                <button onClick={() => removeSocialLink(idx)} className="text-[#ef4242]/60 hover:text-[#ef4242] text-sm px-1 flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addSocialLink} className={btnOutline}>+ Add Social Link</button>
        </div>

        {/* Quote / Testimonial */}
        <div className="border-t border-white/8 pt-4">
          <p className={labelCls}>Quote / Testimonial</p>
          <div className="space-y-2">
            <Field>
              <Label>Quote Text</Label>
              <textarea
                className={textareaCls}
                rows={2}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="&ldquo;MDCran delivered exactly what we needed…&rdquo;"
              />
            </Field>
            <Field>
              <Label>Context</Label>
              <input
                className={inputCls}
                value={quoteContext}
                onChange={(e) => setQuoteContext(e.target.value)}
                placeholder="On the Monopoly Map project"
              />
            </Field>
          </div>
        </div>

        {/* Linked Projects */}
        <div className="border-t border-white/8 pt-4">
          <p className={labelCls}>Linked Projects ({linkedProjectIds.length} selected)</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
            {allProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setLinkedProjectIds((prev) =>
                    prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                  )
                }
                className={`px-2.5 py-1 rounded-sm text-xs border transition-colors ${
                  linkedProjectIds.includes(p.id)
                    ? "bg-[#ef4242]/15 border-[#ef4242]/50 text-[#ef4242]"
                    : "border-white/10 text-white/40 hover:text-white hover:border-white/25"
                }`}
              >
                {p.title}
              </button>
            ))}
            {allProjects.length === 0 && (
              <p className="text-[11px] text-white/25">No projects yet.</p>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <p className="text-[11px] text-[#ef4242]">Please fill in: {errors.join(", ")}</p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnRed} onClick={handleSave}>Save Client</button>
      </div>
    </Modal>
    {imagePickerOpen && (
      <R2ImagePickerModal
        title="Select Client Image"
        onClose={() => setImagePickerOpen(false)}
        onSelect={(url) => {
          setAvatarUrl(url);
          setImagePickerOpen(false);
        }}
      />
    )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN MODAL
═══════════════════════════════════════════════════════════ */
function CampaignModal({
  initial,
  contacts,
  onClose,
  onSave,
}: {
  initial?: Campaign;
  contacts: Contact[];
  onClose: () => void;
  onSave: (campaign: Campaign, action: "draft" | "schedule" | "send") => Promise<void>;
}) {
  const [type, setType] = useState<CampaignType>(initial?.type ?? "email");
  const [recipientMode, setRecipientMode] = useState<"all" | "specific">(initial?.recipientMode ?? "all");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(initial?.contactIds ?? []);
  const [contactSearch, setContactSearch] = useState("");
  const [bodySource, setBodySource] = useState<"text" | "html">(initial?.bodySource ?? "text");
  const [htmlBody, setHtmlBody] = useState(initial?.htmlBody ?? "");
  const [htmlFileName, setHtmlFileName] = useState(initial?.htmlFileName ?? "");
  const [scheduledFor, setScheduledFor] = useState(
    initial?.scheduledFor ? toLocalDateTimeInputValue(initial.scheduledFor) : ""
  );
  const [savingAction, setSavingAction] = useState<"draft" | "schedule" | "send" | null>(null);
  const [error, setError] = useState("");

  const eligibleContacts = contacts.filter((contact) =>
    type === "email" ? Boolean(contact.email) : Boolean(contact.phone)
  );
  const filteredEligibleContacts = eligibleContacts.filter((contact) => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      contact.name.toLowerCase().includes(q) ||
      (contact.email ?? "").toLowerCase().includes(q) ||
      (contact.phone ?? "").toLowerCase().includes(q)
    );
  });

  const recipients =
    recipientMode === "all"
      ? eligibleContacts.length
      : selectedContactIds.filter((id) => eligibleContacts.some((contact) => contact.id === id)).length;

  function toggleContact(id: string) {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    );
  }

  async function handleSave(action: "draft" | "schedule" | "send") {
    const resolvedBodySource = type === "email" ? bodySource : "text";

    if (type === "email" && !subject.trim()) {
      setError("Email campaigns need a subject.");
      return;
    }
    if (resolvedBodySource === "text" && !message.trim()) {
      setError("Message body is required.");
      return;
    }
    if (type === "email" && resolvedBodySource === "html" && !htmlBody.trim()) {
      setError("Upload an HTML file for the email body.");
      return;
    }
    if (recipientMode === "specific" && recipients === 0) {
      setError("Pick at least one recipient.");
      return;
    }
    if (action === "schedule" && !scheduledFor) {
      setError("Choose a date and time to schedule this.");
      return;
    }

    const scheduledDate =
      action === "schedule" ? new Date(scheduledFor) : null;
    if (action === "schedule" && (!scheduledDate || Number.isNaN(scheduledDate.getTime()))) {
      setError("Choose a valid date and time to schedule this.");
      return;
    }

    setError("");
    setSavingAction(action);

    try {
      const now = new Date().toISOString();
      await onSave(
        {
          id: initial?.id ?? uid(),
          type,
          subject: type === "email" ? subject.trim() : undefined,
          message: resolvedBodySource === "text" ? message.trim() : stripHtmlPreview(htmlBody),
          status:
            action === "send"
              ? "sent"
              : action === "schedule"
                ? "scheduled"
                : "draft",
          recipients,
          recipientMode,
          contactIds:
            recipientMode === "specific"
              ? selectedContactIds
              : eligibleContacts.map((contact) => contact.id),
          bodySource: resolvedBodySource,
          htmlBody: type === "email" && resolvedBodySource === "html" ? htmlBody : undefined,
          htmlFileName: type === "email" && resolvedBodySource === "html" ? htmlFileName || undefined : undefined,
          scheduledFor: action === "schedule" ? scheduledDate!.toISOString() : undefined,
          createdAt: initial?.createdAt ?? now,
          updatedAt: now,
          sentAt: action === "send" ? now : initial?.sentAt,
          lastError: undefined,
        },
        action
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save campaign.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <Modal title={initial ? "Edit Compose" : "Compose"} onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Type</Label>
            <select
              className={inputCls}
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as CampaignType;
                setType(nextType);
                if (nextType === "sms") {
                  setBodySource("text");
                }
              }}
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </Field>
          {type === "email" && (
            <Field>
              <Label>Body Source</Label>
              <select
                className={inputCls}
                value={bodySource}
                onChange={(e) => setBodySource(e.target.value as "text" | "html")}
              >
                <option value="text">Typed Body</option>
                <option value="html">HTML File</option>
              </select>
            </Field>
          )}
        </div>

        {type === "email" && (
          <Field>
            <Label required>Subject</Label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Campaign subject line" />
          </Field>
        )}

        {type === "email" && (
          <p className="text-[11px] text-white/35">
            Email campaigns send through Resend. Use a typed body for simple emails or upload an HTML file for fully formatted layouts.
          </p>
        )}

        {(type === "sms" || bodySource === "text") && (
          <Field>
            <Label required>Message</Label>
            <textarea
              className={textareaCls}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === "email" ? "Email body" : "Text message body"}
            />
          </Field>
        )}

        {type === "email" && bodySource === "html" && (
          <Field>
            <Label required>HTML Email Template</Label>
            <input
              type="file"
              accept=".html,text/html"
              className="block w-full text-xs text-white/55 file:mr-3 file:h-9 file:px-3 file:border-0 file:rounded-sm file:bg-white/8 file:text-white file:text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                  setHtmlBody("");
                  setHtmlFileName("");
                  return;
                }
                setHtmlBody(await file.text());
                setHtmlFileName(file.name);
              }}
            />
            {htmlFileName && (
              <p className="mt-2 text-[11px] text-white/35">Loaded template: {htmlFileName}</p>
            )}
            {htmlBody && (
              <div className="mt-3 overflow-hidden rounded-sm border border-white/8 bg-white/4">
                <div className="border-b border-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
                  Template Preview
                </div>
                <iframe
                  title="Email template preview"
                  srcDoc={htmlBody}
                  className="h-56 w-full bg-white"
                />
              </div>
            )}
          </Field>
        )}

        <Field>
          <Label>Recipients</Label>
          <select className={inputCls} value={recipientMode} onChange={(e) => setRecipientMode(e.target.value as "all" | "specific")}>
            <option value="all">All eligible contacts</option>
            <option value="specific">Specific contacts</option>
          </select>
          <p className="text-[11px] text-white/35 mt-2">
            {type === "email" ? "Only contacts with an email address can receive this." : "Only contacts with a phone number can receive this."}
          </p>
        </Field>

        {recipientMode === "specific" && (
          <div className="border border-white/8 rounded-sm p-4 space-y-3 max-h-56 overflow-y-auto">
            <input
              className={inputCls}
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder={type === "email" ? "Search name or email" : "Search name or phone"}
            />
            {filteredEligibleContacts.map((contact) => (
              <label key={contact.id} className="flex items-center gap-3 text-xs text-white/70">
                <input
                  type="checkbox"
                  className="accent-[#ef4242]"
                  checked={selectedContactIds.includes(contact.id)}
                  onChange={() => toggleContact(contact.id)}
                />
                <span>{contact.name}</span>
                <span className="text-white/35">{type === "email" ? contact.email : contact.phone}</span>
              </label>
            ))}
            {eligibleContacts.length === 0 && (
              <p className="text-xs text-white/25">No eligible contacts yet.</p>
            )}
            {eligibleContacts.length > 0 && filteredEligibleContacts.length === 0 && (
              <p className="text-xs text-white/25">No contacts match that search.</p>
            )}
          </div>
        )}

        <Field>
          <Label>Schedule</Label>
          <input
            type="datetime-local"
            className={inputCls}
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
          <p className="mt-2 text-[11px] text-white/35">
            Uses your local browser time. Draft and Send ignore this.
          </p>
        </Field>

        <div className="text-xs text-white/40">
          Recipient count: {recipients}
        </div>
        {initial?.lastError && (
          <p className="text-[11px] text-[#ef4242]">Last error: {initial.lastError}</p>
        )}
        {error && (
          <p className="text-[11px] text-[#ef4242]">{error}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white"
          onClick={() => void handleSave("draft")}
          disabled={savingAction !== null}
        >
          {savingAction === "draft" ? "Saving..." : "Draft"}
        </button>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white"
          onClick={() => void handleSave("schedule")}
          disabled={savingAction !== null}
        >
          {savingAction === "schedule" ? "Scheduling..." : "Schedule"}
        </button>
        <button
          className="inline-flex h-10 w-[120px] items-center justify-center rounded-sm bg-[#ef4242] text-xs text-white transition-colors hover:bg-[#d93838]"
          onClick={() => void handleSave("send")}
          disabled={savingAction !== null}
        >
          {savingAction === "send" ? "Sending..." : "Send"}
        </button>
      </div>
    </Modal>
  );
}

function CampaignViewModal({
  campaign,
  contacts,
  onSendBatch,
  onClose,
}: {
  campaign: Campaign;
  contacts: Contact[];
  onSendBatch: (campaign: Campaign, count: number) => Promise<void>;
  onClose: () => void;
}) {
  const [batchCount, setBatchCount] = useState(() =>
    String(Math.min(10, Math.max(campaignRemainingCount(campaign), 1), 100))
  );
  const [sendError, setSendError] = useState("");
  const [sendingBatch, setSendingBatch] = useState(false);
  const deliveredContacts = (campaign.deliveryLog ?? [])
    .map((entry) => ({
      entry,
      contact: contacts.find((contact) => contact.id === entry.contactId),
    }))
    .filter((item) => item.contact);

  async function handleSendBatch() {
    const count = Math.max(1, Math.min(100, Math.floor(Number(batchCount) || 0)));
    if (!count) {
      setSendError("Choose a batch size between 1 and 100.");
      return;
    }

    setSendError("");
    setSendingBatch(true);
    try {
      await onSendBatch(campaign, count);
      onClose();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Failed to send batch.");
    } finally {
      setSendingBatch(false);
    }
  }

  return (
    <Modal title="Message Details" onClose={onClose} wide>
      <div className="space-y-4 p-6 text-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label>Type</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.type.toUpperCase()}
            </div>
          </Field>
          <Field>
            <Label>Status</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.status}
            </div>
          </Field>
        </div>

        {campaign.subject && (
          <Field>
            <Label>Subject</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.subject}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <Label>Created</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {fmtDateTime(campaign.createdAt)}
            </div>
          </Field>
          <Field>
            <Label>Recipients</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.recipients}
            </div>
          </Field>
        </div>

        <Field>
          <Label>Body Type</Label>
          <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
            {campaign.type === "sms"
              ? "SMS Text"
              : campaign.bodySource === "html"
                ? "HTML Template via Resend"
                : "Typed Email Body via Resend"}
          </div>
        </Field>

        {campaign.type === "email" && campaign.recipients > 0 && (
          <Field>
            <Label>Delivery Progress</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaignDeliveredCount(campaign)} sent, {campaignRemainingCount(campaign)} remaining
            </div>
          </Field>
        )}

        {campaign.type === "email" && campaignRemainingCount(campaign) > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr] md:items-end">
            <Field>
              <Label>Send Next</Label>
              <input
                type="number"
                min={1}
                max={Math.min(100, campaignRemainingCount(campaign))}
                className={inputCls}
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
              />
            </Field>
            <button
              className="inline-flex h-10 w-[140px] items-center justify-center rounded-sm border border-white/15 text-xs text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-50"
              onClick={() => void handleSendBatch()}
              disabled={sendingBatch}
            >
              {sendingBatch ? "Sending..." : "Send Batch"}
            </button>
          </div>
        )}

        {campaign.scheduledFor && (
          <Field>
            <Label>Scheduled For</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {fmtDateTime(campaign.scheduledFor)}
            </div>
          </Field>
        )}

        {campaign.sentAt && (
          <Field>
            <Label>Sent At</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {fmtDateTime(campaign.sentAt)}
            </div>
          </Field>
        )}

        {campaign.htmlFileName && (
          <Field>
            <Label>HTML Template</Label>
            <div className="rounded-sm border border-white/8 bg-white/4 px-3 py-2 text-white/75">
              {campaign.htmlFileName}
            </div>
          </Field>
        )}

        {campaign.type === "email" && campaign.bodySource === "html" && campaign.htmlBody && (
          <Field>
            <Label>HTML Preview</Label>
            <div className="overflow-hidden rounded-sm border border-white/8 bg-white/4">
              <iframe
                title="Stored email HTML preview"
                srcDoc={campaign.htmlBody}
                className="h-64 w-full bg-white"
              />
            </div>
          </Field>
        )}

        <Field>
          <Label>{campaign.type === "email" && campaign.bodySource === "html" ? "Text Fallback / Summary" : "Message"}</Label>
          <div className="whitespace-pre-wrap rounded-sm border border-white/8 bg-white/4 px-3 py-3 text-white/70">
            {campaign.message}
          </div>
        </Field>

        {deliveredContacts.length > 0 && (
          <Field>
            <Label>Delivery Log</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-sm border border-white/8 bg-white/4 p-3">
              {deliveredContacts.map(({ entry, contact }) => (
                <div
                  key={`${entry.contactId}-${entry.deliveredAt}`}
                  className="flex flex-col gap-1 border-b border-white/6 pb-2 text-[11px] text-white/65 last:border-0 last:pb-0"
                >
                  <span>{contact?.name || entry.contactId}</span>
                  <span className="text-white/35">
                    {contact?.email || contact?.phone || entry.contactId}
                  </span>
                  <span className="text-white/25">{fmtDateTime(entry.deliveredAt)}</span>
                </div>
              ))}
            </div>
          </Field>
        )}

        {campaign.lastError && (
          <p className="text-[11px] text-[#ef4242]">Last error: {campaign.lastError}</p>
        )}
        {sendError && (
          <p className="text-[11px] text-[#ef4242]">{sendError}</p>
        )}
      </div>
      <div className="flex justify-end border-t border-white/8 px-6 py-4">
        <button className={`${btnGhost} w-[120px]`} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function stripHtmlPreview(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toLocalDateTimeInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");

  /* ── Data state ── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [siteContentImageTarget, setSiteContentImageTarget] = useState<null | "brandLogoUrl" | "faviconUrl">(null);
  const [r2Folders, setR2Folders] = useState<R2BrowserFolder[]>([]);
  const [r2Files, setR2Files] = useState<R2BrowserFile[]>([]);
  const [r2Prefix, setR2Prefix] = useState("");
  const [r2Search, setR2Search] = useState("");
  const [r2Mode, setR2Mode] = useState<"browse" | "search">("browse");
  const [r2Loading, setR2Loading] = useState(false);
  const [r2Uploading, setR2Uploading] = useState(false);
  const [r2Loaded, setR2Loaded] = useState(false);
  const [r2Error, setR2Error] = useState("");
  const [r2CopiedUrl, setR2CopiedUrl] = useState("");
  const [r2PreviewFile, setR2PreviewFile] = useState<R2BrowserFile | null>(null);
  const r2CopyResetRef = useRef<number | null>(null);
  const r2FileInputRef = useRef<HTMLInputElement | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rizzEntries, setRizzEntries] = useState<RizzEntry[]>([]);
  const [tapCounts, setTapCounts] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  const [projectViewsAuditLog, setProjectViewsAuditLog] = useState<string[]>([
    "Press Refresh to scan each linked project video.",
  ]);
  const [projectViewsRefreshing, setProjectViewsRefreshing] = useState(false);
  const [projectViewsAuditSummary, setProjectViewsAuditSummary] = useState<{
    totalProjectViews: number;
    refreshedAt?: string;
  } | null>(null);
  const projectViewsAutoRefreshRef = useRef<() => void>(() => {});
  const [tapEditorType, setTapEditorType] = useState<"project" | "article">("project");
  const [tapEditorTargetId, setTapEditorTargetId] = useState("");
  const [tapEditorCount, setTapEditorCount] = useState("");
  const [tapEditorSaving, setTapEditorSaving] = useState(false);

  /* ── Resume state ── */
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [draggedResumeItem, setDraggedResumeItem] = useState<{
    list: "experiences" | "educations" | "skills" | "certifications" | "awards" | "clubs";
    index: number;
  } | null>(null);

  /* ── Filters ── */
  const [projectSearch, setProjectSearch] = useState("");
  const [projectCategoryFilter, setProjectCategoryFilter] = useState("");
  const [projectSort, setProjectSort] = useState<"newest" | "oldest" | "az" | "za" | "category">("newest");
  const [articleSearch, setArticleSearch] = useState("");
  const [articleSort, setArticleSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [clientSearch, setClientSearch] = useState("");
  const [clientSort, setClientSort] = useState<"az" | "za" | "newest" | "oldest">("az");
  const [resumeSearch, setResumeSearch] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsSort, setContactsSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [rateLimitSearch, setRateLimitSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [messagesSort, setMessagesSort] = useState<"newest" | "oldest" | "az" | "za" | "read" | "unread">("newest");
  const [rizzSearch, setRizzSearch] = useState("");
  const [rizzSort, setRizzSort] = useState<"newest" | "oldest" | "az" | "za">("newest");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSearchFocused, setAdminSearchFocused] = useState(false);

  /* ── Modal state ── */
  const [projectModal, setProjectModal] = useState<{ open: boolean; editing?: Project }>({ open: false });
  const [articleModal, setArticleModal] = useState<{ open: boolean; editing?: Article }>({ open: false });
  const [clientModal, setClientModal] = useState<{ open: boolean; editing?: Client }>({ open: false });
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; editing?: Campaign }>({ open: false });
  const [campaignView, setCampaignView] = useState<Campaign | null>(null);
  const [contactModal, setContactModal] = useState<{ open: boolean; editing?: Contact | null }>({ open: false });

  /* ── Delete confirm ── */
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "project" | "article" | "client" | "contact" | "campaign" | "rizz"; id: string; label: string } | null>(null);

  /* ── API hydration ── */
  useEffect(() => {
    async function loadData() {
      try {
        const cachedAudit = window.localStorage.getItem(PROJECT_VIEWS_AUDIT_CACHE_KEY);
        if (cachedAudit) {
          const parsed = JSON.parse(cachedAudit) as { totalProjectViews?: number; refreshedAt?: string };
          if (typeof parsed.totalProjectViews === "number") {
            setProjectViewsAuditSummary({
              totalProjectViews: parsed.totalProjectViews,
              refreshedAt: parsed.refreshedAt,
            });
          }
        }
      } catch {}

      try {
        const [pRes, aRes, cRes, siteContentRes, contactsRes, rateLimitsRes, campaignsRes, rizzRes, tapsRes] = await Promise.all([
          fetch("/api/admin/projects"),
          fetch("/api/admin/articles"),
          fetch("/api/admin/clients"),
          fetch("/api/admin/site-content"),
          fetch("/api/admin/contacts"),
          fetch("/api/admin/rate-limits"),
          fetch("/api/admin/campaigns"),
          fetch("/api/admin/rizz"),
          fetch("/api/admin/taps"),
        ]);
        if (pRes.ok) setProjects(await pRes.json());
        else setProjects([]);
        if (aRes.ok) setArticles(await aRes.json());
        else setArticles([]);
        if (cRes.ok) setClients(await cRes.json());
        else setClients([]);
        if (siteContentRes.ok) setSiteContent(await siteContentRes.json());
        else setSiteContent(defaultSiteContent);
        if (contactsRes.ok) setContacts(await contactsRes.json());
        else setContacts([]);
        if (rateLimitsRes.ok) setRateLimits(await rateLimitsRes.json());
        else setRateLimits([]);
        if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
        else setCampaigns([]);
        if (rizzRes.ok) setRizzEntries(await rizzRes.json());
        else setRizzEntries([]);
        if (tapsRes.ok) {
          const taps = (await tapsRes.json()) as Array<{ id: string; count?: number }>;
          setTapCounts(
            Object.fromEntries(taps.map((tap) => [tap.id, tap.count ?? 0]))
          );
        } else {
          setTapCounts({});
        }
      } catch {
        setProjects([]);
        setArticles([]);
        setClients([]);
        setSiteContent(defaultSiteContent);
        setContacts([]);
        setRateLimits([]);
        setCampaigns([]);
        setRizzEntries([]);
        setTapCounts({});
      }
      setHydrated(true);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const interval = window.setInterval(() => {
      fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process-due" }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (Array.isArray(data)) {
            setCampaigns(data as Campaign[]);
          }
        })
        .catch(() => {});
    }, 30000);

    return () => window.clearInterval(interval);
  }, [hydrated]);

  const projectViewsLastRefresh = projectViewsAuditSummary?.refreshedAt;

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const lastRefresh = projectViewsLastRefresh ? new Date(projectViewsLastRefresh).getTime() : 0;

    if (!lastRefresh || Date.now() - lastRefresh >= PROJECT_VIEWS_REFRESH_INTERVAL_MS) {
      projectViewsAutoRefreshRef.current();
    }

    const interval = window.setInterval(() => {
      projectViewsAutoRefreshRef.current();
    }, PROJECT_VIEWS_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [hydrated, projectViewsLastRefresh]);

  function getProjectHref(project: Project): string {
    if (project.category === "coding-projects") {
      return `/code/${project.slug}`;
    }

    if (project.category === "arts-and-entertainment") {
      if (project.subcategory === "events") {
        return `/arts-and-entertainment/events/${project.slug}`;
      }
      return `/arts-and-entertainment/minecraft-maps/${project.slug}`;
    }

    if (project.category === "motion-and-graphics") {
      if (project.subcategory === "video-editing") {
        return `/motion-and-graphics/video-editing/${project.slug}`;
      }
      if (project.subcategory === "web-dev-design") {
        return `/motion-and-graphics/web-dev-design/${project.slug}`;
      }
      return `/motion-and-graphics/thumbnail-design/${project.slug}`;
    }

    return `/work`;
  }

  const tapTargets = [
    ...projects.map((project) => ({
      id: project.id,
      label: project.title,
      type: "project" as const,
    })),
    ...articles.map((article) => ({
      id: article.id,
      label: article.title,
      type: "article" as const,
    })),
  ].sort((a, b) => compareStrings(a.label, b.label, "asc"));

  const filteredTapTargets = tapTargets.filter((target) => target.type === tapEditorType);

  useEffect(() => {
    if (filteredTapTargets.length === 0) {
      setTapEditorTargetId("");
      setTapEditorCount("");
      return;
    }

    if (!filteredTapTargets.some((target) => target.id === tapEditorTargetId)) {
      const firstTarget = filteredTapTargets[0];
      setTapEditorTargetId(firstTarget.id);
      setTapEditorCount(String(tapCounts[firstTarget.id] ?? 0));
    }
  }, [filteredTapTargets, tapEditorTargetId, tapCounts]);

  async function saveTapOverride() {
    if (!tapEditorTargetId) return;

    const nextCount = Math.max(0, Number(tapEditorCount.replace(/[^\d]/g, "") || 0));
    setTapEditorSaving(true);

    try {
      const response = await fetch("/api/admin/taps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tapEditorTargetId,
          type: tapEditorType,
          count: nextCount,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      setTapCounts((prev) => ({ ...prev, [tapEditorTargetId]: nextCount }));
      setTapEditorCount(String(nextCount));
      void mutate("/api/admin/analytics");
    } catch (error) {
      console.error(error);
    } finally {
      setTapEditorSaving(false);
    }
  }

  /* ── Resume section lazy-load ── */
  useEffect(() => {
    if (activeSection !== "resume" || resumeLoaded) return;
    fetch("/api/admin/resume")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setExperiences(data.experiences ?? []);
          setEducations(data.educations ?? []);
          setSkills(data.skills ?? []);
          setCertifications(data.certifications ?? []);
          setAwards(data.awards ?? []);
          setClubs(data.clubs ?? []);
        }
        setResumeLoaded(true);
      })
      .catch(() => setResumeLoaded(true));
  }, [activeSection, resumeLoaded]);

  async function persistResume(next?: {
    experiences?: Experience[];
    educations?: Education[];
    skills?: Skill[];
    certifications?: Certification[];
    awards?: Award[];
    clubs?: ClubMembership[];
  }) {
    const payload = {
      experiences: next?.experiences ?? experiences,
      educations: next?.educations ?? educations,
      skills: next?.skills ?? skills,
      certifications: next?.certifications ?? certifications,
      awards: next?.awards ?? awards,
      clubs: next?.clubs ?? clubs,
    };

    setResumeSaving(true);
    try {
      await fetch("/api/admin/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } finally {
      setResumeSaving(false);
    }
  }

  function handleResumeDrop(
    list: "experiences" | "educations" | "skills" | "certifications" | "awards" | "clubs",
    dropIndex: number
  ) {
    if (!draggedResumeItem || draggedResumeItem.list !== list) return;

    const fromIndex = draggedResumeItem.index;
    if (fromIndex === dropIndex) {
      setDraggedResumeItem(null);
      return;
    }

    if (list === "experiences") setExperiences((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "educations") setEducations((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "skills") setSkills((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "certifications") setCertifications((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "awards") setAwards((prev) => arrayMove(prev, fromIndex, dropIndex));
    if (list === "clubs") setClubs((prev) => arrayMove(prev, fromIndex, dropIndex));

    setDraggedResumeItem(null);
  }

  function toggleExperienceClientLink(experienceIndex: number, clientId: string) {
    setExperiences((prev) =>
      prev.map((experience, index) => {
        if (index !== experienceIndex) return experience;

        const currentClientIds = experience.clientIds ?? [];
        const nextClientIds = currentClientIds.includes(clientId)
          ? currentClientIds.filter((id) => id !== clientId)
          : [...currentClientIds, clientId];

        return {
          ...experience,
          clientIds: nextClientIds.length ? nextClientIds : undefined,
        };
      })
    );
  }

  /* ── CRUD handlers ── */
  function saveProject(p: Project) {
    setProjects((prev) => {
      const exists = prev.find((x) => x.id === p.id);
      const updated = exists ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev];
      fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(console.error);
      return updated;
    });
    setProjectModal({ open: false });
  }

  function deleteProject(id: string) {
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(console.error);
      return updated;
    });
  }

  function saveArticle(a: Article) {
    setArticles((prev) => {
      const exists = prev.find((x) => x.id === a.id);
      const nextArticles = exists ? prev.map((x) => (x.id === a.id ? a : x)) : [a, ...prev];
      const updated = a.featured
        ? nextArticles.map((article) =>
            article.id === a.id ? { ...article, featured: true } : { ...article, featured: false }
          )
        : nextArticles;
      fetch("/api/admin/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(console.error);
      return updated;
    });
    setArticleModal({ open: false });
  }

  function deleteArticle(id: string) {
    setArticles((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      fetch("/api/admin/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(console.error);
      return updated;
    });
  }

  function saveClient(c: Client, linkedProjectIds: string[]) {
    setClients((prev) => {
      const exists = prev.find((x) => x.id === c.id);
      const updatedClients = exists ? prev.map((x) => (x.id === c.id ? c : x)) : [c, ...prev];
      fetch("/api/admin/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedClients),
      }).catch(console.error);
      return updatedClients;
    });
    // Sync bidirectional project↔client links
    setProjects((prev) => {
      const updatedProjects = prev.map((p) => {
        const shouldLink = linkedProjectIds.includes(p.id);
        const currentlyLinked = p.clientIds?.includes(c.id) ?? false;
        if (shouldLink && !currentlyLinked) {
          return { ...p, clientIds: [...(p.clientIds ?? []), c.id] };
        }
        if (!shouldLink && currentlyLinked) {
          const updated = p.clientIds!.filter((id) => id !== c.id);
          return { ...p, clientIds: updated.length ? updated : undefined };
        }
        return p;
      });
      fetch("/api/admin/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProjects),
      }).catch(console.error);
      return updatedProjects;
    });
    setClientModal({ open: false });
  }

  function deleteClient(id: string) {
    setClients((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      fetch("/api/admin/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(console.error);
      return updated;
    });
    setExperiences((prev) =>
      prev.map((experience) => {
        if (!experience.clientIds?.includes(id)) return experience;
        const nextClientIds = experience.clientIds.filter((clientId) => clientId !== id);
        return {
          ...experience,
          clientIds: nextClientIds.length ? nextClientIds : undefined,
        };
      })
    );
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin");
  }

  async function runMetricsAudit(target: MetricsAuditTarget) {
    const response = await fetch("/api/admin/metrics-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as MetricsAuditResponse;
  }

  async function refreshProjectViewsAudit(mode: "manual" | "auto" = "manual") {
    setProjectViewsRefreshing(true);
    setProjectViewsAuditLog([
      mode === "auto" ? "Automatic project video scan running..." : "Running project video scan...",
    ]);

    try {
      const report = await runMetricsAudit("project-views");
      const lines = report.lines?.length ? report.lines : ["No output returned."];
      const nextSummary = {
        totalProjectViews: report.totalProjectViews ?? 0,
        refreshedAt: report.refreshedAt,
      };
      setProjectViewsAuditLog(lines);
      setProjectViewsAuditSummary(nextSummary);
      window.localStorage.setItem(PROJECT_VIEWS_AUDIT_CACHE_KEY, JSON.stringify(nextSummary));

      const projectsRes = await fetch("/api/admin/projects");
      if (projectsRes.ok) {
        setProjects(await projectsRes.json());
      }
    } catch {
      setProjectViewsAuditLog(["Refresh failed. Check the linked videos and try again."]);
    } finally {
      setProjectViewsRefreshing(false);
    }
  }

  projectViewsAutoRefreshRef.current = () => {
    void refreshProjectViewsAudit("auto");
  };

  function persistContacts(next: Contact[]) {
    fetch("/api/admin/contacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(console.error);
  }

  async function mutateRateLimitRecord(
    action: "reset" | "clear-pii",
    record: RateLimit
  ) {
    const response = await fetch("/api/admin/rate-limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, record }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    setRateLimits((prev) =>
      prev.map((entry) => {
        if (entry.id !== record.id) return entry;
        if (action === "reset") {
          return {
            ...entry,
            count: 0,
            blockedCount: 0,
            lastBlockedAt: undefined,
            notes: "Reset by admin",
          };
        }
        return {
          ...entry,
          ip: undefined,
          browser: undefined,
          userAgent: undefined,
          city: undefined,
          region: undefined,
          country: undefined,
          notes: "PII cleared by admin",
        };
      })
    );
  }

  async function deleteRateLimit(id: string) {
    const response = await fetch("/api/admin/rate-limits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    setRateLimits((prev) => prev.filter((entry) => entry.id !== id));
  }

  function deleteContact(id: string) {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistContacts(next);
      return next;
    });
  }

  function saveContact(contact: Contact) {
    setContacts((prev) => {
      const exists = prev.some((entry) => entry.id === contact.id);
      const next = exists
        ? prev.map((entry) => (entry.id === contact.id ? contact : entry))
        : [contact, ...prev];
      persistContacts(next);
      return next;
    });
    setContactModal({ open: false });
  }

  async function saveSiteContentEditor() {
    const response = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(siteContent),
    });

    if (!response.ok) {
      throw new Error("Failed to save site content.");
    }
  }

  const loadR2Assets = useCallback(async (next?: { prefix?: string; search?: string }) => {
    const prefix = next?.prefix ?? r2Prefix;
    const search = next?.search ?? r2Search;
    const params = new URLSearchParams();

    if (prefix) {
      params.set("prefix", prefix);
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }

    setR2Loading(true);
    setR2Error("");

    try {
      const response = await fetch(`/api/admin/r2${params.toString() ? `?${params.toString()}` : ""}`);
      const data = (await response.json()) as R2BrowserResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Failed to load R2 assets.");
      }

      const payload = data as R2BrowserResponse;
      setR2Prefix(payload.prefix);
      setR2Folders(payload.folders);
      setR2Files(payload.files);
      setR2Mode(payload.mode);
      setR2Loaded(true);
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to load R2 assets.");
      setR2Folders([]);
      setR2Files([]);
    } finally {
      setR2Loading(false);
    }
  }, [r2Prefix, r2Search]);

  useEffect(() => {
    if (activeSection !== "r2-assets" || r2Loaded) {
      return;
    }

    void loadR2Assets();
  }, [activeSection, r2Loaded, loadR2Assets]);

  useEffect(() => {
    if (activeSection !== "r2-assets" || !r2Loaded) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadR2Assets();
    }, r2Search.trim() ? 180 : 0);

    return () => window.clearTimeout(timeout);
  }, [activeSection, r2Loaded, r2Prefix, r2Search, loadR2Assets]);

  async function uploadR2Files(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setR2Uploading(true);
    setR2Error("");

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("prefix", r2Prefix);

        const response = await fetch("/api/admin/r2", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || `Upload failed for ${file.name}.`);
        }
      }

      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to upload file.");
    } finally {
      setR2Uploading(false);
      if (r2FileInputRef.current) {
        r2FileInputRef.current.value = "";
      }
    }
  }

  async function deleteR2File(key: string) {
    if (!window.confirm(`Delete ${key}? This cannot be undone.`)) {
      return;
    }

    setR2Error("");

    try {
      const response = await fetch("/api/admin/r2", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete file.");
      }

      await loadR2Assets();
    } catch (error) {
      setR2Error(error instanceof Error ? error.message : "Failed to delete file.");
    }
  }

  async function copyR2Link(url: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setR2Error("");
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (!copied) {
          throw new Error("Copy command failed.");
        }
      }

      setR2Error("");
      setR2CopiedUrl(url);
      if (r2CopyResetRef.current) {
        window.clearTimeout(r2CopyResetRef.current);
      }
      r2CopyResetRef.current = window.setTimeout(() => {
        setR2CopiedUrl("");
        r2CopyResetRef.current = null;
      }, 1600);
    } catch {
      setR2Error("Failed to copy link.");
    }
  }

  function toggleContactSubscription(id: string) {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, subscribed: !c.subscribed } : c));
      persistContacts(next);
      return next;
    });
  }

  function setMessageReadState(ids: string[], read: boolean) {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setContacts((prev) => {
      const next = prev.map((contact) =>
        ids.includes(contact.id)
          ? {
              ...contact,
              messageRead: read,
              messageReadAt: read ? now : undefined,
            }
          : contact
      );
      persistContacts(next);
      return next;
    });
  }

  function deleteCampaign(id: string) {
    setCampaigns((prev) => {
      const next = prev.filter((c) => c.id !== id);
      fetch("/api/admin/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(console.error);
      return next;
    });
  }

  async function saveCampaign(campaign: Campaign, action: "draft" | "schedule" | "send", batchSize?: number) {
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign, action, batchSize }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof payload?.error === "string" ? payload.error : `Request failed with ${response.status}`
      );
    }

    const savedCampaign = payload.campaign as Campaign;
    setCampaigns((prev) => {
      const exists = prev.some((entry) => entry.id === savedCampaign.id);
      const next = exists
        ? prev.map((entry) => (entry.id === savedCampaign.id ? savedCampaign : entry))
        : [savedCampaign, ...prev];
      return next.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    setCampaignModal({ open: false });
  }

  function deleteRizzSubmission(id: string) {
    setRizzEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      fetch("/api/admin/rizz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(console.error);
      return next;
    });
  }

  function confirmDelete() {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "project") deleteProject(deleteConfirm.id);
    if (deleteConfirm.type === "article") deleteArticle(deleteConfirm.id);
    if (deleteConfirm.type === "client") deleteClient(deleteConfirm.id);
    if (deleteConfirm.type === "contact") deleteContact(deleteConfirm.id);
    if (deleteConfirm.type === "campaign") deleteCampaign(deleteConfirm.id);
    if (deleteConfirm.type === "rizz") deleteRizzSubmission(deleteConfirm.id);
    setDeleteConfirm(null);
  }

  /* ── Export JSON ── */
  function exportData() {
    const data = { projects, articles, clients, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mdcran-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Reset to defaults ── */
  async function resetToDefaults() {
    return;
  }

  /* ── Filtered lists ── */
  const filteredProjects = projects.filter((p) => {
    const matchSearch = !projectSearch || p.title.toLowerCase().includes(projectSearch.toLowerCase());
    const matchCat = !projectCategoryFilter || p.category === projectCategoryFilter;
    return matchSearch && matchCat;
  }).sort((a, b) => {
    if (projectSort === "category") {
      const categoryCompare = compareStrings(a.category, b.category, "asc");
      if (categoryCompare !== 0) return categoryCompare;

      const aSubcategory = a.subcategory ?? "";
      const bSubcategory = b.subcategory ?? "";
      const subcategoryCompare = compareStrings(aSubcategory, bSubcategory, "asc");
      if (subcategoryCompare !== 0) return subcategoryCompare;

      return compareStrings(a.title, b.title, "asc");
    }
    if (projectSort === "az") return compareStrings(a.title, b.title, "asc");
    if (projectSort === "za") return compareStrings(a.title, b.title, "desc");
    return compareDates(a.publishDate, b.publishDate, projectSort);
  });

  const filteredArticles = articles.filter((a) =>
    !articleSearch || a.title.toLowerCase().includes(articleSearch.toLowerCase())
  ).sort((a, b) => {
    if (articleSort === "az") return compareStrings(a.title, b.title, "asc");
    if (articleSort === "za") return compareStrings(a.title, b.title, "desc");
    return compareDates(a.publishDate, b.publishDate, articleSort);
  });
  const filteredClients = clients.filter((client) => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      client.name.toLowerCase().includes(q) ||
      (client.location ?? "").toLowerCase().includes(q) ||
      client.roles.some((role) => role.toLowerCase().includes(q))
    );
  }).sort((a, b) => (
    clientSort === "newest" || clientSort === "oldest"
      ? compareStrings(a.id, b.id, clientSort === "newest" ? "desc" : "asc")
      : compareStrings(a.name, b.name, clientSort === "az" ? "asc" : "desc")
  ));
  const filteredContacts = contacts.filter((contact) => {
    const q = contactsSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      contact.name.toLowerCase().includes(q) ||
      (contact.email ?? "").toLowerCase().includes(q) ||
      (contact.phone ?? "").toLowerCase().includes(q) ||
      (contact.source ?? "").toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (contactsSort === "az") return compareStrings(a.name, b.name, "asc");
    if (contactsSort === "za") return compareStrings(a.name, b.name, "desc");
    return compareDates(a.createdAt, b.createdAt, contactsSort);
  });
  const filteredRateLimits = rateLimits.filter((entry) => {
    const q = rateLimitSearch.trim().toLowerCase();
    if (!q) return true;
    return [
      entry.scope,
      entry.ip,
      entry.browser,
      entry.userAgent,
      entry.city,
      entry.region,
      entry.country,
      entry.notes,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q));
  });
  const contactFormEntries = contacts.filter((contact) => contact.source === "contact-form");
  const filteredMessageEntries = contactFormEntries.filter((entry) => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return true;

    return (
      entry.name.toLowerCase().includes(q) ||
      (entry.subject ?? "").toLowerCase().includes(q) ||
      (entry.email ?? "").toLowerCase().includes(q) ||
      (entry.phone ?? "").toLowerCase().includes(q) ||
      entry.message.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (messagesSort === "az") return compareStrings(a.name, b.name, "asc");
    if (messagesSort === "za") return compareStrings(a.name, b.name, "desc");
    if (messagesSort === "read") return Number(Boolean(b.messageRead)) - Number(Boolean(a.messageRead));
    if (messagesSort === "unread") return Number(Boolean(a.messageRead)) - Number(Boolean(b.messageRead));
    return compareDates(a.createdAt, b.createdAt, messagesSort);
  });
  const filteredRizzEntries = rizzEntries.filter((entry) => {
    const q = rizzSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.nickname.toLowerCase().includes(q) ||
      entry.phone.toLowerCase().includes(q) ||
      humanizeChoiceList(entry.dateIdeas ?? (entry.dateIdea ? [entry.dateIdea] : [])).toLowerCase().includes(q) ||
      humanizeChoiceList(entry.vibes ?? (entry.vibe ? [entry.vibe] : [])).toLowerCase().includes(q) ||
      humanizeChoiceList(entry.winOvers ?? (entry.winOver ? [entry.winOver] : [])).toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    if (rizzSort === "az") return compareStrings(a.name, b.name, "asc");
    if (rizzSort === "za") return compareStrings(a.name, b.name, "desc");
    return compareDates(a.createdAt, b.createdAt, rizzSort);
  });

  /* ── Derived dashboard stats ── */

  /* ── Nav sections config ── */
  const unreadMessages = contactFormEntries.filter((entry) => !entry.messageRead).length;

  const resumeQuery = resumeSearch.trim().toLowerCase();
  const filteredExperiences = experiences.filter((exp) => {
    if (!resumeQuery) return true;
    return [exp.role, exp.companyName, exp.description, exp.type]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredEducations = educations.filter((education) => {
    if (!resumeQuery) return true;
    return [education.degree, education.institution, education.field, education.description]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredSkillsList = skills.filter((skill) => {
    if (!resumeQuery) return true;
    return [skill.name, skill.category]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredCertificationsList = certifications.filter((cert) => {
    if (!resumeQuery) return true;
    return [cert.name, cert.issuer, cert.date]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredAwardsList = awards.filter((award) => {
    if (!resumeQuery) return true;
    return [award.name, award.issuer, award.description, award.date]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });
  const filteredClubsList = clubs.filter((club) => {
    if (!resumeQuery) return true;
    return [club.name, club.role, club.description, club.startDate, club.endDate]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(resumeQuery));
  });

  const smsEmailLast90Days = (() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 89);

    const rows = Array.from({ length: 90 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { key, label: fmtDayLabel(day), sms: 0, email: 0 };
    });

    const byDay = new Map(rows.map((row) => [row.key, row]));
    contacts.forEach((contact) => {
      const createdAt = new Date(contact.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < start) return;
      const bucket = byDay.get(createdAt.toISOString().slice(0, 10));
      if (!bucket) return;
      if (contact.phone) bucket.sms += 1;
      if (contact.email) bucket.email += 1;
    });

    return rows;
  })();

  const contactFormLast90Days = (() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 89);

    const rows = Array.from({ length: 90 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { key, label: fmtDayLabel(day), submissions: 0 };
    });

    const byDay = new Map(rows.map((row) => [row.key, row]));
    contactFormEntries.forEach((entry) => {
      const createdAt = new Date(entry.createdAt);
      if (Number.isNaN(createdAt.getTime()) || createdAt < start) return;
      const bucket = byDay.get(createdAt.toISOString().slice(0, 10));
      if (!bucket) return;
      bucket.submissions += 1;
    });

    return rows;
  })();

  const navItems: { key: NavSection; label: string; unreadCount?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "projects", label: "Projects" },
    { key: "articles", label: "Articles" },
    { key: "clients", label: "Clients" },
    { key: "r2-assets", label: "R2 Assets" },
    { key: "site-content", label: "Site Content" },
    { key: "resume", label: "Resume" },
    { key: "contacts", label: "Contacts" },
    { key: "rate-limits", label: "Rate Limits" },
    { key: "contact-form-entries", label: "Messages", unreadCount: unreadMessages },
    { key: "campaigns", label: "Compose" },
    { key: "rizz", label: "Rizz" },
  ];

  const adminSearchQuery = adminSearch.trim().toLowerCase();
  const adminSearchResults = !adminSearchQuery
    ? []
    : [
        ...navItems
          .filter((item) => item.label.toLowerCase().includes(adminSearchQuery))
          .map((item) => ({
            id: `section-${item.key}`,
            label: item.label,
            hint: "Section",
            section: item.key,
            onSelect: () => {
              setActiveSection(item.key);
              setAdminSearch("");
            },
          })),
        ...projects
          .filter((project) => project.title.toLowerCase().includes(adminSearchQuery))
          .slice(0, 5)
          .map((project) => ({
            id: `project-${project.id}`,
            label: project.title,
            hint: "Project",
            section: "projects" as NavSection,
            onSelect: () => {
              setActiveSection("projects");
              setProjectSearch(project.title);
              setAdminSearch("");
            },
          })),
        ...articles
          .filter((article) => article.title.toLowerCase().includes(adminSearchQuery))
          .slice(0, 5)
          .map((article) => ({
            id: `article-${article.id}`,
            label: article.title,
            hint: "Article",
            section: "articles" as NavSection,
            onSelect: () => {
              setActiveSection("articles");
              setArticleSearch(article.title);
              setAdminSearch("");
            },
          })),
        ...clients
          .filter((client) => client.name.toLowerCase().includes(adminSearchQuery))
          .slice(0, 5)
          .map((client) => ({
            id: `client-${client.id}`,
            label: client.name,
            hint: "Client",
            section: "clients" as NavSection,
            onSelect: () => {
              setActiveSection("clients");
              setClientSearch(client.name);
              setAdminSearch("");
            },
          })),
        ...contacts
          .filter((contact) =>
            [contact.name, contact.email, contact.phone]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((contact) => ({
            id: `contact-${contact.id}`,
            label: contact.name,
            hint: "Contact",
            section: "contacts" as NavSection,
            onSelect: () => {
              setActiveSection("contacts");
              setContactsSearch(contact.name);
              setAdminSearch("");
            },
          })),
        ...rateLimits
          .filter((entry) =>
            [entry.ip, entry.browser, entry.userAgent, entry.scope, entry.city, entry.region, entry.country]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((entry) => ({
            id: `rate-limit-${entry.id}`,
            label: entry.ip || entry.browser || entry.scope,
            hint: "Rate Limit",
            section: "rate-limits" as NavSection,
            onSelect: () => {
              setActiveSection("rate-limits");
              setRateLimitSearch(entry.ip || entry.browser || entry.scope);
              setAdminSearch("");
            },
          })),
        ...contactFormEntries
          .filter((entry) =>
            [entry.name, entry.subject, entry.email, entry.phone, entry.message]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((entry) => ({
            id: `message-${entry.id}`,
            label: entry.subject || entry.name,
            hint: "Message",
            section: "contact-form-entries" as NavSection,
            onSelect: () => {
              setActiveSection("contact-form-entries");
              setMessageSearch(entry.subject || entry.name);
              setAdminSearch("");
            },
          })),
        ...campaigns
          .filter((campaign) =>
            (campaign.subject || "sms message").toLowerCase().includes(adminSearchQuery)
          )
          .slice(0, 5)
          .map((campaign) => ({
            id: `campaign-${campaign.id}`,
            label: campaign.subject || "SMS Message",
            hint: "Compose",
            section: "campaigns" as NavSection,
            onSelect: () => {
              setActiveSection("campaigns");
              setAdminSearch("");
              setCampaignView(campaign);
            },
          })),
        ...rizzEntries
          .filter((entry) =>
            [entry.name, entry.nickname, entry.phone]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(adminSearchQuery))
          )
          .slice(0, 5)
          .map((entry) => ({
            id: `rizz-${entry.id}`,
            label: `${entry.name} (${entry.nickname})`,
            hint: "Rizz",
            section: "rizz" as NavSection,
            onSelect: () => {
              setActiveSection("rizz");
              setRizzSearch(entry.name);
              setAdminSearch("");
            },
          })),
      ].slice(0, 16);

  const sectionTitles: Record<NavSection, string> = {
    dashboard: "Overview",
    projects: "Projects",
    articles: "Articles",
    clients: "Clients",
    "r2-assets": "R2 Assets",
    "site-content": "Site Content",
    resume: "Resume",
    contacts: "Contacts",
    "rate-limits": "Rate Limits",
    "contact-form-entries": "Messages",
    campaigns: "Compose",
    rizz: "Rizz",
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/30 text-sm font-jb">Loading admin…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex font-jb">
      {/* ── SIDEBAR ── */}
      <aside className="fixed top-0 left-0 h-full w-[220px] bg-[#080808] border-r border-white/8 flex flex-col z-30">
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ key, label, unreadCount }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded-sm text-xs transition-colors ${
                activeSection === key
                  ? "text-[#ef4242] bg-[#ef4242]/8"
                  : "text-white/45 hover:text-white hover:bg-white/4"
              }`}
            >
              <span>{label}</span>
              {Boolean(unreadCount) && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#ef4242] px-1.5 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Back link + Logout */}
        <div className="px-4 py-4 border-t border-white/6 space-y-2">
          <Link href="/" className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/60 transition-colors">
            <span>←</span>
            <span>MDCran.com</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-[11px] text-[#ef4242]/50 hover:text-[#ef4242] transition-colors w-full text-left"
          >
            <span>⏻</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="ml-[220px] flex-1 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 h-14 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/8 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-[160px]">
            <h1 className="font-nord text-lg text-white">{sectionTitles[activeSection]}</h1>
          </div>
          <div className="flex-1 flex justify-center px-6">
            <div className="relative w-full max-w-xl">
              <input
                className="w-full h-10 rounded-sm border border-white/10 bg-white/4 px-4 text-sm text-white outline-none placeholder-white/25 focus:border-[#ef4242] transition-colors"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                onFocus={() => setAdminSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setAdminSearchFocused(false), 120)}
                placeholder="Search admin center..."
              />
              {adminSearchFocused && adminSearchQuery && (
                <div className="absolute top-full mt-2 w-full rounded-sm border border-white/10 bg-[#0b0b0b]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                  {adminSearchResults.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-white/30">No matches found.</div>
                  ) : (
                    <div className="max-h-[360px] overflow-y-auto py-1">
                      {adminSearchResults.map((result) => (
                        <button
                          key={result.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={result.onSelect}
                          className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/4 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-white/80">{result.label}</div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25">{result.hint}</div>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-[#ef4242]/80">
                            {sectionTitles[result.section]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-[160px] justify-end">
            {activeSection === "projects" && (
              <button className={btnRed} onClick={() => setProjectModal({ open: true })}>+ New Project</button>
            )}
            {activeSection === "articles" && (
              <button className={btnRed} onClick={() => setArticleModal({ open: true })}>+ New Article</button>
            )}
            {activeSection === "clients" && (
              <button className={btnRed} onClick={() => setClientModal({ open: true })}>+ New Client</button>
            )}
            {activeSection === "campaigns" && (
              <button className={btnRed} onClick={() => setCampaignModal({ open: true })}>+ Compose</button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-8 py-8">

          {/* ─────────────────────────────────────
              DASHBOARD OVERVIEW
          ───────────────────────────────────── */}
          {activeSection === "dashboard" && (
            <div className="space-y-8">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Total Projects", value: projects.length },
                  { label: "Total Articles", value: articles.length },
                  { label: "Total Clients", value: clients.length },
                  { label: "Featured Projects", value: projects.filter((p) => p.featured).length },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-white/7 bg-white/2 rounded-sm p-5">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/35 mb-2">{label}</p>
                    <p className="font-nord text-3xl text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)] gap-4">
                <TapsChart />
                <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <div>
                    <p className="font-nord text-sm text-white">Tap Overrides</p>
                    <p className="text-xs text-white/35">Manually set tap counts for a project or article when you need to correct tracking.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <select
                          className={inputCls}
                          value={tapEditorType}
                          onChange={(e) => {
                            const nextType = e.target.value as "project" | "article";
                            setTapEditorType(nextType);
                            const nextTargets = tapTargets.filter((target) => target.type === nextType);
                            const nextTarget = nextTargets[0];
                            setTapEditorTargetId(nextTarget?.id ?? "");
                            setTapEditorCount(String(nextTarget ? tapCounts[nextTarget.id] ?? 0 : ""));
                          }}
                        >
                          <option value="project">Project</option>
                          <option value="article">Article</option>
                        </select>
                      </div>
                      <div>
                        <Label>Current Count</Label>
                        <div className="flex h-9 items-center rounded-sm border border-white/10 bg-black/20 px-3 text-sm text-white/60">
                          {tapEditorTargetId ? (tapCounts[tapEditorTargetId] ?? 0).toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Item</Label>
                      <select
                        className={inputCls}
                        value={tapEditorTargetId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setTapEditorTargetId(nextId);
                          setTapEditorCount(String(tapCounts[nextId] ?? 0));
                        }}
                      >
                        {filteredTapTargets.map((target) => (
                          <option key={target.id} value={target.id}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Set Taps</Label>
                      <input
                        className={inputCls}
                        inputMode="numeric"
                        value={tapEditorCount}
                        onChange={(e) => setTapEditorCount(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                    <span className="text-[11px] text-white/30">
                      Saved to MongoDB and reflected in the tap chart.
                    </span>
                    <button
                      className={btnRed}
                      onClick={() => void saveTapOverride()}
                      disabled={!tapEditorTargetId || tapEditorSaving}
                    >
                      {tapEditorSaving ? "Saving..." : "Save Taps"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                  <div className="mb-4">
                    <p className="font-nord text-sm text-white">SMS + Email Inflow (90 Days)</p>
                    <p className="text-xs text-white/35">New contacts captured with phone numbers or email addresses.</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={smsEmailLast90Days}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} minTickGap={18} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                        <Line type="monotone" dataKey="email" stroke="#ef4242" strokeWidth={2} dot={false} name="Email" />
                        <Line type="monotone" dataKey="sms" stroke="#d4a853" strokeWidth={2} dot={false} name="SMS" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                  <div className="mb-4">
                    <p className="font-nord text-sm text-white">Contact Form Submissions (90 Days)</p>
                    <p className="text-xs text-white/35">Daily volume of messages submitted through the contact page.</p>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contactFormLast90Days}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} minTickGap={18} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#090909", border: "1px solid rgba(255,255,255,0.08)" }}
                          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
                        />
                        <Bar dataKey="submissions" fill="#ef4242" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-nord text-sm text-white">Project Views Refresh</p>
                      <p className="text-xs text-white/35">Scans every linked project video, updates stored view counts, and auto-runs roughly every 20 minutes while the admin center is open.</p>
                    </div>
                    <button
                      className={btnRed}
                      onClick={() => void refreshProjectViewsAudit()}
                      disabled={projectViewsRefreshing}
                    >
                      {projectViewsRefreshing ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-white/8 rounded-sm p-3">
                      <p className="text-[10px] tracking-widest uppercase text-white/35 mb-1">Total Views</p>
                      <p className="font-nord text-xl text-white">
                        {projectViewsAuditSummary
                          ? projectViewsAuditSummary.totalProjectViews.toLocaleString()
                          : "Not run yet"}
                      </p>
                    </div>
                    <div className="border border-white/8 rounded-sm p-3">
                      <p className="text-[10px] tracking-widest uppercase text-white/35 mb-1">Last Refresh</p>
                      <p className="text-xs text-white/55">
                        {projectViewsAuditSummary?.refreshedAt ? fmtDateTime(projectViewsAuditSummary.refreshedAt) : "Not run yet"}
                      </p>
                    </div>
                  </div>
                  <div className="border border-white/8 rounded-sm bg-black/30">
                    <div className="px-3 py-2 border-b border-white/8 text-[10px] tracking-widest uppercase text-white/35">
                      Console
                    </div>
                    <pre className="h-80 overflow-auto px-3 py-3 text-[11px] leading-5 text-white/60 whitespace-pre-wrap">
                      {projectViewsAuditLog.join("\n")}
                    </pre>
                  </div>
                </div>

                <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-nord text-sm text-white">Spotify Connection</p>
                      <p className="text-xs text-white/35">Reconnect the Spotify OAuth token used by the homepage now-playing / last-played widget.</p>
                    </div>
                    <a
                      href="/api/spotify/auth"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center px-4 bg-[#ef4242] hover:bg-[#d93838] text-white text-xs font-medium rounded-sm transition-colors"
                    >
                      Connect / Reconnect
                    </a>
                  </div>
                  <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-3 text-xs text-white/40">
                    This opens Spotify authorization in a new tab and refreshes the token used by the home page widget.
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ─────────────────────────────────────
              PROJECTS
          ───────────────────────────────────── */}
          {activeSection === "projects" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search projects…"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[200px]`}
                  value={projectCategoryFilter}
                  onChange={(e) => setProjectCategoryFilter(e.target.value)}
                >
                  <option value="">All categories</option>
                  <option value="arts-and-entertainment">Arts & Entertainment</option>
                  <option value="motion-and-graphics">Motion & Graphics</option>
                  <option value="coding-projects">Code</option>
                </select>
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={projectSort}
                  onChange={(e) => setProjectSort(e.target.value as typeof projectSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                  <option value="category">Category + Subcategory</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredProjects.length} projects</span>
              </div>

              {/* Table */}
              <div className="border border-white/8 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 w-12">Cover</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Title</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Category</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Subcategory</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Pricing</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Taps</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Featured</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2">
                          {p.coverImage ? (
                            <img
                              src={assetUrl(toEditableImageAsset(p.coverImage).src)}
                              alt={toEditableImageAsset(p.coverImage).alt ?? ""}
                              className="w-10 h-[30px] object-cover rounded-sm opacity-80"
                            />
                          ) : (
                            <div className="w-10 h-[30px] bg-white/5 rounded-sm" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setProjectModal({ open: true, editing: p })}
                            className="text-white/80 hover:text-white text-left transition-colors font-medium truncate max-w-[200px] block"
                          >
                            {p.title}
                          </button>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {p.tags.slice(0, 3).map((t) => (
                                <span key={t} className="text-[10px] text-white/25">{t}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-white/40 hidden lg:table-cell">{p.category}</td>
                        <td className="px-3 py-2 text-white/35 hidden xl:table-cell">{p.subcategory ?? "—"}</td>
                        <td className="px-3 py-2">
                          <PricingBadge status={p.pricing.status} />
                        </td>
                        <td className="px-3 py-2 text-white/40 hidden lg:table-cell">{tapCounts[p.id] ?? 0}</td>
                        <td className="px-3 py-2 hidden lg:table-cell">
                          {p.featured ? <span className="text-[#ef4242] text-xs">★</span> : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-3 py-2 text-white/35 hidden md:table-cell">{fmtDate(p.publishDate)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5 justify-end">
                            <a
                              className={btnGhost}
                              href={getProjectHref(p)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            <button
                              className={btnOutline}
                              onClick={() => setProjectModal({ open: true, editing: p })}
                            >
                              Edit
                            </button>
                            <button
                              className={btnOutlineRed}
                              onClick={() => setDeleteConfirm({ type: "project", id: p.id, label: p.title })}
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredProjects.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-white/25 text-xs">No projects found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              ARTICLES
          ───────────────────────────────────── */}
          {activeSection === "articles" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search articles…"
                  value={articleSearch}
                  onChange={(e) => setArticleSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={articleSort}
                  onChange={(e) => setArticleSort(e.target.value as typeof articleSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredArticles.length} articles</span>
              </div>

              <div className="border border-white/8 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Title</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Category</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Excerpt</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Author</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden sm:table-cell">Date / Time</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Taps</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Featured</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map((a) => (
                      <tr key={a.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => setArticleModal({ open: true, editing: a })}
                            className="text-white/80 hover:text-white text-left transition-colors font-medium truncate max-w-[220px] block"
                          >
                            {a.title}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-white/8 text-white/40">{a.category}</span>
                        </td>
                        <td className="px-3 py-2.5 text-white/35 hidden lg:table-cell max-w-[200px]">
                          <span className="truncate block">{a.excerpt.slice(0, 60)}{a.excerpt.length > 60 ? "…" : ""}</span>
                        </td>
                        <td className="px-3 py-2.5 text-white/40 hidden md:table-cell">{a.author}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden sm:table-cell">{fmtDate(a.publishDate)}</td>
                        <td className="px-3 py-2.5 text-white/40 hidden lg:table-cell">{tapCounts[a.id] ?? 0}</td>
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          {a.featured ? <span className="text-[#ef4242] text-xs">★</span> : <span className="text-white/20">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1.5 justify-end">
                            <a
                              className={btnGhost}
                              href={`/articles/${a.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                            <button className={btnOutline} onClick={() => setArticleModal({ open: true, editing: a })}>Edit</button>
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "article", id: a.id, label: a.title })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredArticles.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-white/25 text-xs">No articles found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              CLIENTS
          ───────────────────────────────────── */}
          {activeSection === "clients" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={clientSort}
                  onChange={(e) => setClientSort(e.target.value as typeof clientSort)}
                >
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredClients.length} clients</span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {filteredClients.map((c) => (
                <div key={c.id} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl ? (
                        <img src={assetUrl(c.avatarUrl)} alt={c.name} className="w-9 h-9 rounded-full object-cover opacity-90" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-white/30 text-xs">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-white font-medium">{c.name}</p>
                        {c.location && <p className="text-[10px] text-white/30">{c.location}</p>}
                      </div>
                    </div>
                    {c.featured && (
                      <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#ef4242]/15 text-[#ef4242] flex-shrink-0">Featured</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {c.roles.slice(0, 3).map((r) => (
                      <span key={r} className="text-[10px] px-2 py-0.5 rounded-sm bg-white/6 text-white/45">{r}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/30">
                    <span>{c.socialLinks.length} social link{c.socialLinks.length !== 1 ? "s" : ""}</span>
                    <span>{projects.filter((p) => p.clientIds?.includes(c.id)).length} project{projects.filter((p) => p.clientIds?.includes(c.id)).length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-[10px] text-white/20">id: {c.id}{c.quote && <span className="ml-2 text-[#d4a853]/60">has quote</span>}</div>

                  <div className="flex gap-2 pt-1 border-t border-white/6">
                    <a
                      className={btnGhost}
                      href={`/clients/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                    <button className={`${btnOutline} flex-1`} onClick={() => setClientModal({ open: true, editing: c })}>Edit</button>
                    <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "client", id: c.id, label: c.name })}>Del</button>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div className="xl:col-span-3 text-center py-12 text-white/25 text-xs">No clients found.</div>
              )}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              CONTACTS
          ───────────────────────────────────── */}
          {activeSection === "contacts" && (
            <div className="space-y-4">
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <p className="font-nord text-sm text-white">Contacts</p>
                    <p className="text-xs text-white/35">
                      Manage subscribers and outreach contacts collected from the site or added manually.
                    </p>
                  </div>
                  <button
                    className={`${btnRed} cursor-pointer`}
                    onClick={() => setContactModal({ open: true, editing: null })}
                  >
                    Add Contact
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search contacts..."
                  value={contactsSearch}
                  onChange={(e) => setContactsSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={contactsSort}
                  onChange={(e) => setContactsSort(e.target.value as typeof contactsSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <span className="rounded-sm border border-white/8 bg-white/[0.02] px-3 h-9 inline-flex items-center text-xs text-white/35 ml-auto">
                  {filteredContacts.length} contacts
                </span>
              </div>
              <div className="border border-white/8 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Name</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Email</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Phone</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Source</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Subscribed</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden sm:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">{c.name}</td>
                        <td className="px-3 py-2.5 text-white/45 hidden md:table-cell">{c.email || "-"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden lg:table-cell">{c.phone || "—"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden md:table-cell">{formatContactSource(c.source)}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => toggleContactSubscription(c.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-sm transition-colors ${
                              c.subscribed
                                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                : "bg-white/8 text-white/35 hover:bg-white/12"
                            }`}
                          >
                            {c.subscribed ? "Yes" : "No"}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-white/30 hidden sm:table-cell">{fmtDate(c.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button
                              className={`${btnOutline} cursor-pointer`}
                              onClick={() => setContactModal({ open: true, editing: c })}
                            >
                              Edit
                            </button>
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "contact", id: c.id, label: c.name })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredContacts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-white/25 text-xs">
                          No contacts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              CAMPAIGNS
          ───────────────────────────────────── */}
          {activeSection === "rate-limits" && (
            <div className="space-y-4">
              <div className="rounded-sm border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-nord text-sm text-white">Rate Limits</p>
                    <p className="text-xs text-white/35">
                      Public forms are limited to 5 submissions per IP address for each form scope.
                    </p>
                  </div>
                  <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/35">
                    Per-IP limit: 5
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-sm`}
                  placeholder="Search rate limits..."
                  value={rateLimitSearch}
                  onChange={(e) => setRateLimitSearch(e.target.value)}
                />
                <span className="rounded-sm border border-white/8 bg-white/[0.02] px-3 h-9 inline-flex items-center text-xs text-white/35 ml-auto">
                  {filteredRateLimits.length} records
                </span>
              </div>
              <div className="border border-white/8 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Scope</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">IP</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Browser</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Location</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Usage</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Last Attempt</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRateLimits.map((entry) => (
                      <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">
                          <div>{formatRateLimitScope(entry.scope)}</div>
                          {entry.notes && <div className="text-[10px] text-white/25">{entry.notes}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-white/45 hidden md:table-cell">{entry.ip || "Removed"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden lg:table-cell">
                          <div>{entry.browser || "Removed"}</div>
                          {entry.userAgent && <div className="text-[10px] text-white/20 truncate max-w-[240px]">{entry.userAgent}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-white/35 hidden xl:table-cell">
                          {[entry.city, entry.region, entry.country].filter(Boolean).join(", ") || "Unknown"}
                        </td>
                        <td className="px-3 py-2.5 text-white/60">
                          <div>{entry.count} / {entry.limit}</div>
                          <div className="text-[10px] text-[#ef4242]/75">{entry.blockedCount} blocked</div>
                        </td>
                        <td className="px-3 py-2.5 text-white/30 hidden lg:table-cell">{fmtDateTime(entry.lastAttemptAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button className={btnOutline} onClick={() => void mutateRateLimitRecord("reset", entry)}>Reset</button>
                            <button className={btnOutline} onClick={() => void mutateRateLimitRecord("clear-pii", entry)}>Clear PII</button>
                            <button className={btnOutlineRed} onClick={() => void deleteRateLimit(entry.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRateLimits.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-white/25 text-xs">No rate-limit records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "contact-form-entries" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <input
                  className={`${inputCls} max-w-sm`}
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search messages..."
                />
                <select
                  className={`${inputCls} max-w-[180px]`}
                  value={messagesSort}
                  onChange={(e) => setMessagesSort(e.target.value as typeof messagesSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="read">Read First</option>
                  <option value="unread">Unread First</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <button
                  className={btnOutline}
                  onClick={() => setMessageReadState(contactFormEntries.map((entry) => entry.id), true)}
                  disabled={contactFormEntries.length === 0}
                >
                  Mark All Read
                </button>
                <button
                  className={btnOutline}
                  onClick={() => setMessageReadState(contactFormEntries.map((entry) => entry.id), false)}
                  disabled={contactFormEntries.length === 0}
                >
                  Mark All Unread
                </button>
                <span className="text-xs text-white/30 self-center ml-auto">
                  {unreadMessages} unread / {contactFormEntries.length} total
                </span>
              </div>
              {contactFormEntries.length === 0 ? (
                <div className="rounded-sm border border-white/8 px-4 py-8 text-center text-xs text-white/25">
                  No messages yet.
                </div>
              ) : filteredMessageEntries.length === 0 ? (
                <div className="rounded-sm border border-white/8 px-4 py-8 text-center text-xs text-white/25">
                  No messages match that search.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMessageEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-sm border p-4 ${
                        entry.messageRead
                          ? "border-white/8 bg-white/[0.02]"
                          : "border-[#ef4242]/20 bg-[#ef4242]/[0.03]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-white/80">{entry.name}</span>
                            <span className={`rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                              entry.messageRead
                                ? "border border-white/10 bg-white/4 text-white/35"
                                : "border border-[#ef4242]/20 bg-[#ef4242]/10 text-[#ef4242]"
                            }`}>
                              {entry.messageRead ? "Read" : "Unread"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-white/35">
                            <span>{entry.email || "No email"}</span>
                            <span>{entry.phone || "No phone"}</span>
                            <span>{fmtDate(entry.createdAt)}</span>
                          </div>
                          {entry.subject && (
                            <div className="text-xs uppercase tracking-[0.18em] text-white/45">
                              {entry.subject}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className={btnOutline}
                            onClick={() => setMessageReadState([entry.id], !entry.messageRead)}
                          >
                            Mark {entry.messageRead ? "Unread" : "Read"}
                          </button>
                          <button
                            className={btnOutlineRed}
                            onClick={() =>
                              setDeleteConfirm({ type: "contact", id: entry.id, label: entry.name })
                            }
                          >
                            Del
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 whitespace-pre-wrap rounded-sm border border-white/6 bg-black/20 px-3 py-3 text-xs leading-relaxed text-white/55">
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === "r2-assets" && (
            <div className="space-y-6">
              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <p className="font-nord text-sm text-white">Cloudflare R2 Bucket</p>
                    <p className="text-xs text-white/35">
                      Browse folders, search assets, upload files into the current folder, delete files, and copy public CDN links.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={btnOutline}
                      onClick={() => void loadR2Assets()}
                      disabled={r2Loading}
                    >
                      {r2Loading ? "Refreshing..." : "Refresh"}
                    </button>
                    <button
                      className={btnGhost}
                      onClick={() => r2FileInputRef.current?.click()}
                      disabled={r2Uploading}
                    >
                      {r2Uploading ? "Uploading..." : "Upload File"}
                    </button>
                    <input
                      ref={r2FileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => void uploadR2Files(e.target.files)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <input
                    className={inputCls}
                    value={r2Search}
                    onChange={(e) => setR2Search(e.target.value)}
                    placeholder="Search this folder or bucket..."
                  />
                  <div className="flex gap-2">
                    <button
                      className={btnOutline}
                      onClick={() => {
                        setR2Search("");
                        void loadR2Assets({ search: "" });
                      }}
                      disabled={!r2Search}
                    >
                      Clear Search
                    </button>
                    <button
                      className={btnOutline}
                      onClick={() => {
                        const trimmed = r2Prefix.replace(/\/$/, "");
                        const parent = trimmed.includes("/") ? `${trimmed.slice(0, trimmed.lastIndexOf("/") + 1)}` : "";
                        setR2Search("");
                        setR2Prefix(parent);
                      }}
                      disabled={!r2Prefix}
                    >
                      Up One Level
                    </button>
                  </div>
                </div>

                <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-white/35">
                  <span className="text-white/50">Location:</span>{" "}
                  {r2Mode === "search"
                    ? `Search results for "${r2Search.trim()}" in ${r2Prefix || "bucket root"}`
                    : r2Prefix || "bucket root"}
                </div>

                {r2Error && (
                  <div className="rounded-sm border border-[#ef4242]/20 bg-[#ef4242]/8 px-3 py-2 text-xs text-[#ef4242]">
                    {r2Error}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="border border-white/7 bg-white/2 rounded-sm overflow-hidden">
                  <div className="border-b border-white/8 px-4 py-3 text-[10px] tracking-widest uppercase text-white/35">
                    Folders
                  </div>
                  <div className="max-h-[520px] overflow-y-auto">
                    {r2Folders.length === 0 ? (
                      <div className="px-4 py-6 text-xs text-white/25">
                        {r2Mode === "search" ? "Folder browse is disabled while searching." : "No folders in this location."}
                      </div>
                    ) : (
                      r2Folders.map((folder) => (
                        <button
                          key={folder.prefix}
                          className="flex w-full items-center justify-between border-b border-white/6 px-4 py-3 text-left text-xs text-white/55 transition-colors hover:bg-white/3 hover:text-white"
                          onClick={() => {
                            setR2Search("");
                            setR2Prefix(folder.prefix);
                          }}
                        >
                          <span className="truncate">{folder.name}/</span>
                          <span className="text-white/20">Open</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="border border-white/7 bg-white/2 rounded-sm overflow-hidden">
                  <div className="border-b border-white/8 px-4 py-3 text-[10px] tracking-widest uppercase text-white/35">
                    Files ({r2Files.length})
                  </div>
                  {r2Files.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-white/25">
                      {r2Loading ? "Loading assets..." : "No files found."}
                    </div>
                  ) : (
                    <div className="max-h-[520px] overflow-y-auto">
                      {r2Files.map((file) => (
                        <div
                          key={file.key}
                          className="border-b border-white/6 px-4 py-3 last:border-b-0"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              {isImageAssetFile(file.name) ? (
                                <button
                                  type="button"
                                  onClick={() => setR2PreviewFile(file)}
                                  className="block shrink-0 transition-opacity hover:opacity-90"
                                >
                                  <img
                                    src={file.publicUrl}
                                    alt={file.name}
                                    className="h-14 w-20 rounded-sm border border-white/8 bg-black/20 object-cover"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-sm border border-white/8 bg-black/20 text-[10px] uppercase tracking-[0.18em] text-white/20">
                                  File
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="truncate text-xs text-white/75">{file.name}</div>
                                <div className="truncate text-[10px] text-white/25">{file.key}</div>
                                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-white/25">
                                  <span>{formatBytes(file.size)}</span>
                                  <span>{fmtDateTime(file.lastModified)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={file.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={btnOutline}
                              >
                                Open
                              </a>
                              <button
                                className={`${btnOutline} cursor-pointer`}
                                onClick={() => void copyR2Link(file.publicUrl)}
                              >
                                {r2CopiedUrl === file.publicUrl ? "Copied." : "Copy Link"}
                              </button>
                              <button
                                className={btnOutlineRed}
                                onClick={() => void deleteR2File(file.key)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === "site-content" && (
            <div className="space-y-6">
              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-nord text-sm text-white">Editable Site Copy</p>
                    <p className="text-xs text-white/35">
                      Saved to MongoDB and used to drive shared brand assets, homepage copy and order, footer content, work and subpage headers, and legal page content.
                    </p>
                  </div>
                  <button className={`${btnRed} cursor-pointer`} onClick={() => void saveSiteContentEditor()}>
                    Save Site Content
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label>Shared Logo URL</Label>
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input
                        className={inputCls}
                        value={siteContent.brandLogoUrl}
                        onChange={(e) =>
                          setSiteContent((prev) => ({
                            ...prev,
                            brandLogoUrl: e.target.value,
                          }))
                        }
                        placeholder="https://cdn.mdcran.com/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png"
                      />
                      <button
                        type="button"
                        className={`${btnOutline} cursor-pointer`}
                        onClick={() => setSiteContentImageTarget("brandLogoUrl")}
                      >
                        Select Image
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Favicon URL</Label>
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input
                        className={inputCls}
                        value={siteContent.faviconUrl}
                        onChange={(e) =>
                          setSiteContent((prev) => ({
                            ...prev,
                            faviconUrl: e.target.value,
                          }))
                        }
                        placeholder="https://cdn.mdcran.com/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png"
                      />
                      <button
                        type="button"
                        className={`${btnOutline} cursor-pointer`}
                        onClick={() => setSiteContentImageTarget("faviconUrl")}
                      >
                        Select Image
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex h-16 w-full items-center gap-3 rounded-sm border border-white/8 bg-black/20 px-3">
                      {siteContent.brandLogoUrl ? (
                        <img
                          src={assetUrl(siteContent.brandLogoUrl)}
                          alt="Shared brand logo preview"
                          className="max-h-10 w-auto rounded-sm object-contain"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-sm border border-white/10 bg-white/5" />
                      )}
                      <span className="text-xs text-white/35">Navbar, footer, and admin login logo</span>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex h-16 w-full items-center gap-3 rounded-sm border border-white/8 bg-black/20 px-3">
                      {siteContent.faviconUrl ? (
                        <img
                          src={assetUrl(siteContent.faviconUrl)}
                          alt="Favicon preview"
                          className="h-8 w-8 rounded-sm object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-sm border border-white/10 bg-white/5" />
                      )}
                      <span className="text-xs text-white/35">Browser tab, bookmark, and app icon metadata</span>
                    </div>
                  </div>
                </div>
              </div>

              {([
                ["homeServices", "Home: Services Section"],
                ["artsAndEntertainment", "Arts & Entertainment Page"],
                ["motionAndGraphics", "Motion & Graphics Page"],
              ] as const).map(([key, label]) => {
                const block = siteContent[key];
                const showCountField = key === "artsAndEntertainment";
                const showItemsField = key === "homeServices";
                const cardGridClass = showCountField && showItemsField
                  ? "grid-cols-4"
                  : showCountField || showItemsField
                    ? "grid-cols-3"
                    : "grid-cols-2";
                const descriptionSpanClass = showCountField && showItemsField
                  ? "col-span-4"
                  : showCountField || showItemsField
                    ? "col-span-3"
                    : "col-span-2";

                return (
                  <div key={key} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                    <p className="font-nord text-sm text-white">{label}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Eyebrow</Label>
                        <input
                          className={inputCls}
                          value={block.eyebrow}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], eyebrow: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Title</Label>
                        <input
                          className={inputCls}
                          value={block.title}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], title: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <textarea
                          className={textareaCls}
                          rows={2}
                          value={block.description}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], description: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(block.cards ?? []).map((card, cardIndex) => (
                        <div key={`${key}-${cardIndex}`} className={`grid ${cardGridClass} gap-3 rounded-sm border border-white/8 p-3`}>
                          <div className={descriptionSpanClass}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] tracking-widest uppercase text-white/30">
                                Card {cardIndex + 1}
                              </span>
                              <button
                                type="button"
                                className="text-[#ef4242]/70 hover:text-[#ef4242] text-[11px] cursor-pointer"
                                onClick={() =>
                                  setSiteContent((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      cards: (prev[key].cards ?? []).filter((_, index) => index !== cardIndex),
                                    },
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <div>
                            <Label>Card Title</Label>
                            <input
                              className={inputCls}
                              value={card.title}
                              onChange={(e) =>
                                setSiteContent((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    cards: (prev[key].cards ?? []).map((entry, index) =>
                                      index === cardIndex ? { ...entry, title: e.target.value } : entry
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Link</Label>
                            <input
                              className={inputCls}
                              value={card.href}
                              onChange={(e) =>
                                setSiteContent((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    cards: (prev[key].cards ?? []).map((entry, index) =>
                                      index === cardIndex ? { ...entry, href: e.target.value } : entry
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                          {showCountField && (
                            <div>
                              <Label>Count / Label</Label>
                              <input
                                className={inputCls}
                                value={card.count ?? ""}
                                onChange={(e) =>
                                  setSiteContent((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      cards: (prev[key].cards ?? []).map((entry, index) =>
                                        index === cardIndex ? { ...entry, count: e.target.value || undefined } : entry
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          )}
                          {showItemsField && (
                            <div>
                              <Label>Items</Label>
                              <StringChipEditor
                                items={card.items ?? []}
                                placeholder="Add a service tag"
                                onChange={(items) =>
                                  setSiteContent((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...prev[key],
                                      cards: (prev[key].cards ?? []).map((entry, index) =>
                                        index === cardIndex ? { ...entry, items } : entry
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          )}
                          <div className={descriptionSpanClass}>
                            <Label>Description</Label>
                            <textarea
                              className={textareaCls}
                              rows={2}
                              value={card.description}
                              onChange={(e) =>
                                setSiteContent((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    cards: (prev[key].cards ?? []).map((entry, index) =>
                                      index === cardIndex ? { ...entry, description: e.target.value } : entry
                                    ),
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`${btnOutline} cursor-pointer`}
                      onClick={() =>
                        setSiteContent((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            cards: [
                              ...(prev[key].cards ?? []),
                              {
                                title: "New Card",
                                description: "",
                                href: "/",
                                ...(showCountField ? { count: "" } : {}),
                                ...(showItemsField ? { items: [] } : {}),
                              },
                            ],
                          },
                        }))
                      }
                    >
                      + Add Card
                    </button>
                  </div>
                );
              })}

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Code Page Header</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Eyebrow</Label>
                    <input
                      className={inputCls}
                      value={siteContent.codePage.eyebrow}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          codePage: { ...prev.codePage, eyebrow: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <input
                      className={inputCls}
                      value={siteContent.codePage.title}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          codePage: { ...prev.codePage, title: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={siteContent.codePage.description}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          codePage: { ...prev.codePage, description: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Homepage Layout, Hero, and About</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label>Homepage Section Order</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeSectionOrder.join(", ")}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          homeSectionOrder: e.target.value
                            .split(",")
                            .map((item) => item.trim().toLowerCase())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="hero, stats, about, services, featured, clients, cta"
                    />
                  </div>
                  <div className="rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/35">
                    Valid keys: `hero`, `stats`, `about`, `services`, `featured`, `clients`, `cta`
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <Label>Hero Eyebrow</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.eyebrow}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, eyebrow: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Hero Title Primary</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.titlePrimary}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, titlePrimary: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Hero Title Accent</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.titleAccent}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, titleAccent: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Hero Description</Label>
                    <textarea
                      className={textareaCls}
                      rows={2}
                      value={siteContent.homeHero.description}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, description: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Hero Supporting Text</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.supportingText}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, supportingText: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Hero Location Text</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.locationText}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, locationText: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>Primary CTA Label</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.primaryCta.label}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, primaryCta: { ...prev.homeHero.primaryCta, label: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Primary CTA Link</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.primaryCta.href}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, primaryCta: { ...prev.homeHero.primaryCta, href: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Secondary CTA Label</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.secondaryCta.label}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, secondaryCta: { ...prev.homeHero.secondaryCta, label: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Secondary CTA Link</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.secondaryCta.href}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, secondaryCta: { ...prev.homeHero.secondaryCta, href: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Tertiary CTA Label</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.tertiaryCta.label}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, tertiaryCta: { ...prev.homeHero.tertiaryCta, label: e.target.value } } }))}
                    />
                  </div>
                  <div>
                    <Label>Tertiary CTA Link</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeHero.tertiaryCta.href}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeHero: { ...prev.homeHero, tertiaryCta: { ...prev.homeHero.tertiaryCta, href: e.target.value } } }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Hero Service Tags (one per line: Label | /link)</Label>
                  <textarea
                    className={textareaCls}
                    rows={5}
                    value={siteContent.homeHero.serviceTags.map((tag) => `${tag.label} | ${tag.href}`).join("\n")}
                    onChange={(e) =>
                      setSiteContent((prev) => ({
                        ...prev,
                        homeHero: {
                          ...prev.homeHero,
                          serviceTags: e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const [label, href] = line.split("|").map((part) => part.trim());
                              return { label: label || href || "Link", href: href || "/" };
                            }),
                        },
                      }))
                    }
                  />
                </div>

                <div className="border-t border-white/8 pt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <Label>About Eyebrow</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.eyebrow}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, eyebrow: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <Label>About Title</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.title}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, title: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>About Description</Label>
                    <textarea
                      className={textareaCls}
                      rows={4}
                      value={siteContent.homeAbout.description}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, description: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>About Supporting Text</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.supportingText}
                      onChange={(e) => setSiteContent((prev) => ({ ...prev, homeAbout: { ...prev.homeAbout, supportingText: e.target.value } }))}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>About Tags (comma-separated)</Label>
                    <input
                      className={inputCls}
                      value={siteContent.homeAbout.tags.join(", ")}
                      onChange={(e) =>
                        setSiteContent((prev) => ({
                          ...prev,
                          homeAbout: {
                            ...prev.homeAbout,
                            tags: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                          },
                        }))
                      }
                    />
                  </div>
                  {siteContent.homeAbout.images.map((image, index) => (
                    <React.Fragment key={`about-image-${index}`}>
                      <div>
                        <Label>About Image {index + 1} URL</Label>
                        <input
                          className={inputCls}
                          value={image.src}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              homeAbout: {
                                ...prev.homeAbout,
                                images: prev.homeAbout.images.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, src: e.target.value } : entry
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>About Image {index + 1} Alt</Label>
                        <input
                          className={inputCls}
                          value={image.alt ?? ""}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              homeAbout: {
                                ...prev.homeAbout,
                                images: prev.homeAbout.images.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, alt: e.target.value } : entry
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="lg:col-span-2">
                    <button
                      type="button"
                      className={`${btnOutline} cursor-pointer`}
                      onClick={() =>
                        setSiteContent((prev) => ({
                          ...prev,
                          homeAbout: {
                            ...prev.homeAbout,
                            images: [...prev.homeAbout.images, { src: "", alt: "" }],
                          },
                        }))
                      }
                    >
                      + Add About Image
                    </button>
                  </div>
                </div>
              </div>

              {([
                ["homeFeaturedWork", "Homepage: Featured Work", true],
                ["homeClients", "Homepage: Clients", false],
                ["homeCta", "Homepage: Newsletter CTA", true],
              ] as const).map(([key, label, showCtaFields]) => (
                <div key={key} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <p className="font-nord text-sm text-white">{label}</p>
                  <div className={`grid grid-cols-1 gap-3 ${showCtaFields ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                    <div>
                      <Label>Eyebrow</Label>
                      <input
                        className={inputCls}
                        value={siteContent[key].eyebrow}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], eyebrow: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <input
                        className={inputCls}
                        value={siteContent[key].title}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <textarea
                        className={textareaCls}
                        rows={2}
                        value={siteContent[key].description}
                        onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], description: e.target.value } }))}
                      />
                    </div>
                    {showCtaFields && (
                      <div>
                        <Label>CTA Label</Label>
                        <input
                          className={inputCls}
                          value={siteContent[key].ctaLabel ?? ""}
                          onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], ctaLabel: e.target.value } }))}
                        />
                      </div>
                    )}
                    {showCtaFields && (
                      <div>
                        <Label>CTA Link</Label>
                        <input
                          className={inputCls}
                          value={siteContent[key].ctaHref ?? ""}
                          onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], ctaHref: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Work Page</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <Label>Eyebrow</Label>
                    <input className={inputCls} value={siteContent.workPage.eyebrow} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, eyebrow: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Title</Label>
                    <input className={inputCls} value={siteContent.workPage.title} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, title: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <textarea className={textareaCls} rows={2} value={siteContent.workPage.description} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, description: e.target.value } }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  {(siteContent.workPage.cards ?? []).map((card, cardIndex) => (
                    <div key={`work-card-${cardIndex}`} className="grid grid-cols-1 gap-3 rounded-sm border border-white/8 p-3 lg:grid-cols-3">
                      <div className="lg:col-span-3 flex items-center justify-between">
                        <span className="text-[10px] tracking-widest uppercase text-white/30">Section {cardIndex + 1}</span>
                        <button
                          type="button"
                          className="text-[#ef4242]/70 hover:text-[#ef4242] text-[11px] cursor-pointer"
                          onClick={() => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).filter((_, index) => index !== cardIndex) } }))}
                        >
                          Remove
                        </button>
                      </div>
                      <div>
                        <Label>Section Title</Label>
                        <input className={inputCls} value={card.title} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).map((entry, index) => index === cardIndex ? { ...entry, title: e.target.value } : entry) } }))} />
                      </div>
                      <div>
                        <Label>Section Link</Label>
                        <input className={inputCls} value={card.href} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).map((entry, index) => index === cardIndex ? { ...entry, href: e.target.value } : entry) } }))} />
                      </div>
                      <div>
                        <Label>Items</Label>
                        <StringChipEditor
                          items={card.items ?? []}
                          placeholder="Add a linked item"
                          onChange={(items) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              workPage: {
                                ...prev.workPage,
                                cards: (prev.workPage.cards ?? []).map((entry, index) =>
                                  index === cardIndex ? { ...entry, items } : entry
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="lg:col-span-3">
                        <Label>Description</Label>
                        <textarea className={textareaCls} rows={2} value={card.description} onChange={(e) => setSiteContent((prev) => ({ ...prev, workPage: { ...prev.workPage, cards: (prev.workPage.cards ?? []).map((entry, index) => index === cardIndex ? { ...entry, description: e.target.value } : entry) } }))} />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${btnOutline} cursor-pointer`}
                  onClick={() =>
                    setSiteContent((prev) => ({
                      ...prev,
                      workPage: {
                        ...prev.workPage,
                        cards: [
                          ...(prev.workPage.cards ?? []),
                          { title: "New Section", description: "", href: "/", items: [] },
                        ],
                      },
                    }))
                  }
                >
                  + Add Work Section
                </button>
              </div>

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Page Headers</p>
                {([
                  ["publications", "Publications"],
                  ["articles", "Articles"],
                  ["contact", "Contact"],
                  ["resume", "Resume"],
                  ["subscribe", "Subscribe"],
                  ["unsubscribe", "Unsubscribe"],
                  ["minecraftMaps", "Minecraft Maps"],
                  ["events", "Events"],
                  ["thumbnailDesign", "Thumbnail Design"],
                  ["videoEditing", "Video Editing"],
                  ["webDevDesign", "Web Dev & Design"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="grid grid-cols-1 gap-3 rounded-sm border border-white/8 p-3 lg:grid-cols-3">
                    <div className="lg:col-span-3 text-[11px] tracking-widest uppercase text-white/35">{label}</div>
                    <div>
                      <Label>Eyebrow</Label>
                      <input className={inputCls} value={siteContent.pageHeaders[key].eyebrow} onChange={(e) => setSiteContent((prev) => ({ ...prev, pageHeaders: { ...prev.pageHeaders, [key]: { ...prev.pageHeaders[key], eyebrow: e.target.value } } }))} />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <input className={inputCls} value={siteContent.pageHeaders[key].title} onChange={(e) => setSiteContent((prev) => ({ ...prev, pageHeaders: { ...prev.pageHeaders, [key]: { ...prev.pageHeaders[key], title: e.target.value } } }))} />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <textarea className={textareaCls} rows={2} value={siteContent.pageHeaders[key].description} onChange={(e) => setSiteContent((prev) => ({ ...prev, pageHeaders: { ...prev.pageHeaders, [key]: { ...prev.pageHeaders[key], description: e.target.value } } }))} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                <p className="font-nord text-sm text-white">Footer</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <Label>Location Text</Label>
                    <input className={inputCls} value={siteContent.footer.locationText} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, locationText: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Status Label</Label>
                    <input className={inputCls} value={siteContent.footer.statusLabel} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, statusLabel: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Email Link</Label>
                    <input className={inputCls} value={siteContent.footer.emailHref} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, emailHref: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>GitHub Link</Label>
                    <input className={inputCls} value={siteContent.footer.githubHref} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, githubHref: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Copyright Text</Label>
                    <input className={inputCls} value={siteContent.footer.copyrightText} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, copyrightText: e.target.value } }))} />
                  </div>
                  <div className="lg:col-span-3">
                    <Label>Footer Blurb</Label>
                    <textarea className={textareaCls} rows={2} value={siteContent.footer.blurb} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, blurb: e.target.value } }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  {siteContent.footer.linkGroups.map((group, groupIndex) => (
                    <div key={`footer-group-${groupIndex}`} className="rounded-sm border border-white/8 p-3 space-y-3">
                      <div>
                        <Label>Group Title</Label>
                        <input className={inputCls} value={group.title} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, linkGroups: prev.footer.linkGroups.map((entry, index) => index === groupIndex ? { ...entry, title: e.target.value } : entry) } }))} />
                      </div>
                      {group.links.map((link, linkIndex) => (
                        <div key={`footer-link-${groupIndex}-${linkIndex}`} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <div>
                            <Label>Link Label</Label>
                            <input className={inputCls} value={link.label} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, linkGroups: prev.footer.linkGroups.map((entry, index) => index === groupIndex ? { ...entry, links: entry.links.map((entryLink, entryLinkIndex) => entryLinkIndex === linkIndex ? { ...entryLink, label: e.target.value } : entryLink) } : entry) } }))} />
                          </div>
                          <div>
                            <Label>Link URL</Label>
                            <input className={inputCls} value={link.href} onChange={(e) => setSiteContent((prev) => ({ ...prev, footer: { ...prev.footer, linkGroups: prev.footer.linkGroups.map((entry, index) => index === groupIndex ? { ...entry, links: entry.links.map((entryLink, entryLinkIndex) => entryLinkIndex === linkIndex ? { ...entryLink, href: e.target.value } : entryLink) } : entry) } }))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Bottom Links</Label>
                  <ActionLinkListEditor
                    items={siteContent.footer.bottomLinks}
                    onChange={(bottomLinks) =>
                      setSiteContent((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          bottomLinks,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              {([
                ["termsPage", "Terms Page"],
                ["privacyPage", "Privacy Page"],
              ] as const).map(([key, label]) => (
                <div key={key} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <p className="font-nord text-sm text-white">{label}</p>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div>
                      <Label>Eyebrow</Label>
                      <input className={inputCls} value={siteContent[key].eyebrow} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], eyebrow: e.target.value } }))} />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <input className={inputCls} value={siteContent[key].title} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))} />
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <input className={inputCls} value={siteContent[key].lastUpdated} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], lastUpdated: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {siteContent[key].sections.map((section, sectionIndex) => (
                      <div key={`${key}-section-${sectionIndex}`} className="rounded-sm border border-white/8 p-3 space-y-3">
                        <div>
                          <Label>Section Heading</Label>
                          <input className={inputCls} value={section.heading} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], sections: prev[key].sections.map((entry, index) => index === sectionIndex ? { ...entry, heading: e.target.value } : entry) } }))} />
                        </div>
                        <div>
                          <Label>Section Body</Label>
                          <textarea className={textareaCls} rows={3} value={section.body} onChange={(e) => setSiteContent((prev) => ({ ...prev, [key]: { ...prev[key], sections: prev[key].sections.map((entry, index) => index === sectionIndex ? { ...entry, body: e.target.value } : entry) } }))} />
                        </div>
                        <div>
                          <Label>Bullets</Label>
                          <StringChipEditor
                            items={section.bullets ?? []}
                            placeholder="Add a bullet"
                            onChange={(bullets) =>
                              setSiteContent((prev) => ({
                                ...prev,
                                [key]: {
                                  ...prev[key],
                                  sections: prev[key].sections.map((entry, index) =>
                                    index === sectionIndex ? { ...entry, bullets } : entry
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === "campaigns" && (
            <div className="space-y-4">
              <div className="border border-white/8 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Subject</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Type</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Status</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Recipients</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden sm:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">
                          <div className="flex flex-col gap-1">
                            <span>{c.subject || "SMS Message"}</span>
                            {c.type === "email" && c.recipients > 0 && (
                              <span className="text-[10px] text-white/25">
                                Sent {campaignDeliveredCount(c)} / {c.recipients}
                              </span>
                            )}
                            {c.scheduledFor && c.status === "scheduled" && (
                              <span className="text-[10px] text-white/25">Scheduled {fmtDateTime(c.scheduledFor)}</span>
                            )}
                            {c.lastError && (
                              <span className="text-[10px] text-[#ef4242]/80">{c.lastError}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-sm ${c.type === "email" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <CampaignStatusBadge status={c.status} />
                        </td>
                        <td className="px-3 py-2.5 text-white/40 hidden md:table-cell">{c.recipients}</td>
                        <td className="px-3 py-2.5 text-white/30 hidden sm:table-cell">{fmtDateTime(c.sentAt || c.scheduledFor || c.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-2">
                            <button className={btnGhost} onClick={() => setCampaignView(c)}>View</button>
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "campaign", id: c.id, label: c.subject || "SMS Message" })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-white/25 text-xs">No messages yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────
              RESUME
          ───────────────────────────────────── */}
          {activeSection === "rizz" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  className={`${inputCls} max-w-xs`}
                  placeholder="Search rizz submissions..."
                  value={rizzSearch}
                  onChange={(e) => setRizzSearch(e.target.value)}
                />
                <select
                  className={`${inputCls} max-w-[170px]`}
                  value={rizzSort}
                  onChange={(e) => setRizzSort(e.target.value as typeof rizzSort)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                </select>
                <span className="text-xs text-white/30 self-center ml-auto">{filteredRizzEntries.length} entries</span>
              </div>
              <div className="border border-white/8 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/2 border-b border-white/8">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Name</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Nickname</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Phone</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Date Idea</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden md:table-cell">Vibe</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden xl:table-cell">Activity</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35">Wins Over</th>
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden lg:table-cell">Date</th>
                      <th className="px-3 py-2.5 text-right text-[10px] tracking-widest uppercase text-white/35">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRizzEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">
                          <div>{entry.name}</div>
                          <div className="text-[10px] text-white/25 lg:hidden">{entry.nickname}</div>
                        </td>
                        <td className="px-3 py-2.5 text-white/45 hidden lg:table-cell">{entry.nickname}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden xl:table-cell">{entry.phone}</td>
                        <td className="px-3 py-2.5 text-white/40 hidden md:table-cell">{humanizeChoiceList(entry.dateIdeas ?? (entry.dateIdea ? [entry.dateIdea] : []))}</td>
                        <td className="px-3 py-2.5 text-white/40 hidden md:table-cell">{humanizeChoiceList(entry.vibes ?? (entry.vibe ? [entry.vibe] : []))}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden xl:table-cell">{humanizeChoiceList(entry.activities ?? (entry.activity ? [entry.activity] : []))}</td>
                        <td className="px-3 py-2.5 text-white/60">
                          <div>{humanizeChoiceList(entry.winOvers ?? (entry.winOver ? [entry.winOver] : []))}</div>
                          {(entry.winOvers?.includes("other") || entry.winOver === "other") && entry.winOverOther && (
                            <div className="text-[10px] text-white/25">{entry.winOverOther}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-white/30 hidden lg:table-cell">{fmtDate(entry.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end">
                            <button
                              className={btnOutlineRed}
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "rizz",
                                  id: entry.id,
                                  label: `${entry.name} (${entry.nickname})`,
                                })
                              }
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRizzEntries.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-white/25 text-xs">
                          No rizz submissions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "resume" && (
            <div className="space-y-6">
              {!resumeLoaded ? (
                <p className="text-white/30 text-xs">Loading resume data…</p>
              ) : (
                <>
                  <div className="flex gap-3">
                    <input
                      className={`${inputCls} max-w-sm`}
                      placeholder="Search resume..."
                      value={resumeSearch}
                      onChange={(e) => setResumeSearch(e.target.value)}
                    />
                    <span className="text-xs text-white/30 self-center ml-auto">
                      {filteredExperiences.length + filteredEducations.length + filteredSkillsList.length + filteredCertificationsList.length + filteredAwardsList.length + filteredClubsList.length} matches
                    </span>
                  </div>
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-nord text-sm text-white">Edit Resume Content</p>
                        <p className="text-xs text-white/35">Saved to MongoDB and used by the public resume page.</p>
                      </div>
                      <button className={btnRed} onClick={() => void persistResume()} disabled={resumeSaving}>
                        {resumeSaving ? "Saving..." : "Save Resume Changes"}
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Experience</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button
                          className={btnOutline}
                          onClick={() =>
                            setExperiences((prev) => [
                              ...prev,
                              { id: uid(), type: "job", companyName: "", role: "", startDate: "", description: "" },
                            ])
                          }
                        >
                          + Add Experience
                        </button>
                      </div>
                      {experiences.map((exp, idx) => (
                        <div
                          key={exp.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "experiences", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("experiences", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 space-y-3 cursor-move"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] tracking-widest uppercase text-white/35">{exp.id || "new-entry"}</span>
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input className={inputCls} value={exp.id} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                            <select className={inputCls} value={exp.type} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, type: e.target.value as Experience["type"] } : item)))}><option value="job">Job</option><option value="volunteer">Volunteer</option><option value="renowned">Renowned</option></select>
                            <input className={inputCls} value={exp.companyName} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, companyName: e.target.value } : item)))} placeholder="Company name" />
                            <input className={inputCls} value={exp.role} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, role: e.target.value } : item)))} placeholder="Role" />
                            <input className={inputCls} value={exp.startDate} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, startDate: e.target.value } : item)))} placeholder="MM-YYYY" />
                            <input className={inputCls} value={exp.endDate ?? ""} disabled={!!exp.current} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, endDate: e.target.value || undefined } : item)))} placeholder="MM-YYYY" />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-white/50">
                            <input type="checkbox" className="accent-[#ef4242]" checked={!!exp.current} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, current: e.target.checked, endDate: e.target.checked ? undefined : item.endDate } : item)))} />
                            Current role
                          </label>
                          {clients.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] tracking-widest uppercase text-white/35">
                                Linked Clients
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {clients.map((client) => {
                                  const isLinked = exp.clientIds?.includes(client.id) ?? false;
                                  return (
                                    <button
                                      key={`${exp.id}-${client.id}`}
                                      type="button"
                                      onClick={() => toggleExperienceClientLink(idx, client.id)}
                                      className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                                        isLinked
                                          ? "border-[#ef4242]/30 bg-[#ef4242]/10 text-[#ef4242]"
                                          : "border-white/10 bg-white/[0.02] text-white/35 hover:border-white/20 hover:text-white/60"
                                      }`}
                                    >
                                      {client.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <textarea className={textareaCls} rows={3} value={exp.description} onChange={(e) => setExperiences((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item)))} placeholder="Description" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Education</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button
                          className={btnOutline}
                          onClick={() =>
                            setEducations((prev) => [
                              ...prev,
                              { id: uid(), institution: "", degree: "", startDate: "", description: "" },
                            ])
                          }
                        >
                          + Add Education
                        </button>
                      </div>
                      {educations.map((education, idx) => (
                        <div
                          key={education.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "educations", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("educations", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 space-y-3 cursor-move"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] tracking-widest uppercase text-white/35">{education.id || "new-entry"}</span>
                            <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setEducations((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input className={inputCls} value={education.id} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                            <input className={inputCls} value={education.institution} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, institution: e.target.value } : item)))} placeholder="Institution" />
                            <input className={inputCls} value={education.degree} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, degree: e.target.value } : item)))} placeholder="Degree" />
                            <input className={inputCls} value={education.field ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, field: e.target.value || undefined } : item)))} placeholder="Field of study" />
                            <input className={inputCls} value={education.startDate} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, startDate: e.target.value } : item)))} placeholder="MM-YYYY" />
                            <input className={inputCls} value={education.endDate ?? ""} disabled={!!education.current} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, endDate: e.target.value || undefined } : item)))} placeholder="MM-YYYY" />
                            <input className={inputCls} value={education.location ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, location: e.target.value || undefined } : item)))} placeholder="Location" />
                            <input className={inputCls} value={education.gpa ?? ""} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, gpa: e.target.value || undefined } : item)))} placeholder="GPA (optional)" />
                          </div>
                          <textarea
                            className={textareaCls}
                            rows={2}
                            value={education.description ?? ""}
                            onChange={(e) =>
                              setEducations((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, description: e.target.value || undefined } : item
                                )
                              )
                            }
                            placeholder="Description (shown on resume page)"
                          />
                          <label className="flex items-center gap-2 text-xs text-white/50">
                            <input type="checkbox" className="accent-[#ef4242]" checked={!!education.current} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, current: e.target.checked, endDate: e.target.checked ? undefined : item.endDate } : item)))} />
                            Currently enrolled
                          </label>
                          <textarea className={textareaCls} rows={3} value={(education.highlights ?? []).join("\n")} onChange={(e) => setEducations((prev) => prev.map((item, i) => (i === idx ? { ...item, highlights: e.target.value.split("\n").map((line) => line.trim()).filter(Boolean) || undefined } : item)))} placeholder="Highlights (one per line)" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Skills</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag rows to reorder. Pick a category from the dropdown.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setSkills((prev) => [...prev, { name: "", category: "technology" }])}>+ Add Skill</button>
                      </div>
                      {skills.map((skill, idx) => (
                        <div
                          key={`${skill.name}-${idx}`}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "skills", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("skills", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="grid grid-cols-[1fr_180px_auto] gap-3 items-center cursor-move"
                        >
                          <input className={inputCls} value={skill.name} onChange={(e) => setSkills((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Skill" />
                          <select
                            className={inputCls}
                            value={skill.category}
                            onChange={(e) =>
                              setSkills((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, category: e.target.value } : item
                                )
                              )
                            }
                          >
                            {[...SKILL_CATEGORY_OPTIONS, ...(SKILL_CATEGORY_OPTIONS.includes(skill.category as typeof SKILL_CATEGORY_OPTIONS[number]) ? [] : [skill.category])]
                              .filter(Boolean)
                              .map((option) => (
                                <option key={option} value={option}>
                                  {option.charAt(0).toUpperCase() + option.slice(1)}
                                </option>
                              ))}
                          </select>
                          <button className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Certifications</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setCertifications((prev) => [...prev, { id: uid(), name: "", issuer: "", date: "", credentialUrl: "" }])}>+ Add Certification</button>
                      </div>
                      {certifications.map((cert, idx) => (
                        <div
                          key={cert.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "certifications", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("certifications", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 grid grid-cols-2 gap-3 cursor-move"
                        >
                          <input className={inputCls} value={cert.id} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                          <input className={inputCls} value={cert.date} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, date: e.target.value } : item)))} placeholder="MM-YYYY" />
                          <input className={inputCls} value={cert.name} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Name" />
                          <input className={inputCls} value={cert.issuer} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, issuer: e.target.value } : item)))} placeholder="Issuer" />
                          <input className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 h-9 text-sm text-white outline-none placeholder-white/25 transition-colors" value={cert.credentialUrl ?? ""} onChange={(e) => setCertifications((prev) => prev.map((item, i) => (i === idx ? { ...item, credentialUrl: e.target.value || undefined } : item)))} placeholder="Credential URL" />
                          <button className="col-span-2 text-left text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Awards</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setAwards((prev) => [...prev, { id: uid(), name: "", date: "" }])}>+ Add Award</button>
                      </div>
                      {awards.map((award, idx) => (
                        <div
                          key={award.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "awards", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("awards", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 grid grid-cols-2 gap-3 cursor-move"
                        >
                          <input className={inputCls} value={award.id} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                          <input className={inputCls} value={award.date} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, date: e.target.value } : item)))} placeholder="MM-YYYY" />
                          <input className={inputCls} value={award.name} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Name" />
                          <input className={inputCls} value={award.issuer ?? ""} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, issuer: e.target.value || undefined } : item)))} placeholder="Issuer" />
                          <textarea className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none" rows={2} value={award.description ?? ""} onChange={(e) => setAwards((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value || undefined } : item)))} placeholder="Description" />
                          <button className="col-span-2 text-left text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setAwards((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-nord text-xs text-white">Organizations</p>
                          <p className="text-[10px] text-white/25 mt-1">Drag cards to reorder.</p>
                        </div>
                        <button className={btnOutline} onClick={() => setClubs((prev) => [...prev, { id: uid(), name: "" }])}>+ Add Organization</button>
                      </div>
                      {clubs.map((club, idx) => (
                        <div
                          key={club.id}
                          draggable
                          onDragStart={() => setDraggedResumeItem({ list: "clubs", index: idx })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleResumeDrop("clubs", idx)}
                          onDragEnd={() => setDraggedResumeItem(null)}
                          className="border border-white/6 rounded-sm p-4 grid grid-cols-2 gap-3 cursor-move"
                        >
                          <input className={inputCls} value={club.id} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, id: e.target.value } : item)))} placeholder="ID" />
                          <input className={inputCls} value={club.name} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} placeholder="Name" />
                          <input className={inputCls} value={club.role ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, role: e.target.value || undefined } : item)))} placeholder="Role" />
                          <input className={inputCls} value={club.url ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, url: e.target.value || undefined } : item)))} placeholder="URL" />
                          <input className={inputCls} value={club.startDate ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, startDate: e.target.value || undefined } : item)))} placeholder="MM-YYYY" />
                          <input className={inputCls} value={club.endDate ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, endDate: e.target.value || undefined } : item)))} placeholder="MM-YYYY" />
                          <textarea className="col-span-2 w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 py-2 text-sm text-white outline-none placeholder-white/25 transition-colors resize-none" rows={2} value={club.description ?? ""} onChange={(e) => setClubs((prev) => prev.map((item, i) => (i === idx ? { ...item, description: e.target.value || undefined } : item)))} placeholder="Description" />
                          <button className="col-span-2 text-left text-[#ef4242]/60 hover:text-[#ef4242] text-xs" onClick={() => setClubs((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Work Experience */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Work Experience</p>
                    {filteredExperiences.filter((e) => e.type === "job").map((exp) => (
                      <div key={exp.id} className="border border-white/6 rounded-sm p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white font-medium">{exp.role}</p>
                            <p className="text-xs text-white/50">{exp.companyName}</p>
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {exp.startDate} – {exp.current ? "Present" : (exp.endDate ?? "—")}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-white/35 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                    {filteredExperiences.filter((e) => e.type === "job").length === 0 && (
                      <p className="text-xs text-white/25">No work experience yet.</p>
                    )}
                  </div>

                  {/* Volunteer */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Volunteer</p>
                    {filteredExperiences.filter((e) => e.type === "volunteer").map((exp) => (
                      <div key={exp.id} className="border border-white/6 rounded-sm p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white font-medium">{exp.role}</p>
                            <p className="text-xs text-white/50">{exp.companyName}</p>
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {exp.startDate} – {exp.current ? "Present" : (exp.endDate ?? "—")}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-white/35 line-clamp-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                    {filteredExperiences.filter((e) => e.type === "volunteer").length === 0 && (
                      <p className="text-xs text-white/25">No volunteer work yet.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Education</p>
                    {filteredEducations.map((education) => (
                      <div key={education.id} className="border border-white/6 rounded-sm p-4 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm text-white font-medium">{education.degree}</p>
                            <p className="text-xs text-white/50">{education.institution}</p>
                          </div>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {education.startDate} â€“ {education.current ? "Present" : (education.endDate ?? "â€”")}
                          </span>
                        </div>
                        {education.field && (
                          <p className="text-xs text-white/35">{education.field}</p>
                        )}
                        {education.description && (
                          <p className="text-xs text-white/35 leading-relaxed">{education.description}</p>
                        )}
                      </div>
                    ))}
                    {filteredEducations.length === 0 && (
                      <p className="text-xs text-white/25">No education yet.</p>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                    <p className="font-nord text-sm text-white mb-3">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSkillsList.map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          className="px-2.5 py-1 text-[11px] rounded-sm bg-white/6 text-white/60 border border-white/8"
                        >
                          {s.name}
                        </span>
                      ))}
                      {filteredSkillsList.length === 0 && <p className="text-xs text-white/25">No skills yet.</p>}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Certifications</p>
                    {filteredCertificationsList.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{cert.name}</p>
                          <p className="text-xs text-white/45">{cert.issuer}</p>
                        </div>
                        <span className="text-[10px] text-white/30">{cert.date}</span>
                      </div>
                    ))}
                    {filteredCertificationsList.length === 0 && <p className="text-xs text-white/25">No certifications yet.</p>}
                  </div>

                  {/* Awards */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Awards</p>
                    {filteredAwardsList.map((award) => (
                      <div key={award.id} className="flex items-center justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{award.name}</p>
                          {award.issuer && <p className="text-xs text-white/45">{award.issuer}</p>}
                          {award.description && <p className="text-xs text-white/30 line-clamp-1">{award.description}</p>}
                        </div>
                        <span className="text-[10px] text-white/30">{award.date}</span>
                      </div>
                    ))}
                    {filteredAwardsList.length === 0 && <p className="text-xs text-white/25">No awards yet.</p>}
                  </div>

                  {/* Organizations */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Organizations</p>
                    {filteredClubsList.map((club) => (
                      <div key={club.id} className="flex items-start justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{club.name}</p>
                          {club.role && <p className="text-xs text-white/45">{club.role}</p>}
                          {club.description && <p className="text-xs text-white/30 line-clamp-1">{club.description}</p>}
                        </div>
                        <span className="text-[10px] text-white/30">
                          {club.startDate ?? "—"}{club.endDate ? ` – ${club.endDate}` : ""}
                        </span>
                      </div>
                    ))}
                    {filteredClubsList.length === 0 && <p className="text-xs text-white/25">No organizations yet.</p>}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ── MODALS ── */}
      {projectModal.open && (
        <ProjectModal
          initial={projectModal.editing}
          clients={clients}
          onClose={() => setProjectModal({ open: false })}
          onSave={saveProject}
        />
      )}

      {articleModal.open && (
        <ArticleModal
          initial={articleModal.editing}
          onClose={() => setArticleModal({ open: false })}
          onSave={saveArticle}
        />
      )}

      {clientModal.open && (
        <ClientModal
          initial={clientModal.editing}
          projects={projects}
          onClose={() => setClientModal({ open: false })}
          onSave={saveClient}
        />
      )}

      {contactModal.open && (
        <ContactEditorModal
          initial={contactModal.editing ?? undefined}
          onClose={() => setContactModal({ open: false })}
          onSave={saveContact}
        />
      )}

      {campaignModal.open && (
        <CampaignModal
          initial={campaignModal.editing}
          contacts={contacts}
          onClose={() => setCampaignModal({ open: false })}
          onSave={saveCampaign}
        />
      )}

      {campaignView && (
        <CampaignViewModal
          campaign={campaignView}
          contacts={contacts}
          onSendBatch={(campaign, count) => saveCampaign(campaign, "send", count)}
          onClose={() => setCampaignView(null)}
        />
      )}

      {deleteConfirm && (
        <DeleteDialog
          label={deleteConfirm.label}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}

      {r2PreviewFile && (
        <Modal
          title={r2PreviewFile.name}
          onClose={() => setR2PreviewFile(null)}
          wide
        >
          <div className="space-y-4 p-6">
            <div className="overflow-hidden rounded-sm border border-white/8 bg-black/30">
              <img
                src={r2PreviewFile.publicUrl}
                alt={r2PreviewFile.name}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/35">
              <span className="truncate">{r2PreviewFile.key}</span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={r2PreviewFile.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnOutline}
                >
                  Open
                </a>
                <button
                  className={`${btnOutline} cursor-pointer`}
                  onClick={() => void copyR2Link(r2PreviewFile.publicUrl)}
                >
                  {r2CopiedUrl === r2PreviewFile.publicUrl ? "Copied." : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {siteContentImageTarget && (
        <R2ImagePickerModal
          title={
            siteContentImageTarget === "brandLogoUrl"
              ? "Select Shared Logo"
              : "Select Favicon"
          }
          onClose={() => setSiteContentImageTarget(null)}
          onSelect={(url) => {
            setSiteContent((prev) => ({
              ...prev,
              [siteContentImageTarget]: url,
            }));
            setSiteContentImageTarget(null);
          }}
        />
      )}
    </div>
  );
}
