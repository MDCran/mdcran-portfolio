"use client";
import { useCallback, useState } from "react";
import { useReportWebVitals } from "next/web-vitals";

type Reading = { name: string; value: number; rating: string };
export default function PublicVitals() {
  const [metrics, setMetrics] = useState<Record<string, Reading>>({});
  const report = useCallback((metric: Reading) => {
    if (["LCP", "CLS", "INP", "FCP", "TTFB"].includes(metric.name)) {
      setMetrics((old) => ({ ...old, [metric.name]: { name: metric.name, value: metric.value, rating: metric.rating } }));
    }
  }, []);
  useReportWebVitals(report);
  return <details className="content-container my-10 rounded-sm border border-white/15 p-5 text-sm print:hidden">
    <summary className="cursor-pointer font-semibold">Page performance · measured on this device</summary>
    <p className="mt-3 max-w-3xl text-white/75">Real browser measurements for this document load, kept only in memory. These are a single visit, not a site-wide score. LCP and CLS may appear after an interaction or when the tab is hidden; INP needs an interaction. Client-side navigation does not start a new document measurement.</p>
    <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {["LCP", "INP", "CLS", "FCP", "TTFB"].map((name) => <div key={name}><dt className="font-semibold">{name}</dt><dd className="mt-1 text-white/75">{metrics[name] ? `${name === "CLS" ? metrics[name].value.toFixed(3) : `${Math.round(metrics[name].value)} ms`} · ${metrics[name].rating.replaceAll("-", " ")}` : "Awaiting browser measurement"}</dd></div>)}
    </dl>
    <p className="mt-4 text-xs text-white/65">Core Web Vitals: largest contentful paint (LCP), interaction to next paint (INP), cumulative layout shift (CLS). Unsupported metrics remain awaiting measurement. Reload this page to start a new visit.</p>
  </details>;
}
