"use client";
import { useCallback, useEffect, useState } from "react";
import { adminRequest, recordId } from "@/lib/admin-client";
import { useConfirm } from "./ConfirmModal";
type RecordData = Record<string, unknown>;
type Detail = { record: RecordData | null; version: number; draft?: { record: RecordData }; history: { revisionId: string; version: number; action: string; at: string; record: RecordData | null }[] };
const field = "w-full rounded border border-white/20 bg-black/30 px-3 py-2 text-sm";
export default function ContentStudio() {
  const { confirm, modal } = useConfirm();
  const [collection, setCollection] = useState("projects");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState(false);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [id, setId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [editor, setEditor] = useState<RecordData>({});
  const [raw, setRaw] = useState("");
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCollection = params.get("collection");
    const requestedRecord = params.get("record");
    if (!requestedCollection || !["projects", "articles", "clients"].includes(requestedCollection) || !requestedRecord) return;
    let active = true;
    adminRequest<Detail>(`/api/admin/content?${new URLSearchParams({ collection: requestedCollection, id: requestedRecord })}`).then((result) => {
      if (!active) return;
      setCollection(requestedCollection); setId(requestedRecord); setDetail(result);
      setEditor(result.draft?.record ?? result.record ?? {}); setRaw("");
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Unable to open the linked content record."); });
    return () => { active = false; };
  }, []);
  const load = useCallback(async (next?: string) => {
    setBusy(true); setError("");
    try { const result = await adminRequest<{records: RecordData[]; nextCursor: string | null}>(`/api/admin/content?${new URLSearchParams({collection,q:query,drafts:String(drafts),...(next ? {cursor:next}: {})})}`); setRecords(previous => next ? [...previous,...result.records] : result.records); setCursor(result.nextCursor); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to load content."); }
    finally { setBusy(false); }
  }, [collection,query,drafts]);
  useEffect(() => { const timer=setTimeout(()=>void load(),250); return ()=>clearTimeout(timer); },[load]);
  async function open(recordIdValue: string) {
    setBusy(true); setError(""); setNotice("");
    try { const result=await adminRequest<Detail>(`/api/admin/content?${new URLSearchParams({collection,id:recordIdValue})}`); setId(recordIdValue); setDetail(result); setEditor(result.draft?.record ?? result.record ?? {}); setRaw(""); }
    catch(e) { setError(e instanceof Error ? e.message : "Unable to open content."); } finally { setBusy(false); }
  }
  async function act(action: "draft" | "publish" | "restore", revisionId?: string) {
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const record = raw ? JSON.parse(raw) : editor;
      await adminRequest("/api/admin/content",{method:"POST",body:JSON.stringify({collection,id,action,expectedVersion:detail.version,record,revisionId})});
      await open(id); await load(); setNotice(action === "draft" ? "Draft saved. The published page is unchanged." : action === "publish" ? "Published successfully." : "Revision restored and published.");
    } catch(e) { setError(e instanceof Error ? e.message : "Save failed. Your edits are still here."); } finally { setBusy(false); }
  }
  const sections = Array.isArray(editor.sections) ? editor.sections as RecordData[] : [];
  return <section className="space-y-5">{modal}<div><h2 className="text-xl font-semibold">Content studio</h2><p className="mt-1 text-sm text-white/60">Review drafts, preview presentation, publish deliberately, and restore previous versions. Create new content through the Projects or Articles editor.</p></div>
    <div className="flex flex-wrap gap-3"><label className="text-sm">Collection<select disabled={busy} className={field} value={collection} onChange={e=>{setCollection(e.target.value);setId("");setDetail(null);}}><option value="projects">Projects</option><option value="articles">Articles</option><option value="clients">Clients</option></select></label><label className="flex-1 text-sm">Search<input className={field} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles or names"/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={drafts} onChange={e=>setDrafts(e.target.checked)}/>Drafts only</label></div>
    {error && <p role="alert" className="rounded border border-red-300/30 p-3 text-red-300">{error}</p>}{notice && <p role="status" className="text-emerald-300">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]"><aside className="space-y-2"><p className="text-xs text-white/50">{records.length} loaded</p>{records.map(record=>{const key=recordId(collection,record);return <button disabled={busy} key={key} onClick={()=>void open(key)} className={`w-full rounded border p-3 text-left text-sm ${id===key ? "border-[#ef4242] bg-[#ef4242]/10" : "border-white/10"}`}>{String(record.title ?? record.name ?? key)}{record._draft ? <span className="ml-2 text-xs text-amber-200">Draft</span> : null}</button>;})}{cursor && <button disabled={busy} onClick={()=>void load(cursor)} className={field}>Load more</button>}{!records.length&&!busy&&<p className="text-sm text-white/55">No content matches.</p>}</aside>
    {detail ? <div className="space-y-5"><div className="rounded-lg border border-white/10 p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Edit · version {detail.version}</h3><div className="flex gap-2"><button disabled={busy} onClick={()=>void act("draft")} className="rounded border border-white/20 px-3 py-2 text-sm">Save draft</button><button disabled={busy||!detail.draft} onClick={()=>void act("publish")} className="rounded bg-[#ef4242] px-3 py-2 text-sm disabled:opacity-40">Publish saved draft</button></div></div>{[collection==="clients"?"name":"title",collection==="articles"?"excerpt":collection==="clients"?"bio":"description"].map(key=><label key={key} className="block text-sm capitalize">{key}<textarea disabled={busy} className={`${field} mt-1`} rows={key==="title"||key==="name"?1:4} value={String(editor[key]??"")} onChange={e=>{setEditor({...editor,[key]:e.target.value});setRaw("");}}/></label>)}<details><summary className="cursor-pointer text-sm text-white/65">Advanced fields</summary><textarea disabled={busy} aria-label="Complete record JSON" className={`${field} mt-3 font-mono`} rows={12} value={raw||JSON.stringify(editor,null,2)} onChange={e=>setRaw(e.target.value)}/><p className="text-xs text-white/50">Advanced changes are validated on save. Reload the saved draft to update the visual preview.</p></details></div>
    <div className="rounded-lg border border-white/10 p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-medium">Content preview</h3><button className="text-sm underline" onClick={()=>setMobile(!mobile)}>{mobile?"Desktop width":"Mobile width"}</button></div><article className={`mx-auto rounded bg-[#101010] p-5 space-y-3 ${mobile?"max-w-[390px]":"w-full"}`}><p className="text-xs uppercase tracking-widest text-[#ef4242]">Unpublished preview</p><h2 className="text-2xl font-semibold">{String(editor.title??editor.name??"")}</h2><p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{String(editor.excerpt??editor.bio??editor.description??"")}</p>{sections.map((section,index)=><div key={index}>{section.caption?<h3 className="font-medium">{String(section.caption)}</h3>:null}{typeof section.content==="string"&&<p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{section.content}</p>}{Array.isArray(section.items)&&<ul className="list-disc pl-5 text-sm">{section.items.filter(i=>typeof i==="string").map((item,i)=><li key={i}>{String(item)}</li>)}</ul>}</div>)}</article><p className="mt-3 text-xs text-white/50">Text and section preview. Use the published page to check interactive media.</p></div>
    <details className="rounded-lg border border-white/10 p-5"><summary className="cursor-pointer font-medium">Revision history ({detail.history.length})</summary><div className="mt-4 space-y-3">{detail.history.map(revision=><div key={revision.revisionId} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm"><span>Version {revision.version} · {revision.action} · {new Date(revision.at).toLocaleString()}</span>{revision.record&&<button disabled={busy} className="underline" onClick={async()=>{if(await confirm({title:`Restore version ${revision.version}?`,body:"This publishes the selected revision. The current version remains in history.",confirmLabel:"Restore and publish"})) await act("restore",revision.revisionId);}}>Restore this version</button>}</div>)}</div></details></div>:<p className="p-5 text-white/55">Select a record to review its draft and revisions.</p>}</div></section>;
}
