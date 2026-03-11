import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Code",
  description:
    "Software projects by Michael Cran — secure web applications, backend systems, custom plugins, and developer tools.",
  path: "/code",
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
