import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function projectUrl(category: string, slug: string, subcategory?: string): string {
  if (category === "coding-projects") return `/code/${slug}`;
  return `/${category}/${subcategory ?? ""}/${slug}`.replace(/\/+/g, "/");
}
