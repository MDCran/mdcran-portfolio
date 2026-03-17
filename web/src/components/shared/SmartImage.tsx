"use client";

import { useEffect, useRef, useState } from "react";

interface SmartImageProps {
  src: string;
  alt?: string;
  caption?: string;
  onClick?: () => void;
}

/**
 * An image that auto-detects portrait orientation and renders at half-width
 * to prevent tall phone screenshots from taking the full article width.
 * Portrait = height > width * 1.1 (slight threshold to avoid square images being halved).
 *
 * Uses CSS class `data-portrait` so parents can group consecutive portrait images side-by-side.
 */
export default function SmartImage({ src, alt = "", caption, onClick }: SmartImageProps) {
  const [isPortrait, setIsPortrait] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      setIsPortrait(img.naturalHeight > img.naturalWidth * 1.1);
      setLoaded(true);
    };
    img.onerror = () => setLoaded(true);
    img.src = src;
  }, [src]);

  return (
    <figure
      className={`my-4 ${isPortrait ? "inline-block align-top px-1" : "block"}`}
      style={isPortrait ? { width: "calc(50% - 4px)" } : undefined}
      data-portrait={isPortrait ? "" : undefined}
    >
      <div
        className="relative rounded-sm overflow-hidden border border-white/8 cursor-pointer group bg-black/30"
        onClick={onClick}
        style={!loaded ? { minHeight: "120px" } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-500"
          style={!loaded ? { opacity: 0 } : undefined}
        />
      </div>
      {caption && (
        <figcaption className="text-[10px] text-white/30 text-center mt-2">{caption}</figcaption>
      )}
    </figure>
  );
}
