import { notFound } from "next/navigation";
import RizzPageClient from "./RizzPageClient";
import { buildSeoMetadata } from "@/lib/seo";
import { getSiteContent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const siteContent = await getSiteContent().catch(() => null);
  const name = siteContent?.rizzTargetName?.trim();
  return buildSeoMetadata({
    title: name ? `${name}, Rizz` : "Rizz",
    description: "A deeply unserious date request page.",
    path: "/rizz",
  });
}

export default async function RizzPage() {
  const siteContent = await getSiteContent().catch(() => null);
  // Gated by the admin Rizz toggle — when disabled, the page doesn't exist.
  if (!siteContent?.rizzEnabled) notFound();
  const targetName = siteContent?.rizzTargetName?.trim() || undefined;
  return <RizzPageClient targetName={targetName} />;
}
