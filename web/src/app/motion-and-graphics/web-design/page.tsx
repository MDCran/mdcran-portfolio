import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Web Design Redirect",
  description: "This legacy route redirects to the current Web Dev & Design section.",
  path: "/motion-and-graphics/web-design",
  noIndex: true,
});

export default function WebDesignRedirect() {
  redirect("/motion-and-graphics/web-dev-design");
}
