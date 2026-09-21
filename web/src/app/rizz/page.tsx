import { notFound } from "next/navigation";
import RizzPageClient from "./RizzPageClient";
import { buildSeoMetadata } from "@/lib/seo";
import { getSiteContent } from "@/lib/db";
import { getRizzConfig } from "@/lib/rizz";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildSeoMetadata({
    title: "An invitation",
    description: "A personalized invitation.",
    path: "/rizz",
    noIndex: true,
  });
}

export default async function RizzPage() {
  const siteContent = await getSiteContent().catch(() => null);
  // Gated by the admin Rizz toggle — when disabled, the page doesn't exist.
  if (!siteContent?.rizzEnabled) notFound();
  const targetName = siteContent?.rizzTargetName?.trim() || undefined;
  return <RizzPageClient targetName={targetName} config={getRizzConfig(siteContent)} />;
}
