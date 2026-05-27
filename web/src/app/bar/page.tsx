import { notFound } from "next/navigation";
import BarWheelClient from "./BarWheelClient";
import { buildSeoMetadata } from "@/lib/seo";
import { getSiteContent } from "@/lib/db";
import { defaultSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildSeoMetadata({
    title: "Bar Roulette",
    description: "Can't decide what to drink? Pull the slot and let fate (and a power meter) decide.",
    path: "/bar",
  });
}

export default async function BarPage() {
  const siteContent = await getSiteContent().catch(() => null);
  // Gated by the admin Bar toggle — when disabled, the page doesn't exist.
  if (!siteContent?.barEnabled) notFound();
  const categories = (siteContent?.barCategories?.length ? siteContent.barCategories : defaultSiteContent.barCategories) ?? [];
  return <BarWheelClient categories={categories} />;
}
