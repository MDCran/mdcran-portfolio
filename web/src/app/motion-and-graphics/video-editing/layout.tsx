import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Video Editing",
  description:
    "Fast, professional video editing for YouTube and social media by Michael Cran. Trailers, intros, and full production.",
  path: "/motion-and-graphics/video-editing",
  keywords: [
    "video editing",
    "YouTube video editor",
    "MDCran video editing",
    "gaming video editor",
    "video production Orlando",
  ],
});

export default function VideoEditingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
