"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Mail, Palette, Star, TerminalSquare, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import ScreenReaderPopups, { useScreenReader } from "@/components/shared/ScreenReader";

export default function ResumeButton() {
  const pathname = usePathname();
  const { themeInfo } = useTheme();
  const screenReader = useScreenReader();

  if (pathname.startsWith("/admin") || pathname.startsWith("/rizz")) return null;

  const showResume = true;
  const showContact = true;
  const showTerminal = !pathname.startsWith("/terminal");
  const isLight = themeInfo.id === "light";

  const btnBase =
    "flex h-10 items-center justify-center rounded-sm transition-all duration-200 backdrop-blur-sm text-[11px] tracking-widest uppercase";
  const btnTheme = isLight
    ? "bg-white/90 border border-black/12 hover:border-[var(--cranberry)]/50 text-black/60 hover:text-black shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(217,54,54,0.12)]"
    : "bg-[#0d0d0d] border border-white/12 hover:border-[var(--cranberry)]/50 text-white/60 hover:text-white shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_24px_rgba(239,66,66,0.15)]";

  const buttonClassName = `${btnBase} ${btnTheme} w-10 md:h-10 md:w-[7.5rem] md:justify-start md:gap-2 md:px-4`;

  const iconBase =
    "flex h-10 w-10 items-center justify-center rounded-sm transition-all duration-200 backdrop-blur-sm cursor-pointer";
  const iconTheme = isLight
    ? "bg-white/90 border border-black/12 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
    : "bg-[#0d0d0d] border border-white/12 shadow-[0_4px_24px_rgba(0,0,0,0.5)]";
  const iconOnlyClassName = `${iconBase} ${iconTheme}`;

  const tooltipClassName =
    "pointer-events-none absolute left-0 bottom-full mb-2 whitespace-nowrap rounded bg-[#111]/95 border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 backdrop-blur-md";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: 12 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-3"
    >
      {showResume && (
        <div className="flex flex-row gap-3 items-center">
          <div className="group relative hidden md:block">
            <button
              type="button"
              aria-label="Open Project Mercury prompt"
              onClick={() => window.dispatchEvent(new Event("mercury:expand"))}
              className={`${iconOnlyClassName} hover:border-[#f4c542]/45 hover:shadow-[0_4px_24px_rgba(244,197,66,0.14)]`}
            >
              <Star size={14} className="text-[#f4c542]" fill="currentColor" />
            </button>
            <span className={tooltipClassName}>
              Army Reserve Mercury
            </span>
          </div>
          <Link href="/resume" className={buttonClassName}>
            <FileText size={12} className="text-[var(--cranberry)]" />
            <span className="hidden md:inline">Resume</span>
          </Link>
        </div>
      )}
      {showContact && (
        <div className="flex flex-row gap-3 items-center">
          {showTerminal && (
            <div className="group relative hidden md:block">
              <Link
                href="/terminal"
                className={`${iconOnlyClassName} ${
                  isLight
                    ? "hover:border-black/25 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
                    : "hover:border-white/30 hover:shadow-[0_4px_24px_rgba(255,255,255,0.08)]"
                }`}
              >
                <TerminalSquare size={14} className={isLight ? "text-black/70" : "text-white/70"} />
              </Link>
              <span className={tooltipClassName}>
                Terminal Mode
              </span>
            </div>
          )}
          <Link href="/contact" className={buttonClassName}>
            <Mail size={12} className="text-[var(--cranberry)]" />
            <span className="hidden md:inline">Contact</span>
          </Link>
        </div>
      )}

      {/* Theme + Screen Reader row */}
      <div className="flex flex-row gap-3 items-center">
        {/* Screen reader toggle — desktop only */}
        <div className="group relative hidden md:block">
          <button
            type="button"
            onClick={screenReader.toggle}
            className={`${iconOnlyClassName} ${
              screenReader.enabled
                ? isLight
                  ? "border-[var(--cranberry)]/50 shadow-[0_4px_24px_rgba(217,54,54,0.12)]"
                  : "border-[var(--cranberry)]/50 shadow-[0_4px_24px_rgba(239,66,66,0.15)]"
                : isLight
                  ? "hover:border-black/25 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
                  : "hover:border-white/30 hover:shadow-[0_4px_24px_rgba(255,255,255,0.08)]"
            }`}
            aria-label={screenReader.enabled ? "Disable screen reader" : "Enable screen reader"}
          >
            {screenReader.enabled ? (
              <Volume2 size={14} className="text-[var(--cranberry)]" />
            ) : (
              <VolumeX size={14} className={isLight ? "text-black/50" : "text-white/50"} />
            )}
          </button>
          <span className={tooltipClassName}>
            {screenReader.enabled ? "Reader On" : "Screen Reader"}
          </span>
        </div>

        {/* Theme button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("mdcran:toggle-theme"))}
          className={`${buttonClassName} cursor-pointer`}
          aria-label="Change theme"
        >
          <Palette size={12} style={{ color: themeInfo.primary }} />
          <span className="hidden md:inline">Theme</span>
        </button>
      </div>

      {/* Screen reader floating popups */}
      <ScreenReaderPopups
        enabled={screenReader.enabled}
        reading={screenReader.reading}
        volume={screenReader.volume}
        onSpeak={screenReader.speak}
        onStop={screenReader.stop}
        onVolumeUp={screenReader.volumeUp}
        onVolumeDown={screenReader.volumeDown}
      />
    </motion.div>
  );
}
