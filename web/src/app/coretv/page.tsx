import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CoreTVClient from "./CoreTVClient";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "CoreTV Networks | The Future of Minecraft Content",
  description:
    "CoreTV Networks is a premium Minecraft content organization connecting creators, brands, and communities through events, partnerships, and content production.",
  path: "/coretv",
  keywords: [
    "CoreTV Networks", "Minecraft Content Network", "Minecraft Organization",
    "Minecraft Creator Network", "Gaming Network", "Minecraft Events",
    "Content Creator Partnership", "Minecraft Brand Deals",
  ],
});

export default function CoreTVPage() {
  return (
    <>
      <Navbar />
      <CoreTVClient />
      <Footer />
    </>
  );
}
