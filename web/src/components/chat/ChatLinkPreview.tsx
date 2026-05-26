"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface Preview { url: string; title: string; description?: string; favicon: string; siteName?: string }

const cache = new Map<string, Promise<Preview | null>>();
function loadPreview(url: string): Promise<Preview | null> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    cache.set(url, p);
  }
  return p;
}

export default function ChatLinkPreview({ url }: { url: string }) {
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } })();

  useEffect(() => {
    let active = true;
    loadPreview(url).then((p) => { if (active) setPreview(p); });
    return () => { active = false; };
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-2 flex items-center gap-3 overflow-hidden rounded-sm border p-2.5 transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      style={{ borderColor: "color-mix(in srgb, var(--theme-text, #fff) 12%, transparent)", backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 3%, transparent)" }}
    >
      {/* Favicon */}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-white/[0.06]">
        {preview?.favicon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.favicon} alt="" className="h-5 w-5" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
        ) : (
          <ExternalLink size={15} className="text-white/40" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 88%, transparent)" }}>
          {preview === undefined ? host : (preview?.title || host)}
        </span>
        {preview?.description && (
          <span className="mt-0.5 line-clamp-1 block text-[10.5px]" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 45%, transparent)" }}>{preview.description}</span>
        )}
        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] uppercase tracking-wider" style={{ color: "var(--theme-primary, #ef4242)" }}>
          <ExternalLink size={9} /> {preview?.siteName || host}
        </span>
      </span>
    </a>
  );
}
