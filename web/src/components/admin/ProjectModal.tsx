"use client";
import LabeledField from "./LabeledField";
import { useState } from "react";









import ImageTagsEditor from "@/components/admin/ImageTagsEditor";
import DatePicker from "@/components/shared/DatePicker";





import type { Project, Client, ArticleSection, Category, Subcategory, ProjectStatus, ImageAsset } from "@/lib/types";






import { slugify, uid, toEditableImageAsset, cleanImageAsset, normalizeSectionForEditor, normalizeSectionForSave, arrayMove, inputCls, textareaCls, labelCls, btnRed, btnGhost, btnOutlineRed, btnOutline, Label, Field, Modal } from './AdminShared';
import R2ImagePickerModal from './R2ImagePickerModal';
export default function ProjectModal({
  initial,
  clients,
  onClose,
  onSave,
}: {
  initial?: Project;
  clients: Client[];
  onClose: () => void;
  onSave: (p: Project, action?: "save" | "draft") => void;
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
  const [checkoutUrl, setCheckoutUrl] = useState(initial?.pricing.checkoutUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(initial?.liveUrl ?? "");
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(initial?.githubUrl ?? "");
  const [repositories, setRepositories] = useState(
    () => (initial?.repositories ?? []).map((repository) => [repository.label, repository.url, repository.description ?? ""].join(" | ")).join("\n")
  );
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [visible, setVisible] = useState(initial?.visible !== false);
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
  const [sectionDragIdx, setSectionDragIdx] = useState<number | null>(null);
  const [sectionDropIdx, setSectionDropIdx] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [imagePickerTarget, setImagePickerTarget] = useState<
    | null
    | { kind: "cover" }
    | { kind: "gallery"; index: number }
    | { kind: "section-image"; sectionIndex: number }
    | { kind: "section-gallery"; sectionIndex: number; imageIndex: number }
    | { kind: "section-before"; sectionIndex: number }
    | { kind: "section-after"; sectionIndex: number }
  >(null);

  function validate() {
    const e: string[] = [];
    if (!title.trim()) e.push("title");
    setErrors(e);
    return e.length === 0;
  }

  function handleSave(action: "save" | "draft" = "save") {
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
    const cleanedRepositories = repositories.split("\n").map((line) => {
      const [label = "", url = "", ...description] = line.split("|").map((part) => part.trim());
      return { label, url, description: description.join(" | ").trim() || undefined };
    }).filter((repository) => repository.label && /^https?:\/\//i.test(repository.url));
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
        checkoutUrl: pricingStatus === "for_sale" && checkoutUrl ? checkoutUrl.trim() : undefined,
      },
      liveUrl: liveUrl.trim() || undefined,
      externalUrl: externalUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      repositories: cleanedRepositories.length ? cleanedRepositories : undefined,
      videos: cleanedVideos.length ? cleanedVideos : undefined,
      credits: cleanedCredits.length ? cleanedCredits : undefined,
      sections: cleanedSections.length ? cleanedSections : undefined,
      featured,
      visible,
      publishDate: publishDate || undefined,
      clientIds: clientIds.length ? clientIds : undefined,
    };
    onSave(project, action);
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

  const isErr = (f: string) => errors.includes(f);

  return (
    <>
    <Modal title={initial ? "Edit Project" : "New Project"} onClose={onClose} wide fullPage>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <LabeledField label="Title" required>
            <input
              className={`${inputCls} ${isErr("title") ? "border-[#ef4242]" : ""}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
            />
          </LabeledField>
          <LabeledField label="Slug">
            <input
              className={inputCls}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from title"
            />
          </LabeledField>
        </div>

        <LabeledField label="Description">
          <textarea className={textareaCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Project description…" />
        </LabeledField>

        <div className="grid grid-cols-2 gap-4">
          <LabeledField label="Category">
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
              <option value="coding-projects">Engineering</option>
            </select>
          </LabeledField>
          <LabeledField label="Subcategory">
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
          </LabeledField>
        </div>

        <LabeledField label="Tags">
          <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="minecraft, map, adventure (comma-separated)" />
        </LabeledField>

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
          </div>
        </Field>

        <Field>
          <Label>Gallery Images</Label>
          <div className="space-y-2">
            {galleryImages.map((image, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {image.src && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={image.src.startsWith("/cdn/") ? `https://cdn.mdcran.com${image.src.slice(4)}` : image.src} alt="" className="w-10 h-10 rounded-sm object-cover border border-white/10 shrink-0 bg-white/5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="flex-1 grid grid-cols-[1.6fr_1fr_auto_auto] gap-2">
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
              </div>
            ))}
          </div>
          <button type="button" onClick={addGalleryImage} className={btnOutline}>+ Add Image</button>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LabeledField label="Pricing Status">
            <select className={inputCls} value={pricingStatus} onChange={(e) => setPricingStatus(e.target.value as ProjectStatus)}>
              <option value="free">Free</option>
              <option value="for_sale">For Sale</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </LabeledField>
          {pricingStatus === "for_sale" && (
            <LabeledField label="Price (USD)">
              <input className={inputCls} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9.99" />
            </LabeledField>
          )}
          {pricingStatus === "for_sale" && (
            <div className="col-span-3">
              <LabeledField label="Checkout URL">
                <input className={inputCls} value={checkoutUrl} onChange={(e) => setCheckoutUrl(e.target.value)} placeholder="https://… (Stripe, Gumroad, etc.)" />
              </LabeledField>
            </div>
          )}
          {pricingStatus === "free" && (
            <div className="col-span-2">
              <LabeledField label="Download URL">
                <input className={inputCls} value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://…" />
              </LabeledField>
            </div>
          )}
        </div>

        <LabeledField label="Live URL (optional)">
          <input
            className={inputCls}
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
            placeholder="https://… (site or demo)"
          />
        </LabeledField>

        <LabeledField label="Read More URL (optional)">
          <input
            className={inputCls}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://… (press article or case study)"
          />
        </LabeledField>

        <LabeledField label="GitHub URL (optional)">
          <input
            className={inputCls}
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/… (repository link)"
          />
        </LabeledField>

        <Field>
          <Label>Additional public repositories</Label>
          <textarea
            className={textareaCls}
            rows={3}
            value={repositories}
            onChange={(e) => setRepositories(e.target.value)}
            placeholder={"Label | https://github.com/… | What this repository demonstrates\nAPI integration examples | https://github.com/… | Public integration layer"}
          />
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">One per line. These appear as labeled technical resources; keep private repositories out of this list.</p>
        </Field>

        <Field>
          <Label>Publish Date</Label>
          <DatePicker value={publishDate} onChange={setPublishDate} />
          {!publishDate && (
            <p className="mt-1.5 text-[11px] text-white/40">
              No publish date set — no date will be shown publicly.
            </p>
          )}
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
                    <ImageTagsEditor src={sec.src} tags={sec.imageTags ?? []} onChange={(t) => updateSection(idx, { imageTags: t })} />
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
            {(["text", "image", "gallery", "video", "quote", "code", "divider", "before-after", "button", "pdf"] as ArticleSection["type"][]).map((t) => (
              <button key={t} type="button" onClick={() => addSection(t)} className={btnOutline}>+ {t}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              id="proj-visible"
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              className="accent-emerald-400"
            />
            <label htmlFor="proj-visible" className="text-xs text-white/60 select-none">Visible on site</label>
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
        </div>

        {errors.length > 0 && (
          <p className="text-[11px] text-[#ef4242]">Please fill in required fields: {errors.join(", ")}</p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnRed} onClick={() => handleSave()}>Publish Project</button><button className={btnOutline} onClick={() => handleSave("draft")}>Save draft</button>
      </div>
    </Modal>
    {imagePickerTarget && (
      <R2ImagePickerModal
        title={imagePickerTarget?.kind === "section-image" && sections[imagePickerTarget.sectionIndex]?.type === "pdf" ? "Select PDF" : "Select Project Image"}
        onClose={() => setImagePickerTarget(null)}
        onSelect={applySelectedImage}
        allowPdf={imagePickerTarget?.kind === "section-image" && sections[imagePickerTarget.sectionIndex]?.type === "pdf"}
      />
    )}
    </>
  );
}
