import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CoreTVClient from "./CoreTVClient";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "CoreTV.co | Business Technology & AI Automation",
  description:
    "Michael Cran’s work on CORE Business Technology: websites, AI reception, connected business systems, and workflow automation at CoreTV.co.",
  path: "/coretv",
  keywords: [
    "CoreTV", "CORE Business Technology", "Business Automation",
    "AI Engineer", "Next.js", "Workflow Automation",
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
