"use client";

import useSWR from "swr";
import { imageAssetSrc } from "@/lib/utils";
import { formatPublishDate } from "@/lib/read-time";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));
const DEFAULT_LOGO = "/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png";

/** "[logo] MDCran · Aug 1, 2025 · 2 min read" — the brand byline used on cards and detail pages. */
export default function AuthorByline({
  date,
  minutes,
  size = "sm",
  className = "",
}: {
  date?: string;
  minutes: number;
  size?: "sm" | "md";
  className?: string;
}) {
  // SWR dedupes this across every card on the page → one shared request.
  const { data } = useSWR<{ brandLogoUrl?: string }>("/api/data/site-content", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000,
  });
  const logo = (data?.brandLogoUrl ? imageAssetSrc(data.brandLogoUrl) ?? data.brandLogoUrl : DEFAULT_LOGO) || DEFAULT_LOGO;
  const text = size === "md" ? "text-xs" : "text-[10px]";
  const logoSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const formatted = formatPublishDate(date);

  return (
    <div className={`flex items-center gap-1.5 ${text} ${className}`} style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 40%, transparent)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="MDCran" className={`${logoSize} rounded-sm object-contain shrink-0`} />
      <span className="font-medium" style={{ color: "color-mix(in srgb, var(--theme-text, #fff) 65%, transparent)" }}>MDCran</span>
      {formatted && <><span className="opacity-50">·</span><span>{formatted}</span></>}
      <span className="opacity-50">·</span>
      <span>{minutes} min read</span>
    </div>
  );
}
