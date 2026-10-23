"use client";
import { useState } from "react";
















import type { Project, Client, SocialLink, Platform } from "@/lib/types";






import { slugify, inputCls, textareaCls, labelCls, btnRed, btnGhost, btnOutline, Label, Field, Modal } from './AdminShared';
import R2ImagePickerModal from './R2ImagePickerModal';
export default function ClientModal({
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
  const [isEmployer, setIsEmployer] = useState(initial?.isEmployer ?? false);
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
      isEmployer,
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input id="cli-featured" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-[#ef4242]" />
            <label htmlFor="cli-featured" className="text-xs text-white/60 select-none">Featured client</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="cli-employer" type="checkbox" checked={isEmployer} onChange={(e) => setIsEmployer(e.target.checked)} className="accent-sky-400" />
            <label htmlFor="cli-employer" className="text-xs text-white/60 select-none">Employer</label>
          </div>
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
