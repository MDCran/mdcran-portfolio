import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getVisitorCountsByCountry, getTotalVisitorCount } from "@/lib/db";
import GlobeViewer from "@/components/visitor/GlobeViewer";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Visitor Map",
  robots: { index: false, follow: false },
};

export default async function VisitorPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const [countries, total] = await Promise.all([
    getVisitorCountsByCountry(),
    getTotalVisitorCount(),
  ]);

  return (
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
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "14px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          position: "relative",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <a
          href="https://mdcran.com"
          style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textDecoration: "none", letterSpacing: "0.06em" }}
        >
          ← MDCran.com
        </a>
        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Visitor Map
        </span>
      </div>

      {/* Globe fills remainder */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <GlobeViewer stats={countries} total={total} />
      </div>
    </div>
  );
}
