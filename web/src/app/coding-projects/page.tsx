import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Engineering",
  description: "This legacy route redirects to the current engineering portfolio.",
  path: "/coding-projects",
  noIndex: true,
});

export default function CodingProjectsRedirect() {
  permanentRedirect("/engineering");
}
