import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Engineering",
  description:
    "Michael Cran's software, AI, full-stack, and cloud engineering projects.",
  path: "/engineering",
  noIndex: true,
  keywords: [
    "MDCran code",
    "Michael Cran software",
    "coding projects",
    "web applications",
    "custom plugins",
    "TypeScript projects",
    "Java projects",
  ],
});

export default function CodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
