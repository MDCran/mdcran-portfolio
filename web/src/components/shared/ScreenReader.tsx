"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── CSS injected once for the highlight styling ──
const HIGHLIGHT_STYLE_ID = "sr-highlight-style";
function ensureHighlightStyles() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    .sr-highlight {
      background: color-mix(in srgb, var(--cranberry, #ef4242) 15%, transparent);
      color: color-mix(in srgb, var(--theme-text, #fff) 95%, transparent);
      border-radius: 2px;
      padding: 0 1px;
      transition: background 0.15s, color 0.15s;
    }
    .sr-word-active {
      background: color-mix(in srgb, var(--cranberry, #ef4242) 40%, transparent);
      color: color-mix(in srgb, var(--theme-text, #fff) 100%, transparent);
      border-radius: 2px;
      padding: 0 1px;
      box-shadow: 0 0 8px color-mix(in srgb, var(--cranberry, #ef4242) 25%, transparent);
    }
    .sr-marker {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 6px;
      height: 14px;
      border-radius: 1px;
      background: var(--cranberry, #ef4242);
      vertical-align: middle;
      margin: 0 1px;
      opacity: 0.7;
      animation: sr-marker-pulse 1.2s ease-in-out infinite;
    }
    @keyframes sr-marker-pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// ── Highlight helpers ──
function wrapRangeWithHighlight(range: Range): { cleanup: () => void } {
  ensureHighlightStyles();

  const startMarker = document.createElement("span");
  startMarker.className = "sr-marker";
  startMarker.setAttribute("data-sr-marker", "start");

  const endMarker = document.createElement("span");
  endMarker.className = "sr-marker";
  endMarker.setAttribute("data-sr-marker", "end");

  // Wrap contents in a highlight span
  const highlightSpan = document.createElement("span");
  highlightSpan.className = "sr-highlight";
  highlightSpan.setAttribute("data-sr-highlight", "");

  try {
    highlightSpan.appendChild(range.extractContents());
    range.insertNode(highlightSpan);
    highlightSpan.parentNode?.insertBefore(startMarker, highlightSpan);
    if (highlightSpan.nextSibling) {
      highlightSpan.parentNode?.insertBefore(endMarker, highlightSpan.nextSibling);
    } else {
      highlightSpan.parentNode?.appendChild(endMarker);
    }
  } catch {
    // If range spans multiple elements, fall back to simpler approach
    // Just add markers at boundaries without wrapping
    try {
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      // Add visual emphasis via CSS on the selected text nodes
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
      );
      const textNodes: Text[] = [];
      let inRange = false;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        if (node === startContainer) inRange = true;
        if (inRange) textNodes.push(node);
        if (node === endContainer) break;
      }

      const wrappedSpans: HTMLSpanElement[] = [];
      for (const textNode of textNodes) {
        const span = document.createElement("span");
        span.className = "sr-highlight";
        span.setAttribute("data-sr-highlight", "");
        textNode.parentNode?.insertBefore(span, textNode);
        span.appendChild(textNode);
        wrappedSpans.push(span);
      }

      // Insert markers
      if (wrappedSpans.length > 0) {
        wrappedSpans[0].parentNode?.insertBefore(startMarker, wrappedSpans[0]);
        const last = wrappedSpans[wrappedSpans.length - 1];
        if (last.nextSibling) {
          last.parentNode?.insertBefore(endMarker, last.nextSibling);
        } else {
          last.parentNode?.appendChild(endMarker);
        }
      }

      return {
        cleanup: () => {
          for (const span of wrappedSpans) {
            const parent = span.parentNode;
            if (!parent) continue;
            while (span.firstChild) parent.insertBefore(span.firstChild, span);
            parent.removeChild(span);
          }
          startMarker.remove();
          endMarker.remove();
        },
      };
    } catch {
      return { cleanup: () => {} };
    }
  }

  return {
    cleanup: () => {
      // Unwrap highlight: move children out, remove wrapper
      const parent = highlightSpan.parentNode;
      if (parent) {
        while (highlightSpan.firstChild) {
          parent.insertBefore(highlightSpan.firstChild, highlightSpan);
        }
        parent.removeChild(highlightSpan);
      }
      startMarker.remove();
      endMarker.remove();
      // Normalize to merge adjacent text nodes
      parent?.normalize();
    },
  };
}

function clearAllHighlights() {
  // Remove active word highlights first
  document.querySelectorAll(".sr-word-active").forEach((el) => el.classList.remove("sr-word-active"));
  document.querySelectorAll("[data-sr-highlight]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  });
  document.querySelectorAll("[data-sr-marker]").forEach((el) => el.remove());
  document.querySelectorAll("[data-sr-word]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  });
}

/** Split highlighted text into individually-addressable word spans for word tracking */
function splitHighlightIntoWords() {
  const highlights = document.querySelectorAll("[data-sr-highlight]");
  const wordSpans: HTMLSpanElement[] = [];
  let charOffset = 0;

  highlights.forEach((hl) => {
    const text = hl.textContent ?? "";
    // Split text into words and spaces, preserving whitespace
    const parts = text.match(/\S+|\s+/g) ?? [];
    const frag = document.createDocumentFragment();

    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        // Whitespace — just add as text node
        frag.appendChild(document.createTextNode(part));
        charOffset += part.length;
      } else {
        const span = document.createElement("span");
        span.setAttribute("data-sr-word", "");
        span.setAttribute("data-sr-offset", String(charOffset));
        span.textContent = part;
        frag.appendChild(span);
        wordSpans.push(span);
        charOffset += part.length;
      }
    }

    // Replace highlight contents with word spans
    hl.textContent = "";
    hl.appendChild(frag);
  });

  return wordSpans;
}

// ── Hook ──
export function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  const [reading, setReading] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const volumeRef = useRef(0.75);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentTextRef = useRef("");
  const charIndexRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    const david = voices.find((v) => /david/i.test(v.name));
    if (david) return david;
    const english = voices.find((v) => v.lang.startsWith("en"));
    if (english) return english;
    return voices[0] ?? null;
  }, []);

  const clearHighlight = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    clearAllHighlights();
  }, []);

  const stop = useCallback(() => {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setReading(false);
    clearHighlight();
  }, [clearHighlight]);

  const toggle = useCallback(() => {
    const announce = (text: string) => {
      if (typeof speechSynthesis === "undefined") return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = getVoice();
      if (v) u.voice = v;
      u.rate = 1; u.pitch = 1; u.volume = volumeRef.current ?? 1;
      speechSynthesis.speak(u);
    };
    if (enabled) {
      stop();
      setEnabled(false);
      announce("Narrator off");
    } else {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.getVoices();
      setEnabled(true);
      announce("Narrator on");
    }
  }, [enabled, stop, getVoice]);

  const restartAtVolume = useCallback((newVol: number) => {
    if (typeof speechSynthesis === "undefined" || !utteranceRef.current) return;
    const text = currentTextRef.current;
    const charIdx = charIndexRef.current;
    if (!text || charIdx >= text.length) return;

    // Cancel current, restart from where we left off
    speechSynthesis.cancel();
    const remaining = text.slice(charIdx);
    const utterance = new SpeechSynthesisUtterance(remaining);
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = newVol;
    utterance.onstart = () => setReading(true);
    utterance.onboundary = (e) => {
      if (e.name === "word") charIndexRef.current = charIdx + e.charIndex;
    };
    utterance.onend = () => {
      setReading(false);
      clearHighlight();
    };
    utterance.onerror = () => {
      setReading(false);
      clearHighlight();
    };
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [getVoice, clearHighlight]);

  const volumeUp = useCallback(() => {
    setVolume((v) => {
      const next = Math.min(1, Math.round((v + 0.1) * 10) / 10);
      volumeRef.current = next;
      if (reading) restartAtVolume(next);
      return next;
    });
  }, [reading, restartAtVolume]);

  const volumeDown = useCallback(() => {
    setVolume((v) => {
      const next = Math.max(0.1, Math.round((v - 0.1) * 10) / 10);
      volumeRef.current = next;
      if (reading) restartAtVolume(next);
      return next;
    });
  }, [reading, restartAtVolume]);

  const wordSpansRef = useRef<HTMLSpanElement[]>([]);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  const speak = useCallback((text: string, range?: Range | null) => {
    if (!text || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    clearHighlight();
    currentTextRef.current = text;
    charIndexRef.current = 0;

    // Highlight the selected range
    if (range) {
      try {
        const { cleanup } = wrapRangeWithHighlight(range.cloneRange());
        cleanupRef.current = cleanup;
      } catch {
        // Highlight is best-effort
      }
    }

    // Split highlighted text into word spans for tracking
    try {
      wordSpansRef.current = splitHighlightIntoWords();
    } catch {
      wordSpansRef.current = [];
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = volumeRef.current;
    utterance.onstart = () => setReading(true);

    // Word-by-word tracking via boundary events
    utterance.onboundary = (e) => {
      if (e.name !== "word") return;
      const charIdx = e.charIndex;
      charIndexRef.current = charIdx;

      // Remove previous active
      if (activeWordRef.current) {
        activeWordRef.current.classList.remove("sr-word-active");
      }

      // Find the word span that contains this character offset
      let found: HTMLSpanElement | null = null;
      for (const span of wordSpansRef.current) {
        const offset = parseInt(span.getAttribute("data-sr-offset") ?? "0", 10);
        const len = (span.textContent ?? "").length;
        if (charIdx >= offset && charIdx < offset + len) {
          found = span;
          break;
        }
      }

      if (found) {
        found.classList.add("sr-word-active");
        activeWordRef.current = found;
        // Scroll into view if needed
        found.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    };

    utterance.onend = () => {
      setReading(false);
      if (activeWordRef.current) activeWordRef.current.classList.remove("sr-word-active");
      activeWordRef.current = null;
      wordSpansRef.current = [];
      clearHighlight();
    };
    utterance.onerror = () => {
      setReading(false);
      if (activeWordRef.current) activeWordRef.current.classList.remove("sr-word-active");
      activeWordRef.current = null;
      wordSpansRef.current = [];
      clearHighlight();
    };
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [getVoice, volume, clearHighlight]);

  return { enabled, reading, volume, toggle, speak, stop, volumeUp, volumeDown };
}

// ── Popups component ──
interface ScreenReaderPopupsProps {
  enabled: boolean;
  reading: boolean;
  volume: number;
  onSpeak: (text: string, range?: Range | null) => void;
  onStop: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
}

export default function ScreenReaderPopups({ enabled, reading, volume, onSpeak, onStop, onVolumeUp, onVolumeDown }: ScreenReaderPopupsProps) {
  const [selectedText, setSelectedText] = useState("");
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string; imageSrc?: string } | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const popupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Right-click context menu for selected text (always active, not just when screen reader enabled)
  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      // Image right-click → offer Copy / Download image.
      const imgEl = (e.target as HTMLElement | null)?.closest?.("img") as HTMLImageElement | null;
      if (imgEl && (imgEl.currentSrc || imgEl.src)) {
        e.preventDefault();
        savedRangeRef.current = null;
        setContextMenu({
          x: Math.min(e.clientX, window.innerWidth - 180),
          y: Math.min(e.clientY, window.innerHeight - 110),
          text: "",
          imageSrc: imgEl.currentSrc || imgEl.src,
        });
        return;
      }

      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (text.length < 2) {
        setContextMenu(null);
        return;
      }
      e.preventDefault();

      // Save range
      try {
        if (sel && sel.rangeCount > 0) {
          savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch {
        savedRangeRef.current = null;
      }

      setContextMenu({
        x: Math.min(e.clientX, window.innerWidth - 160),
        y: Math.min(e.clientY, window.innerHeight - 100),
        text,
      });
    }

    function handleClickAway() {
      setContextMenu(null);
    }

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClickAway);
    document.addEventListener("scroll", handleClickAway, { capture: true, passive: true });
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClickAway);
      document.removeEventListener("scroll", handleClickAway, { capture: true } as EventListenerOptions);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setPopupPos(null);
      setSelectedText("");
      savedRangeRef.current = null;
      return;
    }

    function handleSelectionChange() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";

      if (text.length < 2) {
        if (popupTimeout.current) clearTimeout(popupTimeout.current);
        popupTimeout.current = setTimeout(() => {
          setPopupPos(null);
          setSelectedText("");
          savedRangeRef.current = null;
        }, 400);
        return;
      }

      if (popupTimeout.current) clearTimeout(popupTimeout.current);
      setSelectedText(text);

      // Save the range for highlighting later
      try {
        if (sel && sel.rangeCount > 0) {
          savedRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch {
        savedRangeRef.current = null;
      }

      const range = sel?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        setPopupPos({
          x: Math.min(rect.left + rect.width / 2, window.innerWidth - 80),
          y: Math.max(rect.top - 44, 8),
        });
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (popupTimeout.current) clearTimeout(popupTimeout.current);
    };
  }, [enabled]);

  const handleReadNow = useCallback(() => {
    if (!selectedText) return;
    const range = savedRangeRef.current;
    onSpeak(selectedText, range);
    setPopupPos(null);
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
    savedRangeRef.current = null;
  }, [selectedText, onSpeak]);

  return (
    <>
      {/* Reading indicator */}
      {reading && (
        <div
          className="fixed left-6 top-1/2 -translate-y-1/2 z-[9999] flex flex-col gap-2 px-4 py-3 rounded-sm border backdrop-blur-sm shadow-lg"
          style={{
            backgroundColor: "color-mix(in srgb, var(--theme-bg, #0d0d0d) 95%, transparent)",
            borderColor: "color-mix(in srgb, var(--cranberry, #ef4242) 30%, transparent)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="w-1 h-3 rounded-full animate-pulse" style={{ backgroundColor: "var(--cranberry, #ef4242)" }} />
              <span className="w-1 h-4 rounded-full animate-pulse [animation-delay:0.15s]" style={{ backgroundColor: "var(--cranberry, #ef4242)" }} />
              <span className="w-1 h-2 rounded-full animate-pulse [animation-delay:0.3s]" style={{ backgroundColor: "var(--cranberry, #ef4242)" }} />
            </div>
            <span className="text-[10px] tracking-wider uppercase" style={{ color: "var(--cranberry, #ef4242)" }}>Reading</span>
            <button
              onClick={onStop}
              className="text-[10px] ml-1 uppercase tracking-wider cursor-pointer transition-colors"
              style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 50%, transparent)" }}
            >
              Stop
            </button>
          </div>
          {/* Volume controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onVolumeDown}
              className="w-6 h-6 flex items-center justify-center rounded-sm border transition-colors cursor-pointer"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-text, #fff) 12%, transparent)",
                color: "color-mix(in srgb, var(--theme-text, #fff) 50%, transparent)",
              }}
              title="Volume down"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 10%, transparent)" }}>
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{ width: `${volume * 100}%`, backgroundColor: "var(--cranberry, #ef4242)" }}
              />
            </div>
            <button
              onClick={onVolumeUp}
              className="w-6 h-6 flex items-center justify-center rounded-sm border transition-colors cursor-pointer"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-text, #fff) 12%, transparent)",
                color: "color-mix(in srgb, var(--theme-text, #fff) 50%, transparent)",
              }}
              title="Volume up"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <span className="text-[9px] tabular-nums w-7 text-right" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 30%, transparent)" }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* "Read Now" popup on text selection (only when screen reader enabled) */}
      {enabled && popupPos && selectedText && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleReadNow();
          }}
          className="fixed z-[9999] flex items-center gap-1.5 px-3 py-1.5 rounded-sm border transition-colors shadow-lg cursor-pointer backdrop-blur-sm"
          style={{
            left: `${popupPos.x}px`,
            top: `${popupPos.y}px`,
            transform: "translateX(-50%)",
            backgroundColor: "color-mix(in srgb, var(--theme-bg, #0a0a0a) 95%, transparent)",
            borderColor: "color-mix(in srgb, var(--cranberry, #ef4242) 40%, transparent)",
            color: "var(--cranberry, #ef4242)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Read Now
        </button>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[10000] rounded-sm border overflow-hidden shadow-xl backdrop-blur-md"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: "color-mix(in srgb, var(--theme-bg, #0a0a0a) 96%, transparent)",
            borderColor: "color-mix(in srgb, var(--theme-text, #fff) 12%, transparent)",
            minWidth: "150px",
          }}
        >
          {contextMenu.imageSrc ? (
            <>
              {/* Copy image */}
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[11px] tracking-wider transition-colors cursor-pointer"
                style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 70%, transparent)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                onClick={async () => {
                  const src = contextMenu.imageSrc!;
                  setContextMenu(null);
                  try {
                    const res = await fetch(src, { mode: "cors" });
                    const blob = await res.blob();
                    let out = blob;
                    if (blob.type !== "image/png") {
                      const bitmap = await createImageBitmap(blob);
                      const canvas = document.createElement("canvas");
                      canvas.width = bitmap.width; canvas.height = bitmap.height;
                      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
                      out = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b as Blob), "image/png"));
                    }
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": out })]);
                  } catch {
                    try { await navigator.clipboard.writeText(contextMenu.imageSrc!); } catch { /* */ }
                  }
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
                Copy image
              </button>

              <div className="h-px" style={{ backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)" }} />

              {/* Download image */}
              <button
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[11px] tracking-wider transition-colors cursor-pointer"
                style={{ color: "var(--cranberry, #ef4242)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--cranberry, #ef4242) 8%, transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                onClick={async () => {
                  const src = contextMenu.imageSrc!;
                  setContextMenu(null);
                  try {
                    const res = await fetch(src, { mode: "cors" });
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = (src.split("/").pop() || "image").split("?")[0] || "image";
                    document.body.appendChild(a); a.click(); a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                  } catch {
                    window.open(src, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download image
              </button>
            </>
          ) : (
          <>
          {/* Copy */}
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[11px] tracking-wider transition-colors cursor-pointer"
            style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 70%, transparent)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.text).catch(() => {});
              setContextMenu(null);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: "color-mix(in srgb, var(--theme-text, #fff) 8%, transparent)" }} />

          {/* Read Aloud */}
          <button
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-[11px] tracking-wider transition-colors cursor-pointer"
            style={{ color: "var(--cranberry, #ef4242)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--cranberry, #ef4242) 8%, transparent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            onClick={() => {
              const range = savedRangeRef.current;
              onSpeak(contextMenu.text, range);
              setContextMenu(null);
              window.getSelection()?.removeAllRanges();
              savedRangeRef.current = null;
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            Read Aloud
          </button>
          </>
          )}
        </div>
      )}
    </>
  );
}
