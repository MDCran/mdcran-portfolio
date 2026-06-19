"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { LanguageProvider, useLanguage, getLanguageCode } from "@/lib/i18n";
import AccessibilityMenu from "@/components/shared/AccessibilityMenu";
import ScrollProgress from "@/components/shared/ScrollProgress";
import PageTranslator from "@/components/shared/PageTranslator";
import CookieConsent from "@/components/shared/CookieConsent";
import ExternalLinkGuard from "@/components/shared/ExternalLinkGuard";
import MoodEngine from "@/components/shared/MoodEngine";
import IdentityTracker from "@/components/shared/IdentityTracker";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import ChatBubble from "@/components/chat/ChatBubble";
import ThemeOverlay from "@/components/shared/ThemeOverlay";
import ThemeEffectsOverlay from "@/components/shared/ThemeEffectsOverlay";
import StatusBanner from "@/components/status/StatusBanner";
import SectionWheel from "@/components/shared/SectionWheel";
import { findTarget } from "@/lib/find-target";

const TerminalExperience = dynamic(
  () => import("@/components/terminal/TerminalExperience"),
  { ssr: false },
);

const ChatPanel = dynamic(
  () => import("@/components/chat/ChatPanel"),
  { ssr: false },
);

const VoiceMode = dynamic(
  () => import("@/components/chat/VoiceMode"),
  { ssr: false },
);

const AssistantTutorial = dynamic(
  () => import("@/components/chat/AssistantTutorial"),
  { ssr: false },
);

const ProjectsTour = dynamic(
  () => import("@/components/chat/ProjectsTour"),
  { ssr: false },
);

const GhostCursor = dynamic(
  () => import("@/components/chat/GhostCursor"),
  { ssr: false },
);

const AIBrowserCursor = dynamic(
  () => import("@/components/chat/AIBrowserCursor"),
  { ssr: false },
);

const LANG_WARNINGS: Record<string, string> = {
  es: "Algunas funciones pueden no ser óptimas en idiomas distintos al inglés.",
  fr: "Certaines fonctionnalités peuvent ne pas être optimales dans d'autres langues.",
  de: "Einige Funktionen sind in anderen Sprachen möglicherweise nicht optimal.",
  pt: "Alguns recursos podem não ser ideais em idiomas diferentes do inglês.",
  ja: "一部の機能は英語以外では最適に動作しない場合があります。",
  zh: "某些功能在英语以外的语言中可能无法最佳运行。",
  ko: "일부 기능은 영어 이외의 언어에서 최적으로 작동하지 않을 수 있습니다.",
  ar: "قد لا تعمل بعض الميزات بشكل مثالي بلغات أخرى.",
  hi: "कुछ सुविधाएं अन्य भाषाओं में इष्टतम नहीं हो सकती हैं।",
  it: "Alcune funzioni potrebbero non essere ottimali in altre lingue.",
  ru: "Некоторые функции могут не работать оптимально на других языках.",
  nl: "Sommige functies werken mogelijk niet optimaal in andere talen.",
  pl: "Niektóre funkcje mogą nie działać optymalnie w innych językach.",
  tr: "Bazı özellikler diğer dillerde en iyi şekilde çalışmayabilir.",
};

function LanguageWarning() {
  const { currentLang } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const code = getLanguageCode(currentLang);
  const isNonEnglish = code !== "en";
  const msg = isNonEnglish ? (LANG_WARNINGS[code] ?? null) : null;

  // Reset dismiss when language changes.
  useEffect(() => { setDismissed(false); }, [currentLang]);

  if (!msg || dismissed) return null;
  return (
    <div className="fixed bottom-20 left-4 z-[9998] max-w-[min(280px,calc(100vw-2rem))] rounded-sm border border-white/10 bg-black/80 px-3 py-2 text-[10px] text-white/45 backdrop-blur-xl shadow-lg flex items-start gap-2">
      <span className="flex-1 leading-relaxed">{msg}</span>
      <button onClick={() => setDismissed(true)} className="mt-0.5 text-white/25 hover:text-white/60 shrink-0 leading-none">✕</button>
    </div>
  );
}

const CHROMELESS_PREFIXES = ["/admin", "/githubprofile", "/2d-pong"];
const MINIMAL_CHROME_PREFIXES = ["/visitor-map"];

function applyHighlight(el: HTMLElement) {
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.setAttribute("data-chat-highlight", "");
  setTimeout(() => {
    el.removeAttribute("data-chat-highlight");
  }, 3500);
  // Move the AI browser cursor to the highlighted element.
  const rect = el.getBoundingClientRect();
  window.dispatchEvent(new CustomEvent("mdcran:cursor-move", {
    detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
  }));
}

/* ── Zoom / emphasize focus mode (agent-driven UI control) ── */
let focusOverlay: HTMLDivElement | null = null;
let focusedEl: HTMLElement | null = null;
let savedStyle: Partial<CSSStyleDeclaration> | null = null;

