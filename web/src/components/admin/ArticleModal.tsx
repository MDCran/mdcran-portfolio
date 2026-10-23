"use client";
import { useState } from "react";









import ImageTagsEditor from "@/components/admin/ImageTagsEditor";
import DatePicker from "@/components/shared/DatePicker";





import type { Article, ArticleSection, ArticleCategory, ImageAsset } from "@/lib/types";






import { slugify, uid, toEditableImageAsset, cleanImageAsset, normalizeSectionForEditor, normalizeSectionForSave, arrayMove, inputCls, textareaCls, labelCls, btnRed, btnGhost, btnOutline, Label, Field, Modal } from './AdminShared';
import R2ImagePickerModal from './R2ImagePickerModal';
export default function ArticleModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Article;
  onClose: () => void;
  onSave: (a: Article, action?: "save" | "draft") => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "MDCran");
  const [publishDate, setPublishDate] = useState(initial?.publishDate ?? "");
  const [category, setCategory] = useState<ArticleCategory>(initial?.category ?? "tech");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [homeFeatured, setHomeFeatured] = useState(initial?.homeFeatured ?? false);
  const [visible, setVisible] = useState(initial?.visible !== false);
  const [coverImage, setCoverImage] = useState<ImageAsset>(() => toEditableImageAsset(initial?.coverImage));
  const [sections, setSections] = useState<ArticleSection[]>(
    () => (initial?.sections ?? []).map((section) => normalizeSectionForEditor(section))
  );
  const [sectionDragIdx, setSectionDragIdx] = useState<number | null>(null);
  const [sectionDropIdx, setSectionDropIdx] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [imagePickerTarget, setImagePickerTarget] = useState<
    | null
    | { kind: "cover" }
    | { kind: "section-image"; sectionIndex: number }
    | { kind: "section-gallery"; sectionIndex: number; imageIndex: number }
    | { kind: "section-before"; sectionIndex: number }
    | { kind: "section-after"; sectionIndex: number }
  >(null);

  function applySelectedImage(url: string) {
    if (!imagePickerTarget) return;
    if (imagePickerTarget.kind === "cover") {
      setCoverImage((prev) => ({ ...prev, src: url }));
    } else if (imagePickerTarget.kind === "section-image") {
      updateSection(imagePickerTarget.sectionIndex, { src: url });
    } else if (imagePickerTarget.kind === "section-gallery") {
      updateSectionGalleryImage(imagePickerTarget.sectionIndex, imagePickerTarget.imageIndex, { src: url });
    } else if (imagePickerTarget.kind === "section-before") {
      const sec = sections[imagePickerTarget.sectionIndex];
      const existing = typeof sec?.beforeImage === "object" ? sec.beforeImage : {};
      updateSection(imagePickerTarget.sectionIndex, { beforeImage: { ...existing, src: url } as ImageAsset });
    } else if (imagePickerTarget.kind === "section-after") {
      const sec = sections[imagePickerTarget.sectionIndex];
      const existing = typeof sec?.afterImage === "object" ? sec.afterImage : {};
      updateSection(imagePickerTarget.sectionIndex, { afterImage: { ...existing, src: url } as ImageAsset });
    }
    setImagePickerTarget(null);
  }

  function validate() {
    const e: string[] = [];
    if (!title.trim()) e.push("title");
    if (!excerpt.trim()) e.push("excerpt");
    setErrors(e);
    return e.length === 0;
  }

  function handleSave(action: "save" | "draft" = "save") {
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
      updatedDate: initial ? new Date().toISOString().slice(0, 10) : undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      category,
      sections: cleanedSections,
      featured,
      homeFeatured,
      visible,
      tapCount: initial?.tapCount,
      authorProfilePic: initial?.authorProfilePic,
    };
    onSave(article, action);
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
      "before-after": { type: "before-after", beforeImage: { src: "", alt: "" }, afterImage: { src: "", alt: "" }, caption: "" },
      button: { type: "button", label: "", content: "", caption: "" },
      pdf: { type: "pdf", src: "", caption: "", pdfWidth: "100%", pdfHeight: "600px" },
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
    <Modal title={initial ? "Edit Article" : "New Article"} onClose={onClose} wide fullPage>
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
            <DatePicker value={publishDate} onChange={setPublishDate} />
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
          <div className="flex items-start gap-3">
            {coverImage.src && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={coverImage.src.startsWith("/cdn/") ? `https://cdn.mdcran.com${coverImage.src.slice(4)}` : coverImage.src} alt="" className="w-16 h-16 rounded-sm object-cover border border-white/10 shrink-0 bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div className="flex-1 grid grid-cols-[1.6fr_1fr_auto] gap-2">
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
          </div>
        </Field>

        <div className="flex items-center gap-2 flex-wrap">
          <input id="art-visible" type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="accent-emerald-400" />
          <label htmlFor="art-visible" className="text-xs text-white/60 select-none">Visible on site</label>
          <span className="mx-2" />
          <input id="art-featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#ef4242]" />
          <label htmlFor="art-featured" className="text-xs text-white/60 select-none">Featured on articles page</label>
          <span className="mx-2" />
          <input id="art-home-featured" type="checkbox" checked={homeFeatured} onChange={(e) => setHomeFeatured(e.target.checked)} className="accent-[#ef4242]" />
          <label htmlFor="art-home-featured" className="text-xs text-white/60 select-none">Featured on home page</label>
        </div>

        {/* Sections */}
        <div className="border-t border-white/8 pt-4">
          <p className={labelCls}>Sections ({sections.length}) <span className="text-white/20 font-normal ml-1">— drag to reorder</span></p>
          <div className="space-y-3 mb-3">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => { setSectionDragIdx(idx); setSectionDropIdx(null); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; const rect = e.currentTarget.getBoundingClientRect(); setSectionDropIdx(e.clientY < rect.top + rect.height / 2 ? idx : idx + 1); }}
                onDragLeave={() => setSectionDropIdx(null)}
                onDrop={() => { if (sectionDragIdx !== null && sectionDropIdx !== null && sectionDropIdx !== sectionDragIdx) { const target = sectionDropIdx > sectionDragIdx ? sectionDropIdx - 1 : sectionDropIdx; if (target !== sectionDragIdx) setSections((prev) => arrayMove(prev, sectionDragIdx, target)); } setSectionDragIdx(null); setSectionDropIdx(null); }}
                onDragEnd={() => { setSectionDragIdx(null); setSectionDropIdx(null); }}
                className={`border border-white/8 rounded-sm p-3 bg-white/2 space-y-2 cursor-grab active:cursor-grabbing transition-colors relative ${sectionDragIdx === idx ? "opacity-30" : ""}`}
              >
                {sectionDragIdx !== null && sectionDropIdx === idx && sectionDropIdx !== sectionDragIdx && (
                  <div className="absolute -top-1 left-2 right-2 h-0.5 bg-[#ef4242] rounded-full z-10 shadow-[0_0_6px_rgba(239,66,66,0.5)]" />
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white/20 text-xs select-none cursor-grab">⠿</span>
                    <span className="text-[10px] tracking-widest uppercase text-white/40">{sec.type}</span>
                  </div>
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
                    <ImageTagsEditor src={sec.src} tags={sec.imageTags ?? []} onChange={(t) => updateSection(idx, { imageTags: t })} />
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
                {sec.type === "before-after" && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Before Image</p>
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input className={inputCls} value={typeof sec.beforeImage === "object" ? (sec.beforeImage as ImageAsset)?.src ?? "" : sec.beforeImage ?? ""} onChange={(e) => updateSection(idx, { beforeImage: { src: e.target.value, alt: typeof sec.beforeImage === "object" ? (sec.beforeImage as ImageAsset)?.alt ?? "" : "" } })} placeholder="Before image URL" />
                      <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-before", sectionIndex: idx })}>
                        Select Image
                      </button>
                    </div>
                    <input className={inputCls} value={typeof sec.beforeImage === "object" ? (sec.beforeImage as ImageAsset)?.alt ?? "" : ""} onChange={(e) => updateSection(idx, { beforeImage: { src: typeof sec.beforeImage === "object" ? (sec.beforeImage as ImageAsset)?.src ?? "" : sec.beforeImage ?? "", alt: e.target.value } })} placeholder="Before alt text" />
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-2">After Image</p>
                    <div className="grid grid-cols-[1.6fr_auto] gap-2">
                      <input className={inputCls} value={typeof sec.afterImage === "object" ? (sec.afterImage as ImageAsset)?.src ?? "" : sec.afterImage ?? ""} onChange={(e) => updateSection(idx, { afterImage: { src: e.target.value, alt: typeof sec.afterImage === "object" ? (sec.afterImage as ImageAsset)?.alt ?? "" : "" } })} placeholder="After image URL" />
                      <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-after", sectionIndex: idx })}>
                        Select Image
                      </button>
                    </div>
                    <input className={inputCls} value={typeof sec.afterImage === "object" ? (sec.afterImage as ImageAsset)?.alt ?? "" : ""} onChange={(e) => updateSection(idx, { afterImage: { src: typeof sec.afterImage === "object" ? (sec.afterImage as ImageAsset)?.src ?? "" : sec.afterImage ?? "", alt: e.target.value } })} placeholder="After alt text" />
                    <input className={inputCls} value={sec.caption ?? ""} onChange={(e) => updateSection(idx, { caption: e.target.value })} placeholder="Caption (optional)" />
                  </div>
                )}
                {sec.type === "button" && (
                  <div className="space-y-1.5">
                    <input className={inputCls} value={sec.label ?? ""} onChange={(e) => updateSection(idx, { label: e.target.value })} placeholder="Button label (e.g. Visit Website)" />
                    <input className={inputCls} value={sec.content ?? ""} onChange={(e) => updateSection(idx, { content: e.target.value })} placeholder="Button URL (https://...)" />
                    <input className={inputCls} value={sec.caption ?? ""} onChange={(e) => updateSection(idx, { caption: e.target.value })} placeholder="Caption below button (optional)" />
                  </div>
                )}
                {sec.type === "pdf" && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input className={inputCls} value={sec.src ?? ""} onChange={(e) => updateSection(idx, { src: e.target.value })} placeholder="PDF URL (https://... or /cdn/...)" />
                      <button type="button" className={`${btnOutline} cursor-pointer`} onClick={() => setImagePickerTarget({ kind: "section-image", sectionIndex: idx })}>
                        Select PDF
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input className={inputCls} value={sec.pdfWidth ?? "100%"} onChange={(e) => updateSection(idx, { pdfWidth: e.target.value })} placeholder="Width (e.g. 100% or 800px)" />
                      <input className={inputCls} value={sec.pdfHeight ?? "600px"} onChange={(e) => updateSection(idx, { pdfHeight: e.target.value })} placeholder="Height (e.g. 600px)" />
                    </div>
                    <input className={inputCls} value={sec.caption ?? ""} onChange={(e) => updateSection(idx, { caption: e.target.value })} placeholder="Caption (optional)" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["text", "image", "gallery", "video", "quote", "code", "divider", "checklist", "ingredient-list", "steps", "store-checklist", "info-block", "before-after", "button", "pdf"] as ArticleSection["type"][]).map((t) => (
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
        <button className={btnRed} onClick={() => handleSave()}>Publish Article</button><button className={btnOutline} onClick={() => handleSave("draft")}>Save draft</button>
      </div>
    </Modal>
    {imagePickerTarget && (
      <R2ImagePickerModal
        title={imagePickerTarget?.kind === "section-image" && sections[imagePickerTarget.sectionIndex]?.type === "pdf" ? "Select PDF" : "Select Article Image"}
        onClose={() => setImagePickerTarget(null)}
        onSelect={applySelectedImage}
        allowPdf={imagePickerTarget?.kind === "section-image" && sections[imagePickerTarget.sectionIndex]?.type === "pdf"}
      />
    )}
    </>
  );
}
