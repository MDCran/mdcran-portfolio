import type { ProfilePublication } from "./profile-publication";

/** Conditional GET shares the canonical public snapshot without exposing raw CMS data. */
export function profilePublicationResponse(snapshot: ProfilePublication, ifNoneMatch: string | null) {
  const etag = `W/"${snapshot.hash}"`; // generatedAt may differ while content is equivalent.
  const headers = {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "ETag": etag,
    "X-Publication-Hash": snapshot.hash,
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
  };
  const matches = ifNoneMatch?.split(",").some((value) => {
    const normalized = value.trim();
    return normalized === "*" || normalized.replace(/^W\//, "") === `"${snapshot.hash}"`;
  });
  if (matches) return new Response(null, { status: 304, headers });
  return Response.json(snapshot, { headers });
}
