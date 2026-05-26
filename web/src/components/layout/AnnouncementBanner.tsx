"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { resolveSkillIcon } from "@/lib/skill-icons";
import type { SiteContentBanner } from "@/lib/types";

export default function AnnouncementBanner({ banner }: { banner?: SiteContentBanner | null }) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash; enable after checks
  const [now, setNow] = useState<number | null>(null);

  // Dismissal is keyed to the message so a new announcement re-appears.
  const dismissKey = banner?.message ? `mdcran_banner_${banner.message.slice(0, 40)}` : "";

  useEffect(() => {
    if (!banner?.enabled || !banner.message.trim()) { setDismissed(true); return; }
    setNow(Date.now());
    try {
      setDismissed(dismissKey ? localStorage.getItem(dismissKey) === "1" : false);
    } catch {
      setDismissed(false);
    }
  }, [banner?.enabled, banner?.message, dismissKey]);

  if (!banner?.enabled || !banner.message.trim() || dismissed || now == null) return null;

  // Date window
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return null;
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) return null;

  const Icon = banner.icon ? resolveSkillIcon(banner.icon) : null;
  const justify = banner.align === "left" ? "justify-start" : banner.align === "right" ? "justify-end" : "justify-center";

  return (
    <div
      className="relative z-[60] w-full text-xs sm:text-[13px] font-jb"
      style={{ background: banner.bgColor, color: banner.textColor }}
    >
      <div className="content-container py-2 flex items-center gap-3">
        <div className={`flex-1 flex items-center gap-2 ${justify}`}>
          {Icon && <Icon size={15} style={{ color: banner.textColor }} className="shrink-0" />}
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
            setDismissed(true);
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
