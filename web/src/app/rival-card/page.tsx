import { notFound } from "next/navigation";
import { getSiteContent } from "@/lib/db";
import SecretPageClient from "@/components/secret/SecretPageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "A card, just for you", robots: { index: false, follow: false } };
export default async function RivalCardPage() {
  const content = await getSiteContent().catch(() => null);
  if (!content?.secretPages?.rivalCard) notFound();
  return <SecretPageClient kind="rivalCard" name={content.rizzTargetName?.trim()} rizzEnabled={content.rizzEnabled ?? false} />;
}
