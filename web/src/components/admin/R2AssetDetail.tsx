"use client";

import React, { useEffect, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r)));

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function R2StatsBar() {
  const { data } = useSWR<{ total: number; bytes: number; images: number; videos: number; documents: number; others: number }>(
    "/api/admin/r2/stats", fetcher, { revalidateOnFocus: false }
  );
  const cells = [
    { label: "Total Assets", value: data ? data.total.toLocaleString() : "—" },
    { label: "Images", value: data ? data.images.toLocaleString() : "—" },
    { label: "Videos", value: data ? data.videos.toLocaleString() : "—" },
    { label: "Documents", value: data ? data.documents.toLocaleString() : "—" },
    { label: "Other", value: data ? data.others.toLocaleString() : "—" },
    { label: "Storage Used", value: data ? bytes(data.bytes) : "—" },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-sm border border-white/7 bg-white/2 p-3">
          <p className="text-[9px] tracking-[0.16em] uppercase text-white/35 mb-1">{c.label}</p>
          <p className="font-nord text-lg text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

interface Detail {
  key: string; contentType: string; size: number; lastModified?: string; etag?: string;
  kind: string; url: string;
  meta: { key: string; uuid: string; alt?: string; status?: string; visibility?: string; updatedAt?: string };
}

export function R2AssetDetailPanel({ fileKey, onChanged }: { fileKey: string; onChanged?: () => void }) {
  const { data, mutate } = useSWR<Detail>(`/api/admin/r2/detail?key=${encodeURIComponent(fileKey)}`, fetcher);
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState("live");
  const [visibility, setVisibility] = useState("public");
  const [dims, setDims] = useState<string>("—");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    if (data) {
      setAlt(data.meta.alt ?? "");
      setStatus(data.meta.status ?? "live");
      setVisibility(data.meta.visibility ?? "public");
    }
  }, [data]);

  const ext = (fileKey.split(".").pop() || "").toLowerCase();
  const isImage = data?.kind === "image";
  const isPdf = ext === "pdf";
  const isText = ["txt", "md", "json", "csv"].includes(ext);

  const save = async () => {
    setSaving(true);
    await fetch("/api/admin/r2/detail", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: fileKey, alt, status, visibility }),
    });
    await mutate();
    setSaving(false);
    setSavedAt(Date.now());
    onChanged?.();
  };

  const replace = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.set("key", fileKey);
    fd.set("file", file);
    await fetch("/api/admin/r2/detail", { method: "POST", body: fd });
    await mutate();
    onChanged?.();
  };

  const input = "w-full bg-white/4 border border-white/10 focus:border-[#ef4242] rounded-sm px-3 h-9 text-sm text-white outline-none placeholder-white/25";
  const meta = data?.meta;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
      {/* Preview */}
      <div className="overflow-hidden rounded-sm border border-white/8 bg-black/30 flex items-center justify-center min-h-[200px]">
        {!data ? (
          <span className="text-xs text-white/25 py-10">Loading…</span>
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.url} alt={alt || fileKey} className="max-h-[60vh] w-full object-contain" onLoad={(e) => setDims(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)} />
        ) : isPdf ? (
          <iframe src={data.url} title={fileKey} className="w-full" style={{ height: "60vh", border: 0 }} />
        ) : isText ? (
          <iframe src={data.url} title={fileKey} className="w-full bg-white/5" style={{ height: "40vh", border: 0 }} />
        ) : data.kind === "video" ? (
          <video src={data.url} controls className="max-h-[60vh] w-full" />
        ) : (
          <div className="text-xs text-white/40 py-10 text-center">No inline preview for .{ext}<br /><a href={data.url} target="_blank" rel="noopener noreferrer" className="text-[#ef4242] underline mt-2 inline-block">Open file</a></div>
        )}
      </div>

      {/* Metadata + editor */}
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          {[
            ["Kind", data?.kind ?? "—"],
            ["MIME", data?.contentType ?? "—"],
            ["Size", data ? bytes(data.size) : "—"],
            ["Dimensions", isImage ? dims : "—"],
            ["Created / Updated", data?.lastModified ? new Date(data.lastModified).toLocaleString() : "—"],
            ["Status", meta?.status ?? "live"],
            ["UUID", meta?.uuid ?? "—"],
          ].map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="text-white/30">{k}</span>
              <span className="text-white/65 truncate" title={String(v)}>{v}</span>
            </React.Fragment>
          ))}
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/35">Storage key</label>
          <input className={`${input} font-jb text-[11px]`} value={fileKey} readOnly />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-white/35">Alt text</label>
          <input className={input} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe this asset" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/35">Status</label>
            <select className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="live">Live</option><option value="draft">Draft</option><option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/35">Visibility</label>
            <select className={input} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="public">Public (CDN)</option><option value="private">Private (presigned)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center px-3 h-9 text-[11px] bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] disabled:opacity-50">
            {saving ? "Saving…" : Date.now() - savedAt < 2000 ? "Saved ✓" : "Save changes"}
          </button>
          <label className="inline-flex items-center justify-center px-3 h-9 text-[11px] border border-white/15 text-white/55 rounded-sm hover:text-white hover:border-white/30 cursor-pointer">
            Replace file
            <input type="file" className="hidden" onChange={(e) => replace(e.target.files?.[0] ?? null)} />
          </label>
          <a href={data?.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-3 h-9 text-[11px] border border-white/15 text-white/55 rounded-sm hover:text-white hover:border-white/30">Open</a>
        </div>
        {visibility === "private" && <p className="text-[10px] text-white/30">Private assets are served via short-lived presigned URLs instead of the public CDN domain.</p>}
      </div>
    </div>
  );
}
