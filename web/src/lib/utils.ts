import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImageAsset } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function projectUrl(category: string, slug: string, subcategory?: string): string {
  if (category === "coding-projects") return `/code/${slug}`;
  return `/${category}/${subcategory ?? ""}/${slug}`.replace(/\/+/g, "/");
}

export function imageAssetSrc(image?: string | ImageAsset | null): string | undefined {
  if (!image) return undefined;
  return typeof image === "string" ? image : image.src;
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
