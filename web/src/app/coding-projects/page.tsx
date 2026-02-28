import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Code",
  description: "This legacy route redirects to the current code portfolio.",
  path: "/coding-projects",
  noIndex: true,
});

export default function CodingProjectsRedirect() {
  redirect("/code");
}
