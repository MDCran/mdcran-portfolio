"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TapsChart from "@/components/admin/TapsChart";
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
  RizzSubmission,
} from "@/lib/types";

/* ─── Local-only types ───────────────────────────────────── */
type Contact = ContactSubmission;
type RizzEntry = RizzSubmission;
type Campaign = StoredCampaign;
type MetricsAuditTarget = "project-views";
type MetricsAuditResponse = {
  lines?: string[];
  totalProjectViews?: number;
  refreshedAt?: string;
};

type NavSection =
  | "dashboard"
  | "projects"
  | "articles"
  | "clients"
  | "resume"
  | "contacts"
  | "campaigns"
  | "rizz";

const SKILL_CATEGORY_OPTIONS = ["technology", "creative", "languages", "other"] as const;

/* ─── Utility helpers ─────────────────────────────────────── */
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
}

/* ─── Shared UI primitives ───────────────────────────────── */
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
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(initial?.images?.length ? initial.images : [""]);
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
  const [sections, setSections] = useState<ArticleSection[]>(initial?.sections ?? []);
  const [errors, setErrors] = useState<string[]>([]);

  function validate() {
    const e: string[] = [];
    if (!title.trim()) e.push("title");
    setErrors(e);
    return e.length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const finalSlug = slug.trim() || slugify(title);
    const images = galleryImages.map((s) => s.trim()).filter(Boolean);
    const cleanedVideos = videos
      .map((v) => ({ youtubeId: v.youtubeId.trim(), title: v.title.trim() }))
      .filter((v) => v.youtubeId);
    const cleanedCredits = credits
      .map((c) => ({ name: c.name.trim(), role: c.role.trim() }))
      .filter((c) => c.name && c.role);
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
      coverImage: coverImage.trim() || undefined,
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
      sections: sections.length ? sections : undefined,
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
      gallery: { type: "gallery", images: [""] },
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

  function updateGalleryImage(idx: number, value: string) {
    setGalleryImages((prev) => prev.map((image, i) => (i === idx ? value : image)));
  }

  function addGalleryImage() {
    setGalleryImages((prev) => [...prev, ""]);
  }

  function removeGalleryImage(idx: number) {
    setGalleryImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [""];
    });
  }

  function updateSectionGalleryImage(sectionIdx: number, imageIdx: number, value: string) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    const nextImages = (section.images ?? [""]).map((image, i) => (i === imageIdx ? value : image));
    updateSection(sectionIdx, { images: nextImages });
  }

  function addSectionGalleryImage(sectionIdx: number) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    updateSection(sectionIdx, { images: [...(section.images ?? []), ""] });
  }

  function removeSectionGalleryImage(sectionIdx: number, imageIdx: number) {
    const section = sections[sectionIdx];
    if (!section || section.type !== "gallery") return;
    const nextImages = (section.images ?? []).filter((_, i) => i !== imageIdx);
    updateSection(sectionIdx, { images: nextImages.length ? nextImages : [""] });
  }

  const isErr = (f: string) => errors.includes(f);

  return (
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
          <input className={inputCls} value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="/cdn/…/cover.png" />
        </Field>

        <Field>
          <Label>Gallery Images</Label>
          <div className="space-y-2">
            {galleryImages.map((image, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className={inputCls}
                  value={image}
                  onChange={(e) => updateGalleryImage(idx, e.target.value)}
                  placeholder="/cdn/.../image-1.png"
                />
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
                    <input className={inputCls} value={sec.src ?? ""} onChange={(e) => updateSection(idx, { src: e.target.value })} placeholder="Image URL" />
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
                      <div key={imageIdx} className="flex gap-2">
                        <input
                          className={inputCls}
                          value={image}
                          onChange={(e) => updateSectionGalleryImage(idx, imageIdx, e.target.value)}
                          placeholder="Gallery image URL"
                        />
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
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [sections, setSections] = useState<ArticleSection[]>(initial?.sections ?? []);
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
    const article: Article = {
      id: initial?.id ?? uid(),
      slug: finalSlug,
      title: title.trim(),
      excerpt: excerpt.trim(),
      coverImage: coverImage.trim() || undefined,
      author: author.trim() || "MDCran",
      publishDate: publishDate || new Date().toISOString().slice(0, 10),
      updatedDate: initial?.updatedDate,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      category,
      sections,
      featured,
    };
    onSave(article);
  }

  function addSection(type: ArticleSection["type"]) {
    const defaults: Record<ArticleSection["type"], ArticleSection> = {
      text: { type: "text", content: "" },
      image: { type: "image", src: "", alt: "", caption: "" },
      gallery: { type: "gallery", images: [] },
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

  const isErr = (f: string) => errors.includes(f);

  return (
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
          <input className={inputCls} value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="/cdn/…/cover.jpg" />
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
                    <input className={inputCls} value={sec.src ?? ""} onChange={(e) => updateSection(idx, { src: e.target.value })} placeholder="Image URL" />
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
                  <textarea
                    className={textareaCls}
                    rows={2}
                    value={(sec.images ?? []).join("\n")}
                    onChange={(e) => updateSection(idx, { images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="One image URL per line"
                  />
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
  const [roles, setRoles] = useState((initial?.roles ?? []).join(", "));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [followerCount, setFollowerCount] = useState(
    initial?.followerCount ? String(initial.followerCount) : ""
  );
  const [viewCount, setViewCount] = useState(
    initial?.viewCount ? String(initial.viewCount) : ""
  );
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
      followerCount: followerCount.trim() ? Number(followerCount.replace(/[^\d]/g, "")) : undefined,
      viewCount: viewCount.trim() ? Number(viewCount.replace(/[^\d]/g, "")) : undefined,
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

  const platforms: Platform[] = ["youtube", "twitch", "tiktok", "instagram", "facebook", "x", "github", "website", "spotify", "discord"];

  return (
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
            <input className={inputCls} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="/cdn/…/avatar.jpg" />
          </Field>
        </div>

        <Field>
          <Label>Roles</Label>
          <input className={inputCls} value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="YouTuber, Content Creator (comma-separated)" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Manual Followers / Subs</Label>
            <input
              className={inputCls}
              value={followerCount}
              onChange={(e) => setFollowerCount(e.target.value)}
              placeholder="450000000"
            />
          </Field>
          <Field>
            <Label>Manual Views</Label>
            <input
              className={inputCls}
              value={viewCount}
              onChange={(e) => setViewCount(e.target.value)}
              placeholder="Optional total views"
            />
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <input id="cli-featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#ef4242]" />
          <label htmlFor="cli-featured" className="text-xs text-white/60 select-none">Featured client</label>
        </div>

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
                  value={link.handle ?? ""}
                  onChange={(e) => updateSocialLink(idx, { handle: e.target.value })}
                  placeholder="@handle"
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
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN MODAL
═══════════════════════════════════════════════════════════ */
function CampaignModal({
  contacts,
  onClose,
  onSave,
}: {
  contacts: Contact[];
  onClose: () => void;
  onSave: (c: Campaign) => void;
}) {
  const [type, setType] = useState<CampaignType>("email");
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [recipientMode, setRecipientMode] = useState<"all" | "specific">("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

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

  function handleSave() {
    if (type === "email" && !subject.trim()) return;
    if (!message.trim()) return;
    if (recipientMode === "specific" && recipients === 0) return;

    const now = new Date().toISOString();
    onSave({
      id: uid(),
      type,
      subject: type === "email" ? subject.trim() : undefined,
      message: message.trim(),
      status,
      recipients,
      recipientMode,
      contactIds: recipientMode === "specific" ? selectedContactIds : undefined,
      attachments: attachments.length ? attachments : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return (
    <Modal title="New Message" onClose={onClose} wide>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Type</Label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </Field>
          <Field>
            <Label>Status</Label>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent</option>
            </select>
          </Field>
        </div>

        {type === "email" && (
          <Field>
            <Label required>Subject</Label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Campaign subject line" />
          </Field>
        )}

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
          <Label>Attachments</Label>
          <input
            type="file"
            multiple
            className="block w-full text-xs text-white/55 file:mr-3 file:h-9 file:px-3 file:border-0 file:rounded-sm file:bg-white/8 file:text-white file:text-xs"
            onChange={(e) =>
              setAttachments(Array.from(e.target.files ?? []).map((file) => file.name))
            }
          />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((file) => (
                <span key={file} className="px-2 py-1 rounded-sm bg-white/6 text-[10px] text-white/55">
                  {file}
                </span>
              ))}
            </div>
          )}
        </Field>

        <div className="text-xs text-white/40">
          Recipient count: {recipients}
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={`${btnRed} inline-flex items-center justify-center`} onClick={handleSave}>Create Message</button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");

  /* ── Data state ── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  const [articleSearch, setArticleSearch] = useState("");

  /* ── Modal state ── */
  const [projectModal, setProjectModal] = useState<{ open: boolean; editing?: Project }>({ open: false });
  const [articleModal, setArticleModal] = useState<{ open: boolean; editing?: Article }>({ open: false });
  const [clientModal, setClientModal] = useState<{ open: boolean; editing?: Client }>({ open: false });
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);

  /* ── Delete confirm ── */
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "project" | "article" | "client" | "contact" | "campaign" | "rizz"; id: string; label: string } | null>(null);

  /* ── API hydration ── */
  useEffect(() => {
    async function loadData() {
      try {
        const [pRes, aRes, cRes, contactsRes, campaignsRes, rizzRes, tapsRes] = await Promise.all([
          fetch("/api/admin/projects"),
          fetch("/api/admin/articles"),
          fetch("/api/admin/clients"),
          fetch("/api/admin/contacts"),
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
        if (contactsRes.ok) setContacts(await contactsRes.json());
        else setContacts([]);
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
        setContacts([]);
        setCampaigns([]);
        setRizzEntries([]);
        setTapCounts({});
      }
      setHydrated(true);
    }
    loadData();
  }, []);

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

  async function refreshProjectViewsAudit() {
    setProjectViewsRefreshing(true);
    setProjectViewsAuditLog(["Running project video scan..."]);

    try {
      const report = await runMetricsAudit("project-views");
      const lines = report.lines?.length ? report.lines : ["No output returned."];
      setProjectViewsAuditLog(lines);
      setProjectViewsAuditSummary({
        totalProjectViews: report.totalProjectViews ?? 0,
        refreshedAt: report.refreshedAt,
      });

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

  function deleteContact(id: string) {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      fetch("/api/admin/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(console.error);
      return next;
    });
  }

  function toggleContactSubscription(id: string) {
    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, subscribed: !c.subscribed } : c));
      fetch("/api/admin/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(console.error);
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
  });

  const filteredArticles = articles.filter((a) =>
    !articleSearch || a.title.toLowerCase().includes(articleSearch.toLowerCase())
  );

  /* ── Derived dashboard stats ── */

  /* ── Nav sections config ── */
  const navItems: { key: NavSection; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "projects", label: "Projects" },
    { key: "articles", label: "Articles" },
    { key: "clients", label: "Clients" },
    { key: "resume", label: "Resume" },
    { key: "contacts", label: "Contacts" },
    { key: "campaigns", label: "Send Message" },
    { key: "rizz", label: "Rizz" },
  ];

  const sectionTitles: Record<NavSection, string> = {
    dashboard: "Overview",
    projects: "Projects",
    articles: "Articles",
    clients: "Clients",
    resume: "Resume",
    contacts: "Contacts",
    campaigns: "Send Message",
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
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full text-left px-3 py-2 rounded-sm text-xs transition-colors ${
                activeSection === key
                  ? "text-[#ef4242] bg-[#ef4242]/8"
                  : "text-white/45 hover:text-white hover:bg-white/4"
              }`}
            >
              {label}
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
          <div className="flex items-center gap-3">
            <h1 className="font-nord text-lg text-white">{sectionTitles[activeSection]}</h1>
          </div>
          <div className="flex gap-3">
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
              <button className={btnRed} onClick={() => setCampaignModalOpen(true)}>+ Send Message</button>
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

              <TapsChart />

              <div className="grid grid-cols-1 gap-4">
                <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-nord text-sm text-white">Project Views Refresh</p>
                      <p className="text-xs text-white/35">Scans every linked project video, updates stored view counts, and shows the exact totals used.</p>
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
                        {(projectViewsAuditSummary?.totalProjectViews ?? projects.reduce((sum, project) => sum + (project.videos?.reduce((videoSum, video) => videoSum + (video.viewCount ?? 0), 0) ?? 0), 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-white/8 rounded-sm p-3">
                      <p className="text-[10px] tracking-widest uppercase text-white/35 mb-1">Last Refresh</p>
                      <p className="text-xs text-white/55">
                        {projectViewsAuditSummary?.refreshedAt ? fmtDate(projectViewsAuditSummary.refreshedAt) : "Not run yet"}
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
                            <img src={p.coverImage} alt="" className="w-10 h-[30px] object-cover rounded-sm opacity-80" />
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
                      <th className="px-3 py-2.5 text-left text-[10px] tracking-widest uppercase text-white/35 hidden sm:table-cell">Date</th>
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
            <div className="grid grid-cols-3 gap-4">
              {clients.map((c) => (
                <div key={c.id} className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-9 h-9 rounded-full object-cover opacity-90" />
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
              {clients.length === 0 && (
                <div className="col-span-3 text-center py-12 text-white/25 text-xs">No clients yet.</div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────
              CONTACTS
          ───────────────────────────────────── */}
          {activeSection === "contacts" && (
            <div className="space-y-4">
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
                    {contacts.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-3 py-2.5 text-white/75">{c.name}</td>
                        <td className="px-3 py-2.5 text-white/45 hidden md:table-cell">{c.email || "-"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden lg:table-cell">{c.phone || "—"}</td>
                        <td className="px-3 py-2.5 text-white/35 hidden md:table-cell">{c.source || "-"}</td>
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
                          <div className="flex justify-end">
                            <button className={btnOutlineRed} onClick={() => setDeleteConfirm({ type: "contact", id: c.id, label: c.name })}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {contacts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-white/25 text-xs">
                          No contacts yet.
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
                        <td className="px-3 py-2.5 text-white/75">{c.subject || "SMS Message"}</td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className={`text-[10px] px-2 py-0.5 rounded-sm ${c.type === "email" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <CampaignStatusBadge status={c.status} />
                        </td>
                        <td className="px-3 py-2.5 text-white/40 hidden md:table-cell">{c.recipients}</td>
                        <td className="px-3 py-2.5 text-white/30 hidden sm:table-cell">{fmtDate(c.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end">
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
                    {rizzEntries.map((entry) => (
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
                    {rizzEntries.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-8 text-center text-white/25 text-xs">
                          No rizz submissions yet.
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
                    {experiences.filter((e) => e.type === "job").map((exp) => (
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
                    {experiences.filter((e) => e.type === "job").length === 0 && (
                      <p className="text-xs text-white/25">No work experience yet.</p>
                    )}
                  </div>

                  {/* Volunteer */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Volunteer</p>
                    {experiences.filter((e) => e.type === "volunteer").map((exp) => (
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
                    {experiences.filter((e) => e.type === "volunteer").length === 0 && (
                      <p className="text-xs text-white/25">No volunteer work yet.</p>
                    )}
                  </div>

                  {/* Education */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Education</p>
                    {educations.map((education) => (
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
                    {educations.length === 0 && (
                      <p className="text-xs text-white/25">No education yet.</p>
                    )}
                  </div>

                  {/* Skills */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5">
                    <p className="font-nord text-sm text-white mb-3">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          className="px-2.5 py-1 text-[11px] rounded-sm bg-white/6 text-white/60 border border-white/8"
                        >
                          {s.name}
                        </span>
                      ))}
                      {skills.length === 0 && <p className="text-xs text-white/25">No skills yet.</p>}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Certifications</p>
                    {certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{cert.name}</p>
                          <p className="text-xs text-white/45">{cert.issuer}</p>
                        </div>
                        <span className="text-[10px] text-white/30">{cert.date}</span>
                      </div>
                    ))}
                    {certifications.length === 0 && <p className="text-xs text-white/25">No certifications yet.</p>}
                  </div>

                  {/* Awards */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Awards</p>
                    {awards.map((award) => (
                      <div key={award.id} className="flex items-center justify-between border border-white/6 rounded-sm px-4 py-3">
                        <div>
                          <p className="text-sm text-white font-medium">{award.name}</p>
                          {award.issuer && <p className="text-xs text-white/45">{award.issuer}</p>}
                          {award.description && <p className="text-xs text-white/30 line-clamp-1">{award.description}</p>}
                        </div>
                        <span className="text-[10px] text-white/30">{award.date}</span>
                      </div>
                    ))}
                    {awards.length === 0 && <p className="text-xs text-white/25">No awards yet.</p>}
                  </div>

                  {/* Organizations */}
                  <div className="border border-white/7 bg-white/2 rounded-sm p-5 space-y-3">
                    <p className="font-nord text-sm text-white mb-3">Organizations</p>
                    {clubs.map((club) => (
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
                    {clubs.length === 0 && <p className="text-xs text-white/25">No organizations yet.</p>}
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

      {campaignModalOpen && (
        <CampaignModal
          contacts={contacts}
          onClose={() => setCampaignModalOpen(false)}
          onSave={(c) => {
            setCampaigns((prev) => {
              const next = [c, ...prev];
              fetch("/api/admin/campaigns", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(next),
              }).catch(console.error);
              return next;
            });
            setCampaignModalOpen(false);
          }}
        />
      )}

      {deleteConfirm && (
        <DeleteDialog
          label={deleteConfirm.label}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
