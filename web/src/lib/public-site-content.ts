import type { SiteContent } from "./types";

/** Personal invitation settings belong to the admin and gated page routes only. */
export function publicSiteContent(content: SiteContent): SiteContent {
  return Object.fromEntries(
    Object.entries(content).filter(([key]) => !key.startsWith("rizz") && key !== "secretPages"),
  ) as SiteContent;
}
