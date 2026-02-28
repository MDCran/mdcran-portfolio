import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CoreTVClient from "./CoreTVClient";

export const metadata: Metadata = {
  title: "CoreTV Networks — The Future of Minecraft Content",
  description:
    "CoreTV Networks is a premium Minecraft content organization connecting creators, brands, and communities through high-impact events, partnerships, and content production.",
  keywords: [
    "CoreTV Networks", "Minecraft Content Network", "Minecraft Organization",
    "Minecraft Creator Network", "Gaming Network", "Minecraft Events",
    "Content Creator Partnership", "Minecraft Brand Deals",
  ],
  openGraph: {
    title: "CoreTV Networks — The Future of Minecraft Content",
    description:
      "A premium Minecraft content organization. Creator partnerships, community events, and brand deals at scale.",
    url: "https://mdcran.com/coretv",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CoreTV Networks",
    description: "The Future of Minecraft Content. Creator partnerships & community events at scale.",
  },
};

export default function CoreTVPage() {
  return (
    <>
      <Navbar />
      <CoreTVClient />
      <Footer />
    </>
  );
}
