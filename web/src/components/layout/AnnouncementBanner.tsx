"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { SkillIcon } from "@/lib/skill-icons";
import type { SiteContentBanner } from "@/lib/types";

export default function AnnouncementBanner({ banner }: { banner?: SiteContentBanner | null }) {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Dismissal is keyed to the message so a new announcement re-appears.
  const dismissKey = banner?.message ? `mdcran_banner_${banner.message.slice(0, 40)}` : "";

  const startsAt = banner?.startsAt;
  const endsAt = banner?.endsAt;
  const subscribe = useCallback((notify: () => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const now = Date.now();
      const next = [startsAt, endsAt].filter(Boolean).map(value => new Date(value!).getTime() + 1).filter(value => value > now).sort((a, b) => a - b)[0];
      if (next !== undefined) timer = setTimeout(() => { notify(); schedule(); }, Math.min(next - now, 2_147_483_647));
    };
    schedule();
    window.addEventListener("storage", notify);
    document.addEventListener("visibilitychange", notify);
    return () => { clearTimeout(timer); window.removeEventListener("storage", notify); document.removeEventListener("visibilitychange", notify); };
  }, [startsAt, endsAt]);
  const snapshot = useCallback(() => {
    const now = Date.now();
    if (startsAt && new Date(startsAt).getTime() > now) return false;
    if (endsAt && new Date(endsAt).getTime() < now) return false;
    try { return !dismissKey || localStorage.getItem(dismissKey) !== "1"; } catch { return true; }
  }, [dismissKey, startsAt, endsAt]);
  const available = useSyncExternalStore(subscribe, snapshot, () => false);

  if (!banner?.enabled || !banner.message.trim() || dismissedKey === dismissKey || !available) return null;
  const justify = banner.align === "left" ? "justify-start" : banner.align === "right" ? "justify-end" : "justify-center";

  return (
    <div
      className="relative z-[60] w-full text-xs sm:text-[13px] font-jb"
      style={{ background: banner.bgColor, color: banner.textColor }}
    >
      <div className="content-container py-2 flex items-center gap-3">
        <div className={`flex-1 flex items-center gap-2 ${justify}`}>
          {banner.icon && <SkillIcon name={banner.icon} size={15} style={{ color: banner.textColor }} className="shrink-0" />}
          <span className="leading-snug">{banner.message}</span>
          {banner.ctaLabel && banner.ctaHref && (
            <Link
              href={banner.ctaHref}
              className="ml-2 shrink-0 inline-flex items-center rounded-sm border px-2.5 py-0.5 text-[11px] tracking-wide uppercase transition-opacity hover:opacity-80"
              style={{ borderColor: banner.textColor, color: banner.textColor }}
            >
              {banner.ctaLabel}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissedKey(dismissKey);
            try { if (dismissKey) localStorage.setItem(dismissKey, "1"); } catch { /* */ }
          }}
          aria-label="Dismiss announcement"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: banner.textColor }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
