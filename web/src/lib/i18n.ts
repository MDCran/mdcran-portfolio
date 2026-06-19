"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface LanguageDefinition {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: "en-US", name: "English",              nativeName: "English",             flag: "🇺🇸" },
  { code: "es-ES", name: "Spanish",              nativeName: "Español",             flag: "🇪🇸" },
  { code: "fr-FR", name: "French",               nativeName: "Français",            flag: "🇫🇷" },
  { code: "de-DE", name: "German",               nativeName: "Deutsch",             flag: "🇩🇪" },
  { code: "pt-BR", name: "Portuguese (Brazil)",  nativeName: "Português (Brasil)",  flag: "🇧🇷" },
  { code: "ja-JP", name: "Japanese",             nativeName: "日本語",              flag: "🇯🇵" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文（简体）",        flag: "🇨🇳" },
  { code: "ko-KR", name: "Korean",               nativeName: "한국어",              flag: "🇰🇷" },
  { code: "ar-SA", name: "Arabic",               nativeName: "العربية",             flag: "🇸🇦" },
  { code: "hi-IN", name: "Hindi",                nativeName: "हिन्दी",             flag: "🇮🇳" },
  { code: "it-IT", name: "Italian",              nativeName: "Italiano",            flag: "🇮🇹" },
  { code: "ru-RU", name: "Russian",              nativeName: "Русский",             flag: "🇷🇺" },
  { code: "nl-NL", name: "Dutch",                nativeName: "Nederlands",          flag: "🇳🇱" },
  { code: "pl-PL", name: "Polish",               nativeName: "Polski",              flag: "🇵🇱" },
  { code: "tr-TR", name: "Turkish",              nativeName: "Türkçe",              flag: "🇹🇷" },
];

const LANG_STORAGE_KEY = "mdcran_language";

export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function getLanguageCode(bcp47: string): string {
  return bcp47.split("-")[0].toLowerCase();
}

export async function translate(text: string, targetLang: string, sourceLang = "en-US"): Promise<string> {
  if (targetLang === sourceLang || getLanguageCode(targetLang) === getLanguageCode(sourceLang)) return text;
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: getLanguageCode(sourceLang), target: getLanguageCode(targetLang) }),
    });
    if (!res.ok) return text;
    const data = await res.json() as { translatedText?: string };
    return typeof data.translatedText === "string" ? data.translatedText : text;
  } catch {
    return text;
  }
}

interface LanguageContextValue {
  currentLang: string;
  setLanguage: (code: string) => void;
  translate: (text: string) => Promise<string>;
}

export const LanguageContext = createContext<LanguageContextValue>({
  currentLang: "en-US",
  setLanguage: () => {},
  translate: (text) => Promise.resolve(text),
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLang] = useState<string>("en-US");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) setCurrentLang(stored);
    } catch { /* localStorage unavailable */ }
  }, []);

  const setLanguage = useCallback((code: string) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === code)) return;
    setCurrentLang(code);
    try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch { /* */ }
    window.dispatchEvent(new CustomEvent("mdcran:language-change", { detail: { code } }));
  }, []);

  const translateFn = useCallback((text: string) => translate(text, currentLang, "en-US"), [currentLang]);

  return React.createElement(LanguageContext.Provider, { value: { currentLang, setLanguage, translate: translateFn } }, children);
}
