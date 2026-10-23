import type { Metadata } from "next";
import GitHubProfilePage from "@/components/github/GitHubProfilePage";
import { getProfilePublication } from "@/lib/profile-publication";

export async function generateMetadata(): Promise<Metadata> {
  const publication = await getProfilePublication();
  return { title: `${publication.profile.fullName} | ${publication.profile.title}`, description: publication.summary };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ capture?: string }> }) {
  const [publication, params] = await Promise.all([getProfilePublication(), searchParams]);
  return <GitHubProfilePage publication={publication} capture={params.capture === "1"} />;
}
