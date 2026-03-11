import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Events",
  description:
    "Large-scale competitive and community Minecraft events organized and built by Michael Cran.",
  path: "/arts-and-entertainment/events",
  keywords: [
    "Minecraft events",
    "MDCran events",
    "Minecraft competitions",
    "gaming events",
    "community events",
  ],
});

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
