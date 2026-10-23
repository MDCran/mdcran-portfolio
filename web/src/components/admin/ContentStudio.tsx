"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminRequest, AdminRequestError, recordId } from "@/lib/admin-client";
import { useConfirm } from "./ConfirmModal";
type RecordData = Record<string, unknown>;
type Detail = { record: RecordData | null; version: number; draft?: { record: RecordData }; history: { revisionId: string; version: number; action: string; at: string; record: RecordData | null }[] };
type RecordList = { records: RecordData[]; nextCursor: string | null };
function readDetail(collection: string, id: string, signal: AbortSignal) {
  return adminRequest<Detail>(`/api/admin/content?${new URLSearchParams({ collection, id })}`, { signal });
}
function readList(collection: string, query: string, drafts: boolean, signal: AbortSignal, next?: string) {
  return adminRequest<RecordList>(`/api/admin/content?${new URLSearchParams({ collection, q: query, drafts: String(drafts), ...(next ? { cursor: next } : {}) })}`, { signal });
}
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
  const [listLoading, setListLoading] = useState(true);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const operationRef = useRef<AbortController | null>(null);
  const listRequestRef = useRef<AbortController | null>(null);
  const operationPendingRef = useRef(false);

  function showDetail(recordIdValue: string, result: Detail) {
    setId(recordIdValue); setDetail(result);
    setEditor(result.draft?.record ?? result.record ?? {}); setRaw("");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCollection = params.get("collection");
    const requestedRecord = params.get("record");
    if (requestedCollection && ["projects", "articles", "clients"].includes(requestedCollection) && requestedRecord) {
      const controller = new AbortController();
      operationRef.current = controller;
      Promise.all([
        readDetail(requestedCollection, requestedRecord, controller.signal),
        readList(requestedCollection, "", false, controller.signal),
      ]).then(([result, list]) => {
        if (controller.signal.aborted || operationRef.current !== controller) return;
        listRequestRef.current?.abort();
        setCollection(requestedCollection); showDetail(requestedRecord, result);
        setRecords(list.records); setCursor(list.nextCursor); setListLoading(false);
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to open the linked content record.");
      }).finally(() => { if (operationRef.current === controller) operationRef.current = null; });
    }
    return () => { operationRef.current?.abort(); listRequestRef.current?.abort(); };
  }, []);

  const load = useCallback(async (next?: string) => {
    if (operationPendingRef.current) return;
    listRequestRef.current?.abort();
    const controller = new AbortController();
    listRequestRef.current = controller;
    setListLoading(true); setError("");
    try {
      const result = await readList(collection, query, drafts, controller.signal, next);
      if (controller.signal.aborted || listRequestRef.current !== controller) return;
      setRecords(previous => next ? [...previous, ...result.records] : result.records);
      setCursor(result.nextCursor);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load content.");
    } finally {
      if (!controller.signal.aborted && listRequestRef.current === controller) setListLoading(false);
    }
  }, [collection, query, drafts]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => { clearTimeout(timer); listRequestRef.current?.abort(); };
  }, [load]);

  function changeList(change: () => void) {
    if (busy || refreshRequired) return;
    operationRef.current?.abort(); operationRef.current = null;
    listRequestRef.current?.abort();
    setListLoading(true); setRecords([]); setCursor(null); change();
  }

  function beginOperation() {
    if (operationRef.current) return null;
    listRequestRef.current?.abort(); setListLoading(false);
    const controller = new AbortController();
    operationRef.current = controller;
    operationPendingRef.current = true;
    setBusy(true); setError(""); setNotice("");
    return controller;
  }
  function endOperation(controller: AbortController) {
    if (operationRef.current !== controller) return;
    operationRef.current = null;
    operationPendingRef.current = false;
    if (!controller.signal.aborted) setBusy(false);
  }

  async function open(recordIdValue: string) {
    if (refreshRequired) return;
    const controller = beginOperation();
    if (!controller) return;
    try {
      const result = await readDetail(collection, recordIdValue, controller.signal);
      if (!controller.signal.aborted) showDetail(recordIdValue, result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to open content.");
    } finally { endOperation(controller); }
  }

  // Both reads must succeed before replacing the editor or clearing the stale-data lock.
  async function reloadSaved(signal: AbortSignal) {
    const [nextDetail, nextList] = await Promise.all([
      readDetail(collection, id, signal), readList(collection, query, drafts, signal),
    ]);
    if (signal.aborted) return;
    showDetail(id, nextDetail); setRecords(nextList.records); setCursor(nextList.nextCursor);
    setRefreshRequired(false);
  }

  async function recover() {
    const controller = beginOperation();
    if (!controller) return;
    try {
      await reloadSaved(controller.signal);
      if (!controller.signal.aborted) setNotice("Latest saved content loaded. Editing is available again.");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to refresh saved content.");
    } finally { endOperation(controller); }
  }

  async function act(action: "draft" | "publish" | "restore", revisionId?: string) {
    if (!detail || busy || refreshRequired) return;
    const controller = beginOperation();
    if (!controller) return;
    let committed = false;
    try {
      const record = raw ? JSON.parse(raw) : editor;
      await adminRequest("/api/admin/content", { method: "POST", signal: controller.signal,
        body: JSON.stringify({ collection, id, action, expectedVersion: detail.version, record, revisionId }) });
      committed = true;
      await reloadSaved(controller.signal);
      if (!controller.signal.aborted) setNotice(action === "draft" ? "Draft saved. The published page is unchanged." : action === "publish" ? "Published successfully." : "Revision restored and published.");
    } catch (cause) {
      if (controller.signal.aborted) return;
      const unconfirmed = cause instanceof AdminRequestError && cause.status >= 200 && cause.status < 300;
      if (committed || unconfirmed) setRefreshRequired(true);
      setError(committed ? "The change was saved, but the latest content could not be loaded. Refresh saved content to continue; this will not repeat the write." : cause instanceof Error ? cause.message : "Save failed. Your edits are still here.");
    } finally { endOperation(controller); }
  }
  const locked = busy || refreshRequired;
  const sections = Array.isArray(editor.sections) ? editor.sections as RecordData[] : [];
  return <section className="space-y-5">{modal}<div><h2 className="text-xl font-semibold">Content studio</h2><p className="mt-1 text-sm text-white/60">Review drafts, preview presentation, publish deliberately, and restore previous versions. Create new content through the Projects or Articles editor.</p></div>
    <div className="flex flex-wrap gap-3"><label className="text-sm">Collection<select disabled={locked} className={field} value={collection} onChange={e=>changeList(()=>{setCollection(e.target.value);setId("");setDetail(null);setEditor({});setRaw("");})}><option value="projects">Projects</option><option value="articles">Articles</option><option value="clients">Clients</option></select></label><label className="flex-1 text-sm">Search<input disabled={locked} className={field} value={query} onChange={e=>changeList(()=>setQuery(e.target.value))} placeholder="Search titles or names"/></label><label className="flex items-center gap-2 text-sm"><input disabled={locked} type="checkbox" checked={drafts} onChange={e=>changeList(()=>setDrafts(e.target.checked))}/>Drafts only</label></div>
    {error && <p role="alert" className="rounded border border-red-300/30 p-3 text-red-300">{error}</p>}{notice && <p role="status" className="text-emerald-300">{notice}</p>}
    {refreshRequired && <div role="status" className="rounded border border-amber-300/30 p-3 text-sm text-amber-200"><p>Read-only: the displayed version may be out of date. Your current entries are preserved until saved content reloads.</p><button disabled={busy} onClick={()=>void recover()} className="mt-2 underline disabled:opacity-40">{busy ? "Refreshing..." : "Refresh saved content"}</button></div>}
    <div className="grid gap-5 lg:grid-cols-[250px_1fr]"><aside className="space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-xs text-white/50">{records.length} loaded</p><button disabled={locked||listLoading} onClick={()=>void load()} className="text-xs underline disabled:opacity-40">Refresh list</button></div>{records.map(record=>{const key=recordId(collection,record);return <button disabled={locked||listLoading} key={key} onClick={()=>void open(key)} className={`w-full rounded border p-3 text-left text-sm ${id===key ? "border-[#ef4242] bg-[#ef4242]/10" : "border-white/10"}`}>{String(record.title ?? record.name ?? key)}{record._draft ? <span className="ml-2 text-xs text-amber-200">Draft</span> : null}</button>;})}{cursor && <button disabled={locked||listLoading} onClick={()=>void load(cursor)} className={field}>Load more</button>}{listLoading&&<p role="status" className="text-sm text-white/55">Loading content...</p>}{!records.length&&!busy&&!listLoading&&<p className="text-sm text-white/55">No content matches.</p>}</aside>
    {detail ? <div className="space-y-5"><div className="rounded-lg border border-white/10 p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium">Edit · version {detail.version}</h3><div className="flex gap-2"><button disabled={locked} onClick={()=>void act("draft")} className="rounded border border-white/20 px-3 py-2 text-sm">Save draft</button><button disabled={locked||!detail.draft} onClick={()=>void act("publish")} className="rounded bg-[#ef4242] px-3 py-2 text-sm disabled:opacity-40">Publish saved draft</button></div></div>{[collection==="clients"?"name":"title",collection==="articles"?"excerpt":collection==="clients"?"bio":"description"].map(key=><label key={key} className="block text-sm capitalize">{key}<textarea disabled={locked} className={`${field} mt-1`} rows={key==="title"||key==="name"?1:4} value={String(editor[key]??"")} onChange={e=>{setEditor({...editor,[key]:e.target.value});setRaw("");}}/></label>)}<details><summary className="cursor-pointer text-sm text-white/65">Advanced fields</summary><textarea disabled={locked} aria-label="Complete record JSON" className={`${field} mt-3 font-mono`} rows={12} value={raw||JSON.stringify(editor,null,2)} onChange={e=>setRaw(e.target.value)}/><p className="text-xs text-white/50">Advanced changes are validated on save. Reload the saved draft to update the visual preview.</p></details></div>
    <div className="rounded-lg border border-white/10 p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-medium">Content preview</h3><button className="text-sm underline" onClick={()=>setMobile(!mobile)}>{mobile?"Desktop width":"Mobile width"}</button></div><article className={`mx-auto rounded bg-[#101010] p-5 space-y-3 ${mobile?"max-w-[390px]":"w-full"}`}><p className="text-xs uppercase tracking-widest text-[#ef4242]">Unpublished preview</p><h2 className="text-2xl font-semibold">{String(editor.title??editor.name??"")}</h2><p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{String(editor.excerpt??editor.bio??editor.description??"")}</p>{sections.map((section,index)=><div key={index}>{section.caption?<h3 className="font-medium">{String(section.caption)}</h3>:null}{typeof section.content==="string"&&<p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{section.content}</p>}{Array.isArray(section.items)&&<ul className="list-disc pl-5 text-sm">{section.items.filter(i=>typeof i==="string").map((item,i)=><li key={i}>{String(item)}</li>)}</ul>}</div>)}</article><p className="mt-3 text-xs text-white/50">Text and section preview. Use the published page to check interactive media.</p></div>
    <details className="rounded-lg border border-white/10 p-5"><summary className="cursor-pointer font-medium">Revision history ({detail.history.length})</summary><div className="mt-4 space-y-3">{detail.history.map(revision=><div key={revision.revisionId} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm"><span>Version {revision.version} · {revision.action} · {new Date(revision.at).toLocaleString()}</span>{revision.record&&<button disabled={locked} className="underline" onClick={async()=>{if(await confirm({title:`Restore version ${revision.version}?`,body:"This publishes the selected revision. The current version remains in history.",confirmLabel:"Restore and publish"})) await act("restore",revision.revisionId);}}>Restore this version</button>}</div>)}</div></details></div>:<p className="p-5 text-white/55">Select a record to review its draft and revisions.</p>}</div></section>;
}
