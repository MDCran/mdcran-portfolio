import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Unsubscribe",
  description: "Manage your MDCran communication preferences and unsubscribe from updates.",
  path: "/unsubscribe",
  noIndex: true,
});

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
