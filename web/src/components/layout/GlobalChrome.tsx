"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import ResumeButton from "@/components/shared/ResumeButton";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import ChatBubble from "@/components/chat/ChatBubble";
import ThemeOverlay from "@/components/shared/ThemeOverlay";
import ThemeEffectsOverlay from "@/components/shared/ThemeEffectsOverlay";
import StatusBanner from "@/components/status/StatusBanner";
import SectionWheel from "@/components/shared/SectionWheel";

const TerminalExperience = dynamic(
  () => import("@/components/terminal/TerminalExperience"),
  { ssr: false },
);

const ChatPanel = dynamic(
  () => import("@/components/chat/ChatPanel"),
  { ssr: false },
);

const CHROMELESS_PREFIXES = ["/admin", "/githubprofile"];
const MINIMAL_CHROME_PREFIXES = ["/visitor-map"];

function findElementByText(searchText: string): HTMLElement | null {
  const lower = searchText.toLowerCase();
  // Search within main content areas only (skip nav, chat, overlays)
  const contentRoots = document.querySelectorAll("main, article");
  const searchIn = contentRoots.length > 0 ? contentRoots : [document.body];

  for (const root of searchIn) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent || !node.textContent.toLowerCase().includes(lower)) continue;
      // Walk up to the nearest meaningful block element
      let parent = node.parentElement;
      while (parent && parent !== document.body && parent !== root) {
        const tag = parent.tagName.toLowerCase();
        const isBlock = ["div", "section", "li", "td", "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "figure"].includes(tag);
        if (isBlock && parent.textContent && parent.textContent.length < 800) {
          return parent;
        }
        parent = parent.parentElement;
      }
    }
  }
  return null;
}

function applyHighlight(el: HTMLElement) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.setAttribute("data-chat-highlight", "");
  setTimeout(() => {
    el.removeAttribute("data-chat-highlight");
  }, 3500);
}

/** Normalize a string for fuzzy comparison: lowercase, strip dashes/underscores/spaces */
function norm(s: string): string {
  return s.toLowerCase().replace(/[-_\s]+/g, "");
}

function useHighlightListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as CustomEvent).detail as string;
      if (!target) return;
      const lower = target.toLowerCase();
      const normed = norm(target);

      // Collect all highlightable elements on the page
      const allHighlightable = Array.from(document.querySelectorAll("[data-highlight-id]")) as HTMLElement[];

      // 1. Exact data-highlight-id or element id match
      const byAttr = document.querySelector(`[data-highlight-id="${target}"]`) as HTMLElement | null;
      if (byAttr) { applyHighlight(byAttr); return; }
      const byId = document.getElementById(target);
      if (byId) { applyHighlight(byId); return; }

      // 2. Normalized data-highlight-id match (dashes/spaces/case ignored)
      for (const el of allHighlightable) {
        const hid = norm(el.getAttribute("data-highlight-id") || "");
        if (hid === normed || hid.includes(normed) || normed.includes(hid)) {
          applyHighlight(el); return;
        }
      }

      // 3. Match by section type keyword in data-highlight-id
      //    e.g., "ingredients" matches elements whose highlight-id contains "ingredient"
      const stem = normed.replace(/s$/, ""); // simple depluralize
      for (const el of allHighlightable) {
        const hid = norm(el.getAttribute("data-highlight-id") || "");
        if (hid.includes(stem) || stem.includes(hid)) {
          applyHighlight(el); return;
        }
      }

      // 4. Search data-highlight-id elements whose visible heading/caption text matches
      for (const el of allHighlightable) {
        // Check headings, captions, and label-like elements inside
        const headings = el.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span");
        for (const h of headings) {
          const hText = norm(h.textContent || "");
          if (hText.includes(normed) || hText.includes(stem)) {
            applyHighlight(el); return;
          }
        }
      }

      // 5. Search data-highlight-id elements whose full text content matches
      for (const el of allHighlightable) {
        const text = norm(el.textContent || "");
        if (text.includes(normed) || text.includes(stem)) {
          applyHighlight(el); return;
        }
      }

      // 6. General text content search as last resort
      const byText = findElementByText(target);
      if (byText) { applyHighlight(byText); return; }
    };
    window.addEventListener("mdcran:highlight", handler);
    return () => window.removeEventListener("mdcran:highlight", handler);
  }, []);
}

export default function GlobalChrome() {
  const pathname = usePathname();
  useHighlightListener();

  if (pathname.startsWith("/terminal")) {
    return <TerminalExperience />;
  }

  if (CHROMELESS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  // Minimal chrome: only chat bubble + panel
  if (MINIMAL_CHROME_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return (
      <>
        <ChatBubble />
        <ChatPanel />
      </>
    );
  }

  return (
    <>
      <StatusBanner />
      <TerminalExperience />
      <KeyboardShortcuts />
      <ResumeButton />
      <ChatBubble />
      <ChatPanel />
      <ThemeOverlay />
      <ThemeEffectsOverlay />
      <SectionWheel />
    </>
  );
}
