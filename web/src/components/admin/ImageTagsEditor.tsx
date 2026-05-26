"use client";

import React from "react";
import { assetUrl } from "@/lib/utils";
import type { ImageTag } from "@/lib/types";

function uid(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

/** Click the image to place a tag; edit label/link; tags store x/y as image percentages. */
export default function ImageTagsEditor({
  src,
  tags,
  onChange,
}: {
  src?: string;
  tags: ImageTag[];
  onChange: (tags: ImageTag[]) => void;
}) {
  if (!src) return null;
  const resolved = assetUrl(src);

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    onChange([...tags, { id: uid(), x, y, label: "New tag" }]);
  };
  const update = (id: string, patch: Partial<ImageTag>) => onChange(tags.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => onChange(tags.filter((t) => t.id !== id));

  const input = "w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-2 h-8 text-xs text-white outline-none placeholder-white/25";

  return (
    <div className="space-y-2 border-t border-white/6 pt-3">
      <p className="text-[10px] tracking-widest uppercase text-white/35">Image Tags — click the image to place</p>
      <div className="relative inline-block max-w-full cursor-crosshair rounded-sm overflow-hidden border border-white/10" onClick={place}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolved} alt="" className="max-h-64 w-auto block select-none pointer-events-none" />
        {tags.map((t) => (
          <span key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white border-2 border-[#ef4242] shadow" style={{ left: `${t.x}%`, top: `${t.y}%` }} title={t.label} />
        ))}
      </div>
      {tags.length > 0 && (
        <div className="space-y-1.5">
          {tags.map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input className={input} value={t.label} onChange={(e) => update(t.id, { label: e.target.value })} placeholder="Tag label" />
              <input className={input} value={t.link ?? ""} onChange={(e) => update(t.id, { link: e.target.value || undefined })} placeholder="Link (optional)" />
              <button type="button" className="text-[#ef4242]/60 hover:text-[#ef4242] text-xs px-1" onClick={() => remove(t.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
