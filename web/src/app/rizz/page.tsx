import RizzPageClient from "./RizzPageClient";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Rizz",
  description: "A deeply unserious date request page.",
  path: "/rizz",
});

export default function RizzPage() {
  return <RizzPageClient />;
}
