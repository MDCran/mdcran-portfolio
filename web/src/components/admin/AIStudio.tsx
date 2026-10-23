"use client";
import { useEffect, useRef, useState } from "react";
import EvidenceSources from "@/components/chat/EvidenceSources";
import { safePublicPath } from "@/lib/assistant-evidence";
import { adminRequest } from "@/lib/admin-client";
import type { EvidenceSource } from "@/lib/assistant-evidence";
import { createStreamLines } from "@/lib/stream-lines";
type Model = { provider: string; model: string; purpose: string };
type Evaluation = { id: string; audience: string; page: string; prompt: string; checks: string[] };
type Attempt = { provider: string; model: string; ok: boolean; elapsedMs: number; firstTokenMs?: number; at?: string; error?: string };
type Result = { model: string; prompt: string; text: string; sources: EvidenceSource[]; actions: unknown[]; metrics?: Attempt; error?: string };
interface StudioData { models: Model[]; evaluations: Evaluation[]; health: Attempt[]; feedback: { id: string; at: string; model: string; rating: string; prompt: string; answer: string; note: string }[]; budget: { cap: number; reservedTokens: number; requests: number }; voice: { voiceId: string; model: string } }
export default function AIStudio() {
  const [data, setData] = useState<StudioData | null>(null);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("Summarize Michael's strongest engineering experience with exact supporting links.");
  const [page, setPage] = useState("/resume");
  const [audience, setAudience] = useState("recruiter");
  const [checks, setChecks] = useState<string[]>([]);
  const [left, setLeft] = useState(0); const [right, setRight] = useState(0);
  const [variants, setVariants] = useState(["", ""]);
  const [results, setResults] = useState<Result[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const initialized = useRef(false);
  const [voiceMs, setVoiceMs] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  async function refresh() { const next = await adminRequest<StudioData>("/api/admin/ai-studio"); setData(next); if (!initialized.current) { setRight(next.models.length > 1 ? 1 : 0); initialized.current = true; } }
  useEffect(() => { void refresh().catch(e => setError(String(e.message))); return () => controller.current?.abort(); }, []);
  async function compare() {
    if (!data || !prompt.trim()) return;
    if (!safePublicPath(page)) { setError("Choose a public page path, such as /resume or /engineering."); return; }
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(""); setStatus(""); setResults([]); setNotes([]);
    try {
      // A deliberate two-request comparison. Opening this workspace never calls a model.
      const responses: Result[] = [];
      for (const [index, selected] of [left, right].entries()) {
        if (abort.signal.aborted) break;
        const model = data.models[selected]; if (!model) continue;
        const result: Result = { model: `${model.provider}/${model.model}`, prompt, text: "", sources: [], actions: [] };
        responses.push(result); setResults([...responses]);
        const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], currentPage: page, preferences: { audience }, memoryConsent: false, adminComparison: { ...model, prompt: variants[index] } }) });
        if (!res.ok || !res.body) { result.error = (await res.json().catch(() => ({}))).error || `Request failed (${res.status})`; setResults([...responses]); continue; }
        const reader = res.body.getReader(); const lines = createStreamLines();
        while (!abort.signal.aborted) {
          const { value, done } = await reader.read();
          for (const line of lines(done ? undefined : value)) {
            if (!line.startsWith("data: ") || line.slice(6).trim() === "[DONE]") continue;
            try { const chunk = JSON.parse(line.slice(6)); if (chunk.text) result.text += chunk.text; if (chunk.sources) result.sources = chunk.sources; if (chunk.actions) result.actions.push(...chunk.actions); if (chunk.metrics) result.metrics = chunk.metrics; if (chunk.error) result.error = chunk.error; } catch { /* incomplete upstream data */ }
          }
          if (controller.current !== abort) return;
          setResults(responses.map(r => ({ ...r })));
          if (done) break;
        }
      }
      await refresh();
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Comparison failed."); }
    finally { if (controller.current === abort) setBusy(false); }
  }
  async function feedback(index: number, rating: "good" | "bad") {
    const result = results[index];
    if (!result || feedbackBusy) return;
    setFeedbackBusy(true); setError(""); setStatus("");
    try {
      await adminRequest("/api/admin/ai-studio", { method: "POST", body: JSON.stringify({ prompt: result.prompt, answer: result.text, model: result.model, rating, note: notes[index] || "" }) });
      setStatus("Feedback saved.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Feedback could not be saved. Your notes are still here."); }
    finally { setFeedbackBusy(false); }
  }
  async function testVoice() {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort; setBusy(true); setError("");
    try { const start = performance.now(); const response = await fetch("/api/voice/tts", { method: "POST", headers: { "Content-Type": "application/json" }, signal: abort.signal, body: JSON.stringify({ text: "Welcome to Michael's portfolio.", pace: 1 }) }); if (!response.ok || !response.body) throw new Error("Voice is unavailable."); const reader = response.body.getReader(); const first = await reader.read(); if (first.done || !first.value.length) throw new Error("Voice returned no audio."); setVoiceMs(Math.round(performance.now() - start)); await reader.cancel(); abort.abort(); }
    catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Voice test failed."); } finally { if (controller.current === abort) setBusy(false); }
  }
  const inputClass = "w-full rounded border border-white/15 bg-black/30 p-2 text-sm";
  return <section className="space-y-5 rounded-xl border border-white/10 p-4 md:p-6" aria-label="AI testing workspace">
    <div><h2 className="text-xl font-semibold">AI testing workspace</h2><p className="mt-2 text-sm opacity-65">Compare configured models and prompt variants against the same public evidence. Tests use provider credits only when you run them. Site actions are shown here for review and never executed.</p></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}{status && <p role="status">{status}</p>}
    <button className="rounded border px-3 py-1 text-sm" disabled={busy || feedbackBusy} onClick={() => { setError(""); void refresh().catch(e => setError(e instanceof Error ? e.message : "Could not refresh the workspace.")); }}>Refresh workspace</button>
    {!data ? <p>{error ? "Configuration is unavailable. Retry with Refresh workspace." : "Loading configuration…"}</p> : <>
      {!data.models.length && <p role="status">No model provider is configured. Add a provider key and model on the server before comparing responses.</p>}
      <p className="text-sm">Today: {data.budget.reservedTokens.toLocaleString()} / {data.budget.cap.toLocaleString()} reserved token units · {data.budget.requests} requests. Reservations conservatively count UTF-8 input bytes plus maximum output, including failures. Configure AI_DAILY_TOKEN_CAP on the server; dollar spend depends on provider rates.</p>
      <label className="block text-sm">Regression scenario<select className={inputClass} defaultValue="" onChange={e => { const evaluation = data.evaluations.find(v => v.id === e.target.value); if (evaluation) { setPrompt(evaluation.prompt); setPage(evaluation.page); setAudience(evaluation.audience); setChecks(evaluation.checks); } }}><option value="">Choose a scenario</option>{data.evaluations.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}</select></label>
      {checks.length > 0 && <ul className="list-disc pl-5 text-sm">{checks.map(check => <li key={check}>{check}</li>)}</ul>}
      <label className="block text-sm">Question<textarea className={inputClass} value={prompt} maxLength={6000} onChange={e => setPrompt(e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label>Public page<input className={inputClass} value={page} onChange={e => setPage(e.target.value)} /></label><label>Audience<select className={inputClass} value={audience} onChange={e => setAudience(e.target.value)}><option value="general">General</option><option value="recruiter">Recruiter</option><option value="engineering">Engineering</option></select></label></div>
      <div className="grid gap-4 lg:grid-cols-2">{[left, right].map((selected, index) => <div key={index} className="space-y-2"><label>Model {index === 0 ? "A" : "B"}<select className={inputClass} value={selected} onChange={e => (index === 0 ? setLeft : setRight)(Number(e.target.value))}>{data.models.map((model, i) => <option key={`${model.provider}-${model.model}-${i}`} value={i}>{model.provider} · {model.model} · {model.purpose}</option>)}</select></label><label>Prompt variant {index === 0 ? "A" : "B"}<textarea className={inputClass} maxLength={2000} placeholder="Optional style or answer instructions" value={variants[index]} onChange={e => setVariants(v => v.map((value, i) => i === index ? e.target.value : value))} /></label></div>)}</div>
      <div className="flex flex-wrap gap-3"><button className="rounded bg-red-600 px-4 py-2 disabled:opacity-40" disabled={busy || feedbackBusy || !data.models.length || !prompt.trim()} onClick={() => void compare()}>Run two-answer comparison</button><button className="rounded border px-4 py-2 disabled:opacity-40" disabled={!busy} onClick={() => { controller.current?.abort(); setBusy(false); }}>Cancel</button><button className="rounded border px-4 py-2 disabled:opacity-40" disabled={busy || feedbackBusy} onClick={() => void testVoice()}>Measure voice first byte</button></div>
      <p className="text-xs opacity-60">Voice: {data.voice.voiceId} · {data.voice.model}{voiceMs !== null ? ` · Latest synthesis first byte: ${voiceMs} ms (network included; not playback latency)` : ""}. Physical microphone and interruption checks require a voice session.</p>
      <div className="grid gap-4 lg:grid-cols-2">{results.map((result, index) => <article className="min-w-0 rounded border border-white/15 p-3" key={index}><h3 className="break-all font-medium">{index === 0 ? "A" : "B"} · {result.model}</h3><p className="mt-2 text-xs opacity-60">Question: {result.prompt}</p><p className="my-3 whitespace-pre-wrap break-words text-sm">{result.text || "Waiting for response…"}</p>{result.error && <p className="text-red-400">{result.error}</p>}{result.metrics && <p className="text-xs opacity-70">First token: {result.metrics.firstTokenMs ?? "—"} ms · Total: {result.metrics.elapsedMs} ms</p>}<EvidenceSources sources={result.sources} /><details className="my-3 text-xs"><summary>Validated site actions ({result.actions.length})</summary><pre className="overflow-auto">{JSON.stringify(result.actions, null, 2)}</pre></details><label className="text-sm">Review notes<textarea className={inputClass} maxLength={2000} value={notes[index] || ""} onChange={e => setNotes(n => { const next = [...n]; next[index] = e.target.value; return next; })} /></label><div className="mt-2 flex gap-3"><button disabled={busy || feedbackBusy || !result.text} onClick={() => void feedback(index, "good")}>Mark good</button><button disabled={busy || feedbackBusy || !result.text} onClick={() => void feedback(index, "bad")}>Flag bad answer</button></div></article>)}</div>
      <details><summary>Recent provider health ({data.health.length})</summary><div className="mt-2 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th>Model</th><th>Result</th><th>First token</th><th>Total</th></tr></thead><tbody>{data.health.map((attempt, i) => <tr key={i}><td className="py-2">{attempt.provider}/{attempt.model}</td><td>{attempt.ok ? "OK" : attempt.error || "Failed"}</td><td>{attempt.firstTokenMs ?? "—"} ms</td><td>{attempt.elapsedMs} ms</td></tr>)}</tbody></table></div></details>
      <details><summary>Saved feedback ({data.feedback.length})</summary><ul className="mt-3 space-y-3 text-sm">{data.feedback.map(f => <li key={f.id}><strong>{f.rating} · {f.model}</strong><p>{f.prompt}</p><p className="opacity-70">{f.note}</p><details><summary>Saved answer</summary><p className="mt-2 whitespace-pre-wrap">{f.answer}</p></details></li>)}</ul></details>
    </>}
  </section>;
}
