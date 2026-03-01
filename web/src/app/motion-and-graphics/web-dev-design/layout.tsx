import type { Metadata } from "next";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Web Dev & Design",
  description: "Modern, premium web experiences for creators, companies and brands.",
  path: "/motion-and-graphics/web-dev-design",
});

export default function WebDevDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
