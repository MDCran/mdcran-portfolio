import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = buildSeoMetadata({
  title: "Code Project Redirect",
  description: "This legacy route redirects to the current code project URL.",
  path: "/coding-projects",
  noIndex: true,
});

export default async function CodingProjectSlugRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/code/${slug}`);
}
