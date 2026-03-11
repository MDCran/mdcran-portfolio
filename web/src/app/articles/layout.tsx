import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Articles",
  description:
    "Articles, tutorials, recipes, and technical write-ups by Michael Cran. Browse guides on building PCs, game development, and more.",
  path: "/articles",
  keywords: [
    "MDCran articles",
    "Michael Cran blog",
    "tech tutorials",
    "developer blog",
    "Minecraft tutorials",
    "recipe blog",
  ],
});

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
