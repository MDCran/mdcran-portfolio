/** Shared admin navigation only; no data access or server dependencies. */
export function contentEditorHref(collection: string, id: string) {
  return `/admin/dashboard/content-studio?${new URLSearchParams({ collection, record: id })}`;
}
export function assetReferenceEditorHref(collection: string, id: string): string | undefined {
  if (collection === "contentDrafts") {
    const separator = id.indexOf(":");
    if (separator > 0) return assetReferenceEditorHref(id.slice(0, separator), id.slice(separator + 1));
  }
  if (["projects", "articles", "clients"].includes(collection)) return contentEditorHref(collection, id);
  if (["experiences", "educations", "certifications", "awards", "clubs", "resumeProfile"].includes(collection)) return "/admin/dashboard/resume";
  if (collection === "siteContent") return "/admin/dashboard/site-content";
  return undefined;
}
