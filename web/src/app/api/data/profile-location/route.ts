import { getResumeProfile } from "@/lib/db";
export async function GET() {
  const profile = await getResumeProfile();
  return Response.json(
    { location: profile.location },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
