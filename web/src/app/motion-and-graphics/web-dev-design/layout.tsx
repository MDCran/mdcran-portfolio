import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Web Dev & Design",
  description:
    "Modern, premium web experiences built by Michael Cran for creators, companies, and brands. Next.js, React, and custom web applications.",
  path: "/motion-and-graphics/web-dev-design",
  keywords: [
    "web development",
    "web design",
    "MDCran websites",
    "Next.js developer",
    "React developer",
    "freelance web developer Orlando",
  ],
});

export default function WebDevDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
