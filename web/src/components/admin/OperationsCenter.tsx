"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminRequest } from "@/lib/admin-client";

type Run = { runId?: string; id?: string; _id?: string; job?: string; name?: string; type?: string; status?: string; startedAt?: string; finishedAt?: string; error?: string; retryable?: boolean };
type Delivery = { campaignId: string; contactId: string; status: string; attemptedAt?: string; reason?: string };
type Report = { runs?: Run[]; deliveries?: Delivery[]; summary?: Record<string, unknown> };
type Outcome = "sent" | "not-sent";
const button = "rounded border border-white/20 px-3 py-2 text-sm disabled:opacity-40";

export default function OperationsCenter({ compact = false }: { compact?: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Delivery | null>(null);
  const [outcome, setOutcome] = useState<Outcome | "">("");
  const [providerChecked, setProviderChecked] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try { setReport(await adminRequest<Report>("/api/admin/operations")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load operations."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function retry(run: Run) {
    if (run.job === "campaigns" && !window.confirm("Retry due campaigns? This can send messages to subscribed recipients. Deliveries with uncertain outcomes remain excluded until reviewed.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminRequest("/api/admin/operations", { method: "POST", body: JSON.stringify({ action: "retry", runId: run.runId ?? run.id ?? run._id }) });
      setNotice("Job retry completed. Review the updated outcome below.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Retry failed."); }
    finally { setBusy(false); }
  }

  function beginReview(delivery: Delivery) {
    setReview(delivery);
    setOutcome("");
    setProviderChecked(false);
    setNotice("");
  }

  async function resolveDelivery() {
    if (!review || !outcome || !providerChecked || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await adminRequest("/api/admin/operations", {
        method: "POST",
        body: JSON.stringify({ action: "resolve-delivery", campaignId: review.campaignId, contactId: review.contactId, outcome }),
      });
      setReview(null);
      setOutcome("");
      setProviderChecked(false);
      setNotice(outcome === "sent" ? "Confirmed provider acceptance recorded. No message was sent." : "Confirmed non-delivery recorded. No message was sent; resume the campaign separately when ready.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to record the delivery outcome."); }
    finally { setBusy(false); }
  }

  const runs = report?.runs ?? [];
  const deliveries = report?.deliveries ?? [];
  const shownDeliveries = compact ? deliveries.slice(0, 3) : deliveries;

  return (
    <section className="space-y-4 rounded-lg border border-white/10 bg-white/[.025] p-5" aria-label="Operations health">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Operations</h2><p className="text-sm text-white/60">Recent job outcomes and failures that need attention.</p></div>
        <button onClick={() => void refresh()} disabled={busy} className={button}>{busy ? "Working…" : "Refresh"}</button>
      </div>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {report?.summary && <div className="flex flex-wrap gap-4">{Object.entries(report.summary).filter(([, value]) => typeof value === "number" || typeof value === "string").map(([key, value]) => <div key={key} className="rounded bg-black/20 px-4 py-2"><p className="text-xs text-white/55">{key.replace(/([A-Z])/g, " $1")}</p><p className="text-xl">{String(value)}</p></div>)}</div>}

      {deliveries.length > 0 && (
        <div className="space-y-3 rounded border border-amber-200/25 p-4">
          <h3 className="font-medium text-amber-100">Delivery outcomes to verify</h3>
          <p className="text-sm text-white/60">Check the email or SMS provider for each recipient. Recording an outcome does not send a message.</p>
          {shownDeliveries.map((delivery) => (
            <article key={`${delivery.campaignId}:${delivery.contactId}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="min-w-0 text-sm"><p className="break-all">Campaign: {delivery.campaignId}</p><p className="break-all text-white/60">Recipient: {delivery.contactId}</p>{delivery.attemptedAt && <p className="text-xs text-white/45">Attempted {new Date(delivery.attemptedAt).toLocaleString()}</p>}</div>
              <button disabled={busy} onClick={() => beginReview(delivery)} className={button}>Review outcome</button>
            </article>
          ))}
          {compact && deliveries.length > shownDeliveries.length && <Link href="/admin/dashboard/operations" className="block text-sm underline">Review all {deliveries.length} outcomes</Link>}
        </div>
      )}

      {review && (
        <form onSubmit={(event) => { event.preventDefault(); void resolveDelivery(); }} className="space-y-4 rounded border border-white/20 bg-black/20 p-4" aria-label="Confirm delivery outcome">
          <h3 className="font-medium">Confirm provider result</h3>
          <p className="break-all text-xs text-white/60">Campaign {review.campaignId} · recipient {review.contactId}</p>
          <fieldset className="space-y-2 text-sm" disabled={busy}>
            <legend className="mb-2">What did the provider confirm?</legend>
            <label className="flex items-start gap-2"><input type="radio" name="delivery-outcome" value="sent" checked={outcome === "sent"} onChange={() => setOutcome("sent")} required className="mt-1" /><span>The provider accepted this message. Mark it sent.</span></label>
            <label className="flex items-start gap-2"><input type="radio" name="delivery-outcome" value="not-sent" checked={outcome === "not-sent"} onChange={() => setOutcome("not-sent")} required className="mt-1" /><span>The provider did not accept this message. Allow a future deliberate retry.</span></label>
          </fieldset>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={providerChecked} onChange={(event) => setProviderChecked(event.target.checked)} disabled={busy} className="mt-1" /><span>I checked the provider record for this exact campaign and recipient.</span></label>
          <p className="text-xs text-white/50">If the outcome is still unknown, cancel and leave the delivery awaiting review.</p>
          <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !outcome || !providerChecked} className={`${button} bg-[#ef4242]`}>Record verified outcome</button><button type="button" disabled={busy} onClick={() => setReview(null)} className={button}>Cancel review</button></div>
        </form>
      )}

      <div className="space-y-2">{runs.slice(0, compact ? 4 : 40).map((run, index) => (
        <article key={run.runId ?? run.id ?? run._id ?? index} className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 p-3">
          <div><p className="text-sm font-medium">{run.job ?? run.name ?? run.type ?? "Background job"} <span className={run.status === "failed" ? "text-red-300" : "text-white/60"}>· {run.status}</span></p><p className="text-xs text-white/50">{run.startedAt ? new Date(run.startedAt).toLocaleString() : ""}</p>{run.error && <p className="mt-1 text-sm text-red-300">{run.error}</p>}</div>
          {(run.retryable || (run.status === "failed" && ["campaigns", "cleanup", "project-metrics"].includes(run.job ?? ""))) && <button disabled={busy} onClick={() => void retry(run)} className={button}>Retry job</button>}
        </article>
      ))}</div>
      {report && !runs.length && <p className="text-sm text-white/60">No recorded job runs yet. Completed and failed jobs will appear here.</p>}
    </section>
  );
}
