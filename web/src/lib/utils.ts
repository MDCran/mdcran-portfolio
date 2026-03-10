import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImageAsset } from "./types";

const CDN_BASE_URL = (process.env.NEXT_PUBLIC_CDN_BASE_URL ?? "https://cdn.mdcran.com").replace(/\/+$/, "");
const CDN_ASSET_FILE_RE = /\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|mov|m4v|pdf|ico)$/i;
const LOCAL_ASSET_PREFIXES = ["/fonts/", "/icons/"];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function projectUrl(category: string, slug: string, subcategory?: string): string {
  if (category === "coding-projects") return `/code/${slug}`;
  return `/${category}/${subcategory ?? ""}/${slug}`.replace(/\/+/g, "/");
}

export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  const trimmed = path.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\/[^/]+\/cdn\//i, `${CDN_BASE_URL}/`);
  }

  if (trimmed.startsWith("/cdn/")) {
    return `${CDN_BASE_URL}/${trimmed.slice(5)}`;
  }

  if (trimmed.startsWith("cdn/")) {
    return `${CDN_BASE_URL}/${trimmed.slice(4)}`;
  }

  if (trimmed.startsWith("/")) {
    if (
      CDN_ASSET_FILE_RE.test(trimmed) &&
      !LOCAL_ASSET_PREFIXES.some((prefix) => trimmed.startsWith(prefix))
    ) {
      return `${CDN_BASE_URL}${trimmed}`;
    }

    return trimmed;
  }

  return `${CDN_BASE_URL}/${trimmed}`;
}

export function imageAssetSrc(image?: string | ImageAsset | null): string | undefined {
  if (!image) return undefined;
  return assetUrl(typeof image === "string" ? image : image.src);
}

export function shouldBypassImageOptimization(src?: string | null): boolean {
  if (!src) return false;

  try {
    return new URL(src).hostname === "cdn.mdcran.com";
  } catch {
    return false;
  }
}

export function imageAssetAlt(image: string | ImageAsset | null | undefined, fallback: string): string {
  if (!image) return fallback;
  if (typeof image === "string") return fallback;
  return image.alt?.trim() || fallback;
}

export function toImageAsset(image?: string | ImageAsset | null): ImageAsset {
  if (!image) {
    return { src: "", alt: "" };
  }

  if (typeof image === "string") {
    return { src: image, alt: "" };
  }

  return {
    src: image.src ?? "",
    alt: image.alt ?? "",
  };
}
