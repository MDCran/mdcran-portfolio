"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-client";
import { assetReferenceEditorHref } from "@/lib/content-editor-link";

interface Usage { key: string; references: { collection: string; id: string; title: string; fields: string[] }[]; canDelete: boolean }
export default function AssetUsage({ assetKey: suppliedKey, onDeleted }: { assetKey: string; onDeleted?: () => void }) {
  const assetKey = suppliedKey.trim().replace(/^\/+/, "");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleted, setDeleted] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState("");
  useEffect(() => {
    let active = true;
    adminRequest<Usage>(`/api/admin/r2/usage?${new URLSearchParams({ key: assetKey })}`).then((data) => { if (active) { setUsage(data); setMessage(""); setConfirmKey(""); } }).catch((e: unknown) => { if (active) { setUsage(null); setMessage(e instanceof Error ? e.message : "Could not load asset references."); } });
    return () => { active = false; };
  }, [assetKey]);
  async function refresh() {
    setBusy(true); setMessage("");
    try { setUsage(await adminRequest<Usage>(`/api/admin/r2/usage?${new URLSearchParams({ key: assetKey })}`)); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not refresh references."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!usage?.canDelete || usage.key !== assetKey || confirmKey !== assetKey || busy) return;
    setBusy(true); setMessage("");
    try {
      await adminRequest("/api/admin/r2", { method: "DELETE", body: JSON.stringify({ key: assetKey }) });
      setDeleted(assetKey); setMessage("Asset deleted. Refresh the asset browser to update its listing."); onDeleted?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Deletion failed. The asset has not been confirmed deleted.");
      try { setUsage(await adminRequest<Usage>(`/api/admin/r2/usage?${new URLSearchParams({ key: assetKey })}`)); } catch { /* Preserve the deletion error and avoid claiming safety. */ }
    } finally { setBusy(false); }
  }
  const current = usage?.key === assetKey ? usage : null;
  return <section className="mt-5 space-y-3 rounded-sm border border-white/15 p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Where this asset is used</h3><button disabled={busy || deleted === assetKey} onClick={refresh} className="text-sm underline disabled:opacity-50">Refresh references</button></div>
    <p className="break-all font-mono text-xs text-white/60">{assetKey}</p>
    {message && <p role="status" className="text-sm text-white/80">{message}</p>}
    {!current && !message && <p className="text-sm text-white/60">Loading saved references…</p>}
    {current && deleted !== assetKey && <>
      <p className="text-sm text-white/70">{current.references.length} referring record(s), including saved drafts. Rename remains available in the asset manager. To replace an image, edit its referring content and choose the new asset.</p>
      <ul className="space-y-3">{current.references.map((ref, index) => {
        const editorHref = assetReferenceEditorHref(ref.collection, ref.id);
        return <li key={`${ref.collection}:${ref.id}:${index}`} className="border-t border-white/10 pt-3 text-sm"><p>{editorHref ? <a href={editorHref} className="underline">{ref.title || ref.id}</a> : ref.title || ref.id}<span className="ml-2 text-xs text-white/55">{ref.collection}</span></p><p className="mt-1 break-words text-xs text-white/60">{ref.fields.join(", ")}</p></li>;
      })}</ul>
      {!current.canDelete ? <p className="text-sm text-amber-200">Deletion is blocked while saved content or drafts refer to this asset. Update those references first, then refresh.</p> : <details className="border-t border-white/15 pt-3"><summary className="cursor-pointer text-sm">Delete this unreferenced asset</summary><p className="mt-3 text-sm text-white/70">No saved references were found. The server checks again at deletion time. Type the exact asset key to confirm permanent deletion.</p><label className="mt-3 block text-sm">Confirm asset key<input value={confirmKey} onChange={(e) => setConfirmKey(e.target.value)} className="mt-1 w-full rounded-sm border border-white/20 bg-black/20 p-2 text-sm" autoComplete="off" /></label><button disabled={busy || confirmKey !== assetKey} onClick={remove} className="mt-3 rounded-sm border border-red-300/40 px-3 py-2 text-sm text-red-300 disabled:opacity-40">{busy ? "Deleting…" : "Delete asset permanently"}</button></details>}
    </>}
  </section>;
}
