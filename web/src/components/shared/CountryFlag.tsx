"use client";

import { useState } from "react";

/** Local SVGs render consistently even on systems without flag emoji support. */
export default function CountryFlag({ countryCode, label }: { countryCode?: string | null; label?: string }) {
  const code = countryCode?.trim().toLowerCase() ?? "";
  const valid = /^[a-z]{2}$/.test(code);
  const [failedCode, setFailedCode] = useState<string | null>(null);
  const description = label ?? `${code.toUpperCase() || "Unknown country"} flag`;
  return (
    <span className="inline-flex h-[15px] w-5 shrink-0 items-center justify-center overflow-hidden rounded-[2px] align-middle">
      {valid && failedCode !== code ? (
        // These small SVGs are served directly, without image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/flags/${code}.svg`} alt={description} width={20} height={15}
          className="h-full w-full object-cover" onError={() => setFailedCode(code)} />
      ) : (
        <span className="text-[9px] leading-none text-white/50" role={description ? "img" : undefined}
          aria-label={description || undefined} aria-hidden={!description || undefined}>{valid ? code.toUpperCase() : "—"}</span>
      )}
    </span>
  );
}
