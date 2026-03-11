import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Thumbnail Design",
  description:
    "Eye-catching YouTube thumbnails designed by Michael Cran for top gaming and entertainment content creators.",
  path: "/motion-and-graphics/thumbnail-design",
  keywords: [
    "YouTube thumbnail design",
    "gaming thumbnails",
    "MDCran thumbnails",
    "thumbnail designer",
    "Minecraft thumbnails",
    "content creator thumbnails",
  ],
});

export default function ThumbnailDesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