function clearFocus() {
  if (focusOverlay) {
    const o = focusOverlay;
    o.style.opacity = "0";
    setTimeout(() => o.remove(), 320);
    focusOverlay = null;
  }
  if (focusedEl && savedStyle) {
    const el = focusedEl;
    const ss = savedStyle;
    el.style.transform = ss.transform ?? "";
    el.style.boxShadow = ss.boxShadow ?? "";
    setTimeout(() => {
      el.style.position = ss.position ?? "";
      el.style.zIndex = ss.zIndex ?? "";
      el.style.transition = ss.transition ?? "";
      el.style.borderRadius = ss.borderRadius ?? "";
    }, 380);
  }
  focusedEl = null;
  savedStyle = null;
}

function focusElement(el: HTMLElement, mode: "zoom" | "emphasize") {
  clearFocus();
  el.scrollIntoView({ behavior: "smooth", block: "center" });

  // Frosted "isolation portal" backdrop — slides in under the lifted element.
  focusOverlay = document.createElement("div");
  Object.assign(focusOverlay.style, {
    position: "fixed", inset: "0", zIndex: "90",
    background: "rgba(4,4,6,0.5)",
    backdropFilter: "blur(20px) saturate(120%)", WebkitBackdropFilter: "blur(20px) saturate(120%)",
    opacity: "0", transition: "opacity 0.4s ease", cursor: "pointer",
  } as Partial<CSSStyleDeclaration>);
  focusOverlay.addEventListener("click", clearFocus);
  document.body.appendChild(focusOverlay);
  requestAnimationFrame(() => { if (focusOverlay) focusOverlay.style.opacity = "1"; });

  const cs = el.style;
  savedStyle = {
    position: cs.position, zIndex: cs.zIndex, transform: cs.transform,
    transition: cs.transition, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius,
  };
  focusedEl = el;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.zIndex = "95";
  el.style.transition = "transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.5s ease";
  // Lift the element off the page on the Z-axis (layered-glass feel).
  if (mode === "zoom") {
    el.style.transform = "perspective(1400px) translateZ(70px) scale(1.04)";
    el.style.boxShadow = "0 0 0 1.5px rgba(239,66,66,0.6), 0 50px 120px -20px rgba(0,0,0,0.75), 0 0 60px rgba(239,66,66,0.22)";
  } else {
    el.style.transform = "perspective(1400px) translateZ(50px) scale(1.02)";
    el.style.borderRadius = cs.borderRadius || "10px";
    el.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.18), 0 44px 100px -16px rgba(0,0,0,0.7), 0 0 50px rgba(239,66,66,0.28)";
  }
}

function useAgentUiListeners() {
  useEffect(() => {
    const onHighlight = (e: Event) => {
      const target = (e as CustomEvent).detail as string;
      if (!target) return;
      const el = findTarget(target);
      if (el) applyHighlight(el);
    };
    const onZoom = (e: Event) => {
      const target = (e as CustomEvent).detail as string;
      const el = target ? findTarget(target) : null;
      if (el) focusElement(el, "zoom");
    };
    const onEmphasize = (e: Event) => {
      const target = (e as CustomEvent).detail as string;
      const el = target ? findTarget(target) : null;
      if (el) focusElement(el, "emphasize");
    };
    const onReset = () => clearFocus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clearFocus(); };

    window.addEventListener("mdcran:highlight", onHighlight);
    window.addEventListener("mdcran:zoom", onZoom);
    window.addEventListener("mdcran:emphasize", onEmphasize);
    window.addEventListener("mdcran:resetzoom", onReset);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mdcran:highlight", onHighlight);
      window.removeEventListener("mdcran:zoom", onZoom);
      window.removeEventListener("mdcran:emphasize", onEmphasize);
      window.removeEventListener("mdcran:resetzoom", onReset);
      window.removeEventListener("keydown", onKey);
      clearFocus();
    };
  }, []);
}

export default function GlobalChrome() {
  const pathname = usePathname();
  useAgentUiListeners();

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
        <VoiceMode />
      </>
    );
  }

  // The Rizz and Bar experiences hide the floating buttons (assistant, scroll-to-top,
  // accessibility) so nothing covers the full-screen game/slot. (/2d-pong is fully
  // chromeless above.)
  const hideFunChrome = ["/rizz", "/bar"].some((p) => pathname.startsWith(p));

  return (
    <LanguageProvider>
      <PageTranslator />
      <StatusBanner />
      <TerminalExperience />
      <KeyboardShortcuts />
      {!hideFunChrome && <AccessibilityMenu />}
      {!hideFunChrome && <ScrollProgress />}
      {!hideFunChrome && (
        <>
          <ChatBubble />
          <ChatPanel />
          <VoiceMode />
          <AssistantTutorial />
          <ProjectsTour />
        </>
      )}
      <GhostCursor />
      <AIBrowserCursor />
      <ThemeOverlay />
      <ThemeEffectsOverlay />
      <SectionWheel />
      <CookieConsent />
      <ExternalLinkGuard />
      <MoodEngine />
      <IdentityTracker />
      <LanguageWarning />
    </LanguageProvider>
  );
}
