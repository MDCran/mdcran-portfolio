"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { SUPPORTED_LANGUAGES, useLanguage } from "@/lib/i18n";

export default function LanguageSelector() {
  const { currentLang, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

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
          <span aria-hidden="true">{current.flag}</span>
          <span>{shortNative}</span>
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
                  {isActive && <Check size={11} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
