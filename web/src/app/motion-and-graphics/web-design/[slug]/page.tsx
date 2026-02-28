import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = buildSeoMetadata({
  title: "Web Design Redirect",
  description: "This legacy route redirects to the current Web Dev & Design project URL.",
  path: "/motion-and-graphics/web-design",
  noIndex: true,
});

export default async function WebDesignSlugRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/motion-and-graphics/web-dev-design/${slug}`);
}
