import type { Metadata } from "next";
import GitHubProfilePage from "@/components/github/GitHubProfilePage";
import { getSiteContent } from "@/lib/db";

export const metadata: Metadata = {
  title: "Software & AI Engineer",
  description: "Michael Cran builds full-stack software, AI integrations, APIs, and cloud systems. Explore selected skills and engineering work.",
};

export default async function Page() {
  const siteContent = await getSiteContent();
  return <GitHubProfilePage aiUsage={siteContent.aiUsageTracker} />;
}
