"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getLanguageCode } from "@/lib/i18n";

const SKIP_TAGS = new Set([
  "script", "style", "noscript", "code", "pre", "kbd", "samp",
  "textarea", "input", "select", "option", "svg", "math",
]);

const originals = new Map<Text, string>();
let abortCtrl: AbortController | null = null;

function collectTextNodes(): Text[] {
  const root = document.body;
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const raw = (node.textContent ?? "").trim();
    if (raw.length < 2) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    if (SKIP_TAGS.has(parent.tagName.toLowerCase())) continue;
    if (parent.closest("[data-no-translate]")) continue;
    nodes.push(node);
  }
  return nodes;
}

async function batchTranslate(texts: string[], target: string, signal: AbortSignal): Promise<string[]> {
  const CHUNK = 50;
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += CHUNK) {
    if (signal.aborted) { out.push(...texts.slice(i)); continue; }
    const slice = texts.slice(i, i + CHUNK);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: slice, source: "en", target }),
        signal,
      });
      if (!res.ok) {
        console.error(`[translate] API returned ${res.status} for chunk ${i / CHUNK + 1}`);
        out.push(...slice); continue;
      }
      const data = await res.json() as { translatedText?: string | string[]; error?: string };
      if (data.error) {
        console.error("[translate] API error:", data.error);
        out.push(...slice); continue;
      }
      if (Array.isArray(data.translatedText)) {
        out.push(...slice.map((orig, k) => {
          const t = (data.translatedText as string[])[k];
          return typeof t === "string" && t.length > 0 ? t : orig;
        }));
      } else {
        console.warn("[translate] Expected array response, got:", typeof data.translatedText);
        out.push(...slice);
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") console.error("[translate] fetch error:", err);
      out.push(...slice);
    }
  }
  return out;
}

async function applyTranslation(langCode: string): Promise<void> {
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  const { signal } = abortCtrl;

  const targetCode = getLanguageCode(langCode);

  // Restore originals from previous translation
  for (const [node, original] of originals) {
    try { if (document.contains(node)) node.textContent = original; } catch { /* detached */ }
  }
  originals.clear();

  document.documentElement.lang = targetCode;
  if (targetCode === "en") return;

  // Let React finish rendering before walking the DOM
  await new Promise<void>((r) => setTimeout(r, 500));
  if (signal.aborted) return;

  const nodes = collectTextNodes();
  console.log(`[translate] lang=${targetCode} nodes=${nodes.length}`);
  if (!nodes.length || signal.aborted) return;

  for (const node of nodes) originals.set(node, node.textContent ?? "");

  const texts = nodes.map((n) => n.textContent ?? "");
  console.log(`[translate] sending ${texts.length} strings in ${Math.ceil(texts.length / 50)} chunk(s)`);

  const translated = await batchTranslate(texts, targetCode, signal);
  if (signal.aborted) return;

  let applied = 0;
  for (let i = 0; i < nodes.length; i++) {
    try {
      if (document.contains(nodes[i]) && translated[i] !== texts[i]) {
        nodes[i].textContent = translated[i];
        applied++;
      }
    } catch { /* detached */ }
  }
  console.log(`[translate] applied ${applied}/${nodes.length} translations`);
}

// Translate a handful of newly-added text nodes without a full re-walk.
// Used by the MutationObserver to handle dynamic content (Spotify, Bible verse, etc.)
async function translateNewNodes(nodes: Text[], targetCode: string): Promise<void> {
  const fresh = nodes.filter((n) => !originals.has(n) && document.contains(n));
  if (!fresh.length) return;
  const texts = fresh.map((n) => n.textContent ?? "");
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts, source: "en", target: targetCode }),
    });
    if (!res.ok) return;
    const data = await res.json() as { translatedText?: string[] };
    if (!Array.isArray(data.translatedText)) return;
    for (let i = 0; i < fresh.length; i++) {
      const t = data.translatedText[i];
      if (typeof t === "string" && t.length && document.contains(fresh[i])) {
        originals.set(fresh[i], fresh[i].textContent ?? "");
        fresh[i].textContent = t;
      }
    }
  } catch { /* silent — best effort */ }
}

export default function PageTranslator() {
  const pathname = usePathname();
  const langRef = useRef("en-US");

  useEffect(() => {
    function onLangChange(e: Event) {
      const code = (e as CustomEvent<{ code: string }>).detail?.code;
      if (!code) return;
      console.log("[translate] language-change event:", code);
      langRef.current = code;
      void applyTranslation(code);
    }
    window.addEventListener("mdcran:language-change", onLangChange);
    return () => window.removeEventListener("mdcran:language-change", onLangChange);
  }, []);

  // Re-apply on route change
  useEffect(() => {
    if (getLanguageCode(langRef.current) !== "en") {
      void applyTranslation(langRef.current);
    }
  }, [pathname]);

  // MutationObserver: translate dynamic content (Spotify, Bible verse, CRM updates)
  // as it appears in the DOM after the initial translation pass.
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const pending: Text[] = [];

    const obs = new MutationObserver((mutations) => {
      const targetCode = getLanguageCode(langRef.current);
      if (targetCode === "en") return;

      for (const mut of mutations) {
        for (const added of mut.addedNodes) {
          if (added.nodeType === Node.TEXT_NODE) {
            const t = added as Text;
            const raw = (t.textContent ?? "").trim();
            const parent = t.parentElement;
            if (raw.length >= 2 && parent && !SKIP_TAGS.has(parent.tagName.toLowerCase()) && !parent.closest("[data-no-translate]")) {
              pending.push(t);
            }
          } else if (added.nodeType === Node.ELEMENT_NODE) {
            const walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const t = walker.currentNode as Text;
              const raw = (t.textContent ?? "").trim();
              const parent = t.parentElement;
              if (raw.length >= 2 && parent && !SKIP_TAGS.has(parent.tagName.toLowerCase()) && !parent.closest("[data-no-translate]")) {
                pending.push(t);
              }
            }
          }
        }
      }

      if (!pending.length) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        const batch = pending.splice(0);
        void translateNewNodes(batch, targetCode);
      }, 300);
    });

    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); if (debounce) clearTimeout(debounce); };
  }, []);

  return null;
}
