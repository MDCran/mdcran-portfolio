import type { Metadata } from "next";
import StatusPage from "@/components/status/StatusPage";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { computeServiceHealth, getActiveIncidents, getStatusIncidents } from "@/lib/db";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "System Status",
  description: "Real-time status and uptime monitoring for MDCran services.",
  path: "/status",
});

export default async function StatusPageRoute() {
  const [services, activeIncidents, allIncidents] = await Promise.all([
    computeServiceHealth(),
    getActiveIncidents(),
    getStatusIncidents(),
  ]);
  const history = allIncidents.filter((i) => i.status === "resolved").slice(0, 20);

  return (
    <>
      <Navbar />
      <main className="mt-[var(--navbar-height)]">
        <StatusPage services={services} activeIncidents={activeIncidents} history={history} />
      </main>
      <Footer />
    </>
  );
}
