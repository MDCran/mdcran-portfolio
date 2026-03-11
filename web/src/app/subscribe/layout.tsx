import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Subscribe",
  description: "Subscribe to MDCran updates by email, SMS, or both.",
  path: "/subscribe",
  noIndex: true,
});

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
