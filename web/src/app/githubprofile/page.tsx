import type { Metadata } from "next";
import GitHubProfilePage from "@/components/github/GitHubProfilePage";
import { getSiteContent } from "@/lib/db";

export const metadata: Metadata = {
  title: "Software & AI Engineer",
  description: "Michael Cran's skills span Python, Java, TypeScript, React, AWS, AI/ML, APIs, data systems, and cloud delivery. Explore engineering work and experience.",
  keywords: [
    "Michael Cran",
    "software engineer",
    "AI engineer",
    "Python",
    "Java",
    "TypeScript",
    "React",
    "AWS",
    "machine learning",
    "cloud engineering",
    "full-stack development",
  ],
};

export default async function Page() {
  const siteContent = await getSiteContent();
  return <GitHubProfilePage aiUsage={siteContent.aiUsageTracker} />;
}
