"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accessibility, X, Lock, Volume2, VolumeX, TerminalSquare, RotateCcw, Type, Eye, MousePointer2, ChevronDown,
} from "lucide-react";
import { useTheme, THEMES, type ThemeName } from "@/lib/ThemeContext";
import ScreenReaderPopups, { useScreenReader } from "@/components/shared/ScreenReader";
import { flagEmoji } from "@/lib/flag";
import PersonalIdentity from "@/components/shared/PersonalIdentity";

type Colorblind = "none" | "deuteranopia" | "protanopia" | "tritanopia";
type CursorMode = "default" | "large" | "circle" | "contrast";

interface A11yPrefs {
  textScale: number;
  motion: "reduce" | "allow";
  colorblind: Colorblind;
  cursor: CursorMode;
  language: "en" | "es";
  speakAloud: boolean;
  aiTone: "friendly" | "professional" | "concise";
}

const DEFAULTS: A11yPrefs = {
  textScale: 1, motion: "allow", colorblind: "none", cursor: "default", language: "en", speakAloud: true, aiTone: "friendly",
};
const KEY = "mdcran_a11y";

// Real cursor CSS (mirrors globals.css) so dropdown options can preview the actual cursor.
const CURSOR_CSS: Record<CursorMode, string> = {
  default: "default",
  large: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'%3E%3Cpath fill='white' stroke='black' stroke-width='1' d='M5 2l14 8-6 1.5L16 18l-2.5 1L10 12l-5 4z'/%3E%3C/svg%3E\") 4 2, auto",
  circle: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='rgba(239,66,66,0.25)' stroke='%23ef4242' stroke-width='2'/%3E%3C/svg%3E\") 16 16, auto",
  contrast: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffff00' stroke='black' stroke-width='1.5' d='M5 2l14 8-6 1.5L16 18l-2.5 1L10 12l-5 4z'/%3E%3C/svg%3E\") 4 2, auto",
};

function applyPrefs(p: A11yPrefs) {
  const html = document.documentElement;
  html.style.setProperty("--a11y-text-scale", String(p.textScale));
  html.setAttribute("data-motion", p.motion === "reduce" ? "reduce" : "");
  html.setAttribute("data-colorblind", p.colorblind === "none" ? "" : p.colorblind);
  html.setAttribute("data-cursor", p.cursor === "default" ? "" : p.cursor);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    localStorage.setItem("mdcran_voice_on", p.speakAloud ? "1" : "0");
    localStorage.setItem("mdcran_ai_tone", p.aiTone);
    window.dispatchEvent(new CustomEvent("mdcran:a11y", { detail: p }));
  } catch { /* */ }
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</p>
    {children}
  </div>
);
const seg = (active: boolean) =>
  `px-2 py-1 rounded-sm text-[11px] border transition-colors cursor-pointer ${active ? "a11y-seg-active" : "border-white/10 text-white/45 hover:text-white"}`;

