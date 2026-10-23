"use client";
import { useState, useEffect, useRef } from "react";























import { R2BrowserFile, R2BrowserFolder, R2BrowserResponse, fmtDateTime, formatBytes, isImageAssetFile, r2DisplayName, inputCls, btnRed, btnOutline, Modal } from './AdminShared';

export default function R2ImagePickerModal({
  title = "Select Image",
  onClose,
  onSelect,
  allowPdf,
}: {
  title?: string;
  onClose: () => void;
  onSelect: (url: string) => void;
  allowPdf?: boolean;
}) {
  const [prefix, setPrefix] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [folders, setFolders] = useState<R2BrowserFolder[]>([]);
  const [files, setFiles] = useState<R2BrowserFile[]>([]);
  const pickerFileInputRef = useRef<HTMLInputElement>(null);
  const imageFiles = files.filter((file) => allowPdf ? (isImageAssetFile(file.name) || /\.pdf$/i.test(file.name)) : isImageAssetFile(file.name));

  function goUpOneLevel() {
    const trimmed = prefix.replace(/\/$/, "");
    setSearch("");
    setPrefix(trimmed.includes("/") ? `${trimmed.slice(0, trimmed.lastIndexOf("/") + 1)}` : "");
  }

  async function uploadPickerFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("prefix", prefix);
        const response = await fetch("/api/admin/r2", { method: "POST", body: formData });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || `Upload failed for ${file.name}.`);
        }
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (pickerFileInputRef.current) pickerFileInputRef.current.value = "";
    }
  }

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
  }, [prefix, search, refreshKey]);

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
          <div className="flex gap-2 flex-wrap">
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
              onClick={goUpOneLevel}
              disabled={!prefix}
            >
              Up One Level
            </button>
            <label className={`${btnRed} cursor-pointer flex items-center gap-1.5 px-3 h-8 text-[11px]`}>
              {uploading ? "Uploading…" : "Upload File"}
              <input
                ref={pickerFileInputRef}
                type="file"
                accept="image/*,video/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => uploadPickerFiles(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-sm border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-white/35">
          <button
            type="button"
            disabled={!prefix}
            onClick={goUpOneLevel}
            className="shrink-0 text-[11px] text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>
          <span className="text-white/20">|</span>
          <span>
            <span className="text-white/50">Location:</span>{" "}
            {search.trim() ? `Search in ${prefix || "bucket root"}` : prefix || "bucket root"}
          </span>
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

          <div
            className={`border bg-white/2 rounded-sm overflow-hidden relative transition-colors ${dragOver ? "border-[#ef4242]/50" : "border-white/7"}`}
            onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
            onDragEnter={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.types.includes("Files")) void uploadPickerFiles(e.dataTransfer.files); }}
          >
            {dragOver && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-sm border-2 border-dashed border-[#ef4242]/60 bg-[#ef4242]/8">
                <p className="font-nord text-sm text-[#ef4242]">Drop to upload</p>
              </div>
            )}
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
                          <div className="truncate text-xs text-white/75" title={file.key}>{r2DisplayName(file.key)}</div>
                          <div className="truncate text-[10px] text-white/25">{file.publicUrl}</div>
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
