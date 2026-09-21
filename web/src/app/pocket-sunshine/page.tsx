import { notFound } from "next/navigation";
import { getSiteContent } from "@/lib/db";
import { getRizzConfig } from "@/lib/rizz";
import SecretPageClient from "@/components/secret/SecretPageClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pocket Sunshine", robots: { index: false, follow: false } };
export default async function PocketSunshinePage() {
  const content = await getSiteContent().catch(() => null);
  if (!content?.secretPages?.pocketSunshine) notFound();
  return <SecretPageClient kind="pocketSunshine" name={content.rizzTargetName?.trim()} rizzEnabled={content.rizzEnabled ?? false} setting={getRizzConfig(content).setting} notes={content.secretPages?.sunshineNotes} />;
}
