import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Minecraft Maps",
  description:
    "Custom-built Minecraft maps and experiences designed by Michael Cran for the world's biggest YouTubers and gaming content creators.",
  path: "/arts-and-entertainment/minecraft-maps",
  keywords: [
    "Minecraft maps",
    "custom Minecraft maps",
    "MDCran Minecraft",
    "Minecraft map maker",
    "Minecraft level designer",
    "YouTube Minecraft maps",
    "PopularMMOs maps",
  ],
});

export default function MinecraftMapsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