interface DropOption<T> { value: T; label: string; swatch?: React.ReactNode; cursorPreview?: string }
function Dropdown<T extends string>({ value, options, onChange }: { value: T; options: DropOption<T>[]; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 h-9 px-2.5 rounded-sm border border-white/10 bg-white/4 text-xs text-white/70 hover:border-white/25 cursor-pointer transition-colors">
        <span className="flex items-center gap-2">{cur?.swatch}{cur?.label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-20 mt-1 rounded-sm border border-white/12 bg-[#0d0d0d] p-1 shadow-xl">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={o.cursorPreview ? { cursor: o.cursorPreview } : undefined}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-left transition-colors ${o.value === value ? "bg-[var(--cranberry)]/12 text-[var(--cranberry)]" : "text-white/60 hover:bg-white/5 cursor-pointer"}`}
              >
                {o.swatch}{o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AccessibilityMenu() {
  const pathname = usePathname();
  const { themeInfo, setTheme } = useTheme();
  const screenReader = useScreenReader();
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS);
  const [country, setCountry] = useState<string>("United States");
  const [countryCode, setCountryCode] = useState<string>("US");
  const [isMobile, setIsMobile] = useState(false);
  const prevThemeRef = useRef<ThemeName | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      const p = saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
      p.language = "en"; // Spanish not supported yet — always English
      setPrefs(p);
      applyPrefs(p);
    } catch { applyPrefs(DEFAULTS); }
  }, []);

  useEffect(() => {
    if (!open || countryCode !== "US") return;
    fetch("/api/geo").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.countryName) setCountry(d.countryName);
      if (d?.country) setCountryCode(d.country);
    }).catch(() => {});
  }, [open, countryCode]);

  const update = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs((prev) => { const next = { ...prev, ...patch }; applyPrefs(next); return next; });
  }, []);

  /* Let the AI assistant drive accessibility settings (text size, motion, colorblind,
     cursor, read-aloud, tone) by dispatching `mdcran:a11y-set` with a partial-prefs patch.
     A `reset: true` flag restores defaults. Theme/high-contrast go through ThemeContext. */
  useEffect(() => {
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent).detail as (Partial<A11yPrefs> & { reset?: boolean }) | undefined;
      if (!detail) return;
      if (detail.reset) { setPrefs(DEFAULTS); applyPrefs(DEFAULTS); return; }
      const patch: Partial<A11yPrefs> = {};
      if (typeof detail.textScale === "number") patch.textScale = Math.min(1.6, Math.max(0.85, detail.textScale));
      if (detail.motion === "reduce" || detail.motion === "allow") patch.motion = detail.motion;
      if (detail.colorblind) patch.colorblind = detail.colorblind;
      if (detail.cursor) patch.cursor = detail.cursor;
      if (typeof detail.speakAloud === "boolean") patch.speakAloud = detail.speakAloud;
      if (detail.aiTone) patch.aiTone = detail.aiTone;
      if (Object.keys(patch).length) update(patch);
    };
    window.addEventListener("mdcran:a11y-set", onSet);
    return () => window.removeEventListener("mdcran:a11y-set", onSet);
  }, [update]);

  const highContrastOn = themeInfo.id === "high-contrast";
  const isLightTheme = themeInfo.id === "light";
  const toggleHighContrast = () => {
    if (highContrastOn) setTheme((prevThemeRef.current as ThemeName) || "dark");
    else { prevThemeRef.current = themeInfo.id as ThemeName; setTheme("high-contrast"); }
  };

  const reset = () => {
    setPrefs(DEFAULTS);
    applyPrefs(DEFAULTS);
    if (highContrastOn) setTheme("dark");
    if (screenReader.enabled) screenReader.toggle();
  };

  const themeChoices = THEMES.filter((t) => t.id !== "high-contrast");

  if (pathname.startsWith("/admin") || pathname.startsWith("/rizz")) return null;

  return (
    <>
      <svg aria-hidden="true" className="absolute" width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="cb-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" /></filter>
          <filter id="cb-protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" /></filter>
          <filter id="cb-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" /></filter>
        </defs>
      </svg>

      <div ref={panelRef} className="fixed bottom-6 left-6 z-50">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Accessibility options"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-[#0d0d0d] text-white/70 hover:text-white hover:border-[var(--cranberry)]/50 hover:shadow-[0_4px_24px_rgba(239,66,66,0.18)] shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all cursor-pointer"
          >
            <Accessibility size={18} />
          </button>
        ) : (
          <div className="w-[min(calc(100vw-3rem),20rem)] max-h-[80vh] overflow-y-auto rounded-sm border border-white/12 bg-[#0b0b0b]/97 backdrop-blur-xl p-4 shadow-[0_24px_80px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-nord text-sm text-white flex items-center gap-2"><Accessibility size={15} className="text-[var(--cranberry)]" /> Accessibility</span>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <div className="flex gap-2">
              {isMobile ? (
                <span
                  title="The terminal isn't available on mobile"
                  aria-disabled="true"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm border text-[11px] cursor-not-allowed"
                  style={isLightTheme ? {
                    backgroundColor: "#ffffff",
                    backgroundImage: "linear-gradient(rgba(0,170,60,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(0,170,60,0.16) 1px, transparent 1px)",
                    backgroundSize: "8px 8px", color: "rgba(0,0,0,0.4)", borderColor: "rgba(0,150,50,0.3)",
                  } : {
                    backgroundColor: "rgba(0,18,4,0.45)",
                    backgroundImage: "linear-gradient(rgba(0,255,65,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.13) 1px, transparent 1px)",
                    backgroundSize: "8px 8px", color: "rgba(0,255,65,0.4)", borderColor: "rgba(0,255,65,0.2)",
                  }}
                ><Lock size={11} /> Terminal</span>
              ) : (
                <Link
                  href="/terminal"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm border text-[11px] cursor-pointer transition-colors"
                  style={isLightTheme ? {
                    backgroundColor: "#ffffff",
                    backgroundImage: "linear-gradient(rgba(0,170,60,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(0,170,60,0.16) 1px, transparent 1px)",
                    backgroundSize: "8px 8px", color: "#0a0a0a", borderColor: "rgba(0,150,50,0.45)",
                  } : {
                    backgroundColor: "rgba(0,18,4,0.55)",
                    backgroundImage: "linear-gradient(rgba(0,255,65,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.13) 1px, transparent 1px)",
                    backgroundSize: "8px 8px", color: "#00ff41", borderColor: "rgba(0,255,65,0.3)",
                  }}
                ><TerminalSquare size={12} /> Terminal</Link>
              )}
              <button onClick={screenReader.toggle} className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-sm border text-[11px] cursor-pointer ${screenReader.enabled ? "border-[var(--cranberry)]/45 text-[var(--cranberry)]" : "border-white/10 text-white/55 hover:text-white"}`}>
                {screenReader.enabled ? <Volume2 size={12} /> : <VolumeX size={12} />} {screenReader.enabled ? "Narrator On" : "Narrator Off"}
              </button>
            </div>

            <Section label="Theme">
              <div className="flex flex-wrap gap-1.5">
                {themeChoices.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-[11px] border cursor-pointer transition-colors ${themeInfo.id === t.id ? "border-[var(--cranberry)]/45 text-white" : "border-white/10 text-white/45 hover:text-white"}`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: t.background, boxShadow: `inset 0 0 0 2px ${t.primary}` }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </Section>

            <Section label="Display">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/55 flex items-center gap-1.5"><Eye size={12} /> High contrast</span>
                <button onClick={toggleHighContrast} className={seg(highContrastOn)}>{highContrastOn ? "On" : "Off"}</button>
              </div>
            </Section>

            <Section label="Color-blind mode">
              <Dropdown<Colorblind>
                value={prefs.colorblind}
                onChange={(v) => update({ colorblind: v })}
                options={(["none", "deuteranopia", "protanopia", "tritanopia"] as Colorblind[]).map((v) => ({
                  value: v,
                  label: v === "none" ? "None" : v.charAt(0).toUpperCase() + v.slice(1),
                  // Preview: a rainbow bar with the mode's filter applied, so you see the color shift.
                  swatch: (
                    <span
                      className="h-3.5 w-7 rounded-sm shrink-0 border border-white/10"
                      style={{
                        background: "linear-gradient(90deg,#ef4242,#f59e0b,#eab308,#22c55e,#3b82f6,#a855f7)",
                        filter: v === "none" ? undefined : `url(#cb-${v})`,
                      }}
                    />
                  ),
                }))}
              />
            </Section>

            <Section label="Text size">
              <div className="flex items-center gap-3">
                <Type size={12} className="text-white/40 shrink-0" />
                <input
                  type="range" min={0.85} max={1.4} step={0.05}
                  value={prefs.textScale}
                  onChange={(e) => update({ textScale: parseFloat(e.target.value) })}
                  className="flex-1 h-1.5 cursor-pointer accent-[var(--cranberry)]"
                />
                <span className="text-[11px] text-white/55 w-10 text-right tabular-nums">{Math.round(prefs.textScale * 100)}%</span>
                <button
                  onClick={() => update({ textScale: 1 })}
                  disabled={prefs.textScale === 1}
                  title="Reset to 100%"
                  aria-label="Reset text size to 100%"
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-sm border border-white/10 text-white/45 hover:text-white hover:border-white/25 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </Section>

            <Section label="Motion">
              <div className="flex gap-1.5">
                {(["allow", "reduce"] as const).map((m) => (
                  <button key={m} onClick={() => update({ motion: m })} className={seg(prefs.motion === m)}>{m === "allow" ? "Allow" : "Reduce"}</button>
                ))}
              </div>
            </Section>

            <Section label="Cursor">
              <Dropdown<CursorMode>
                value={prefs.cursor}
                onChange={(v) => update({ cursor: v })}
                options={(["default", "large", "circle", "contrast"] as CursorMode[]).map((c) => ({
                  value: c,
                  label: c.charAt(0).toUpperCase() + c.slice(1),
                  cursorPreview: CURSOR_CSS[c],
                  swatch: c === "circle"
                    ? <span className="h-3.5 w-3.5 rounded-full border-2 border-[#ef4242]" />
                    : <MousePointer2 size={c === "large" ? 16 : 12} className={c === "contrast" ? "text-yellow-400" : "text-white/70"} />,
                }))}
              />
            </Section>

            <Section label="AI Assistant">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/55">Speak replies aloud</span>
                <button onClick={() => update({ speakAloud: !prefs.speakAloud })} className={seg(prefs.speakAloud)}>{prefs.speakAloud ? "On" : "Off"}</button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 mt-2">Tone</p>
              <div className="flex flex-wrap gap-1.5">
                {(["friendly", "professional", "concise"] as const).map((t) => (
                  <button key={t} onClick={() => update({ aiTone: t })} className={seg(prefs.aiTone === t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                ))}
              </div>
            </Section>

            <Section label="Language">
              <div className="relative grid grid-cols-2 rounded-sm border border-white/10 bg-white/4 p-0.5 select-none">
                <div className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-sm bg-[var(--cranberry)] transition-transform duration-300" style={{ transform: "translateX(0)" }} />
                <button title="Language is locked to English" className="relative z-10 inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] tracking-wide" style={{ color: "var(--on-accent, #fff)" }}>
                  <Lock size={10} /> English
                </button>
                <button
                  disabled
                  title="Español isn't available yet"
                  className="relative z-10 py-1.5 text-[11px] tracking-wide cursor-not-allowed"
                  style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 28%, transparent)" }}
                >
                  Español
                </button>
              </div>
            </Section>

            <Section label="Location">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="text-lg leading-none">{flagEmoji(countryCode)}</span>
                <span>{country}</span>
                <Lock size={11} className="text-white/30 ml-auto" />
              </div>
              <p className="text-[10px] text-white/25 leading-snug mt-1">Locked to IP geolocation. Seeing the wrong country? Disable your VPN or route traffic through the correct region, then reopen this panel.</p>
            </Section>

            <Section label="Personal Identity">
              <PersonalIdentity />
            </Section>

            <button onClick={reset} className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-sm border border-white/10 text-[11px] text-white/50 hover:text-white hover:border-white/25 cursor-pointer">
              <RotateCcw size={12} /> Reset accessibility
            </button>
          </div>
        )}
      </div>

      <ScreenReaderPopups
        enabled={screenReader.enabled}
        reading={screenReader.reading}
        volume={screenReader.volume}
        onSpeak={screenReader.speak}
        onStop={screenReader.stop}
        onVolumeUp={screenReader.volumeUp}
        onVolumeDown={screenReader.volumeDown}
      />
    </>
  );
}
