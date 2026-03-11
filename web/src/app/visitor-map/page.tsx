import { getVisitorCountsByCountry, getTotalVisitorCount } from "@/lib/db";
import GlobeViewer from "@/components/visitor/GlobeViewer";
import Navbar from "@/components/layout/Navbar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visitor Map",
  robots: { index: false, follow: false },
};

export default async function VisitorPage() {
  const [countries, total] = await Promise.all([
    getVisitorCountsByCountry(),
    getTotalVisitorCount(),
  ]);

  return (
    <>
      <Navbar opaque />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000000",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Globe fills entire screen, renders under the transparent navbar */}
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <GlobeViewer stats={countries} total={total} />
        </div>
      </div>
    </>
  );
}
