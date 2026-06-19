"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/lib/i18n";

// Country code (ISO 3166-1 alpha-2) → BCP-47 language code
const COUNTRY_LANG: Record<string, string> = {
  US: "en-US", GB: "en-US", CA: "en-US", AU: "en-US", NZ: "en-US", IE: "en-US", ZA: "en-US",
  ES: "es-ES", MX: "es-ES", AR: "es-ES", CO: "es-ES", PE: "es-ES", CL: "es-ES", VE: "es-ES", EC: "es-ES", GT: "es-ES", CU: "es-ES",
  FR: "fr-FR", BE: "fr-FR", LU: "fr-FR", CH: "fr-FR",
  DE: "de-DE", AT: "de-DE",
  BR: "pt-BR", PT: "pt-BR",
  JP: "ja-JP",
  CN: "zh-CN", TW: "zh-CN", HK: "zh-CN", SG: "zh-CN",
  KR: "ko-KR",
  SA: "ar-SA", AE: "ar-SA", EG: "ar-SA", IQ: "ar-SA", MA: "ar-SA", JO: "ar-SA", KW: "ar-SA", QA: "ar-SA",
  IN: "hi-IN",
  IT: "it-IT",
  RU: "ru-RU", BY: "ru-RU",
  NL: "nl-NL",
  PL: "pl-PL",
  TR: "tr-TR",
};

export default function LanguageSelector() {
  const { currentLang, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [recommendedLang, setRecommendedLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Fetch geo to recommend a language based on IP country.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/geo");
        if (!res.ok) return;
        const data = await res.json() as { country?: string };
        const country = data.country;
        if (country && COUNTRY_LANG[country]) setRecommendedLang(COUNTRY_LANG[country]);
      } catch { /* non-critical */ }
    })();
  }, []);

  // Track translation progress events from PageTranslator.
  useEffect(() => {
    const onStart = () => setIsTranslating(true);
    const onEnd = () => setIsTranslating(false);
    window.addEventListener("mdcran:translate-start", onStart);
    window.addEventListener("mdcran:translate-end", onEnd);
    return () => {
      window.removeEventListener("mdcran:translate-start", onStart);
      window.removeEventListener("mdcran:translate-end", onEnd);
    };
  }, []);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ?? SUPPORTED_LANGUAGES[0];
  const shortNative = current.nativeName.split(/[\s(]/)[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 h-9 px-2.5 rounded-sm border border-white/10 bg-white/[0.04] text-xs text-white/70 hover:border-white/25 hover:text-white cursor-pointer transition-colors w-full justify-between"
      >
        <span className="flex items-center gap-1.5">
          {isTranslating
            ? <Loader2 size={12} className="animate-spin shrink-0 text-[#ef4242]" />
            : <span aria-hidden="true">{current.flag}</span>
          }
          <span>{isTranslating ? "Applying…" : shortNative}</span>
        </span>
        <ChevronDown size={13} className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Select language"
            className="absolute left-0 right-0 z-20 mt-1 rounded-sm border border-white/10 bg-[#0b0b0b] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.7)] max-h-64 overflow-y-auto"
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === currentLang;
              const isRecommended = lang.code === recommendedLang && lang.code !== currentLang;
              const shortLabel = lang.nativeName.split(/[\s(]/)[0];
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => { setLanguage(lang.code); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm text-xs text-left transition-colors ${
                    isActive
                      ? "bg-[var(--cranberry,#ef4242)]/10 text-[var(--cranberry,#ef4242)]"
                      : "text-white/60 hover:bg-white/5 hover:text-white cursor-pointer"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-sm leading-none">{lang.flag}</span>
                    <span className="flex flex-col leading-tight">
                      <span>{shortLabel}</span>
                      {lang.nativeName !== lang.name && (
                        <span className="text-[10px] opacity-50">{lang.name}</span>
                      )}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isRecommended && (
                      <span className="text-[9px] uppercase tracking-wide text-[#ef4242]/80 border border-[#ef4242]/30 rounded-sm px-1 py-0.5 leading-none">
                        Recommended
                      </span>
                    )}
                    {isActive && <Check size={11} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
