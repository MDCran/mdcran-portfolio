import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = buildSeoMetadata({
  title: "Engineering Project Redirect",
  description: "This legacy route redirects to the current engineering project entry.",
  path: "/coding-projects",
  noIndex: true,
});

export default async function CodingProjectSlugRedirect({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/engineering#project-${slug}`);
}
