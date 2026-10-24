import { createStreamLines } from "./stream-lines";
import { safePublicPath } from "./assistant-evidence";

export type TerminalTurn = { role: "user" | "assistant"; content: string };
export type TerminalSource = { label: string; href: string };

export function cleanTerminalAnswer(text: string) {
  return text.replace(/__(?:CONTACTCARD|BOOKINGCARD):[\s\S]*$/, "")
    .replace(/__[A-Z_]+(?::[\s\S]*?)?__/g, "")
    .replace(/__[A-Z_]+(?::[\s\S]*)?$/, "")
    .replace(/<[^>]*>/g, "").trim();
}

function safeSource(value: unknown): value is string {
  if (safePublicPath(value)) return true;
  try { const url = new URL(String(value)); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}

export function terminalHistory(history: TerminalTurn[], question: string) {
  const next: TerminalTurn[] = [{ role: "user", content: question }];
  let length = question.length;
  // Keep complete exchanges and stay below the shared chat endpoint's limits.
  for (let index = history.length - 2; index >= 0 && next.length < 13; index -= 2) {
    const pair = history.slice(index, index + 2);
    const size = pair.reduce((sum, turn) => sum + turn.content.length, 0);
    if (length + size > 24000) break;
    next.unshift(...pair);
    length += size;
  }
  return next;
}

export async function streamTerminalAnswer({ question, history, signal, onText, agent = false, fetcher = fetch }: {
  question: string; history: TerminalTurn[]; signal: AbortSignal;
  onText: (text: string) => void; agent?: boolean; fetcher?: typeof fetch;
}) {
  if (!question.trim() || question.length > 4000) throw new Error("Ask a question between 1 and 4,000 characters.");
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(90000)]);
  const response = await fetcher("/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: requestSignal,
    body: JSON.stringify({ messages: terminalHistory(history, question), currentPage: "/terminal", agentName: "Michael", tone: "concise", memoryConsent: false,
      domContext: `The visitor is using the portfolio terminal. Answer in plain text with public source links. ${agent ? "Agent mode is enabled. Use site_actions project with a published project ID, navigate to /resume or /engineering or a published project, and highlight experience, education or skills to show supporting evidence inside the terminal. These actions open terminal content and move a visual pointer. You cannot control the computer, execute arbitrary commands, submit forms, or open external websites. Do not claim actions succeeded before they run." : "Conversation mode only. Do not emit actions or claim you operated the site."} Terminal commands include search, open, resume, projects and recruiter.` }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(typeof error?.error === "string" ? error.error : `Assistant unavailable (HTTP ${response.status}).`);
  }
  if (!response.body || !response.headers.get("Content-Type")?.includes("text/event-stream")) throw new Error("Invalid assistant response. Please try again.");
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  requestSignal.addEventListener("abort", abort, { once: true });
  const decode = createStreamLines();
  let text = "";
  let done = false;
  let sources: TerminalSource[] = [];
  let actions: unknown[] = [];
  const consume = (lines: string[]) => {
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") { done = true; continue; }
      if (!payload) continue;
      const event = JSON.parse(payload);
      if (typeof event.error === "string") throw new Error(event.error);
      if (typeof event.text === "string") {
        if (event.text.includes("__BEHAVIOR__")) throw new Error("Please ask a question about Michael’s public work or experience.");
        text += event.text;
        if (text.length > 24000) throw new Error("Assistant response exceeded the terminal limit.");
        onText(cleanTerminalAnswer(text));
      }
      if (Array.isArray(event.sources)) sources = event.sources
        .filter((source: { title?: unknown; href?: unknown }) => typeof source?.title === "string" && safeSource(source.href))
        .slice(0, 6).map((source: { title: string; href: string }) => ({ label: source.title, href: source.href }));
      // Actions are resolved against public content by the caller, never evaluated as commands.
      if (agent && Array.isArray(event.actions)) actions = [...actions, ...event.actions].slice(0,4);
    }
  };
  try {
    while (!done) {
      const chunk = await reader.read();
      if (requestSignal.aborted) throw new DOMException("Aborted or timed out", "AbortError");
      if (chunk.done) { consume(decode()); break; }
      consume(decode(chunk.value));
    }
    if (!done) throw new Error("Assistant response was interrupted. Please try again.");
    const answer = cleanTerminalAnswer(text);
    if (!answer) throw new Error("The assistant returned no text. Please try again.");
    return { text: answer, sources, actions };
  } finally {
    requestSignal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
