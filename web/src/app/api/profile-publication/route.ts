import { getProfilePublication } from "@/lib/profile-publication";
import { profilePublicationResponse } from "@/lib/profile-publication-response";

export const dynamic = "force-dynamic";
/** Public, read-only projection also used by /githubprofile and admin exports. */
export async function GET(request: Request) {
  try {
    return profilePublicationResponse(await getProfilePublication(), request.headers.get("if-none-match"));
  } catch {
    return Response.json({ error: "The public profile publication is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
