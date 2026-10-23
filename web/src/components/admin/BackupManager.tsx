"use client";

import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-client";

type Plan = {
  planId: string;
  collections: { collection: string; current: number; incoming: number }[];
  warnings?: string[];
  expiresAt?: string;
};
type Snapshot = { snapshotId: string; collections: string[]; createdAt: string };
const button = "rounded border border-white/20 px-3 py-2 text-sm disabled:opacity-40";

export default function BackupManager() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState("");
  const [latestSnapshot, setLatestSnapshot] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    setSnapshotsError("");
    try {
      const result = await adminRequest<{ snapshots: Snapshot[] }>("/api/admin/db-backup?snapshots=true");
      setSnapshots(result.snapshots);
    } catch (cause) {
      setSnapshotsError(cause instanceof Error ? cause.message : "Unable to load recovery snapshots.");
    } finally { setSnapshotsLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSnapshots(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSnapshots]);

  async function prepare(backup: unknown) {
    setPlan(await adminRequest<Plan>("/api/admin/db-backup", {
      method: "POST", body: JSON.stringify({ action: "dry-run", backup }),
    }));
  }

  async function inspect(file: File) {
    setBusy(true); setError(""); setMessage(""); setPlan(null); setConfirmation("");
    try {
      if (file.size > 25_000_000) throw new Error("Choose a backup smaller than 25 MB.");
      await prepare(JSON.parse(await file.text()) as unknown);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Backup validation failed."); }
    finally { setBusy(false); }
  }

  async function inspectSnapshot(snapshotId: string) {
    setBusy(true); setError(""); setMessage(""); setPlan(null); setConfirmation("");
    try {
      const backup = await adminRequest(`/api/admin/db-backup?${new URLSearchParams({ snapshotId })}`);
      await prepare(backup);
      setMessage("Recovery snapshot inspected. Review the changes below before restoring.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to inspect this snapshot."); }
    finally { setBusy(false); }
  }

  async function restore() {
    if (!plan || confirmation !== "RESTORE" || busy) return;
    setBusy(true); setError("");
    try {
      const result = await adminRequest<{ snapshotId: string }>("/api/admin/db-backup", {
        method: "POST", body: JSON.stringify({ action: "restore", planId: plan.planId }),
      });
      setLatestSnapshot(result.snapshotId);
      setMessage("Restore completed. Download the recovery snapshot below to keep the previous state. Reload the editor before making more changes.");
      setPlan(null);
      setConfirmation("");
      await loadSnapshots();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Restore failed."); }
    finally { setBusy(false); }
  }

  async function download(snapshotId?: string) {
    setBusy(true); setError("");
    try {
      const suffix = snapshotId ? `?${new URLSearchParams({ snapshotId })}` : "";
      const response = await fetch(`/api/admin/db-backup${suffix}`);
      if (!response.ok) throw new Error((await response.json()).error || "Export failed; no incomplete backup was downloaded.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = snapshotId ? `mdcran-recovery-${snapshotId}.json` : `mdcran-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Export failed."); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-5 rounded-lg border border-white/10 p-6">
      <h2 className="text-xl font-semibold">Backups and recovery</h2>
      <p className="text-sm text-white/65">Download a verified export, or inspect a backup before replacing content. Each restore keeps a recovery snapshot of the previous state.</p>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => void download()} className={`${button} bg-[#ef4242]`}>Download backup</button>
        <label className={`${button} cursor-pointer`}>Inspect backup
          <input type="file" accept=".json,application/json" disabled={busy} className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void inspect(file);
            event.target.value = "";
          }} />
        </label>
      </div>
      {busy && <p role="status">Working…</p>}
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {message && <p role="status" className="text-emerald-300">{message}</p>}
      {latestSnapshot && <button disabled={busy} onClick={() => void download(latestSnapshot)} className={button}>Download the previous state</button>}

      {plan && (
        <div className="space-y-3 rounded border border-amber-200/20 p-4">
          <h3 className="font-medium">Restore preview</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr><th className="py-2">Collection</th><th>Current</th><th>After restore</th></tr></thead>
              <tbody>{plan.collections.map((entry) => <tr key={entry.collection} className="border-t border-white/10"><td className="py-2 pr-3">{entry.collection}</td><td>{entry.current}</td><td>{entry.incoming}</td></tr>)}</tbody>
            </table>
          </div>
          {plan.warnings?.map((warning) => <p key={warning} className="text-sm text-amber-200">{warning}</p>)}
          {plan.expiresAt && <p className="text-xs text-white/50">Preview expires {new Date(plan.expiresAt).toLocaleString()}.</p>}
          <label className="block text-sm">Type RESTORE to replace the collections shown above
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 block rounded border border-white/20 bg-black/30 px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-3">
            <button disabled={busy || confirmation !== "RESTORE"} onClick={() => void restore()} className={`${button} bg-[#ef4242]`}>Restore validated backup</button>
            <button disabled={busy} onClick={() => { setPlan(null); setConfirmation(""); }} className={button}>Cancel preview</button>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium">Recovery snapshots</h3>
          <button disabled={snapshotsLoading || busy} onClick={() => void loadSnapshots()} className={button}>{snapshotsLoading ? "Loading…" : "Refresh snapshots"}</button>
        </div>
        <p className="text-xs text-white/55">Inspecting a snapshot creates a restore preview. Content changes only after you confirm that preview.</p>
        {snapshotsError && <p role="alert" className="text-sm text-red-300">{snapshotsError}</p>}
        {!snapshotsLoading && !snapshotsError && !snapshots.length && <p className="text-sm text-white/55">No recovery snapshots yet. A snapshot is created before each successful restore.</p>}
        {snapshots.map((snapshot) => (
          <article key={snapshot.snapshotId} className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 p-3">
            <div className="min-w-0"><p className="text-sm">{new Date(snapshot.createdAt).toLocaleString()}</p><p className="break-words text-xs text-white/50">{snapshot.collections.join(", ")}</p></div>
            <div className="flex gap-2"><button disabled={busy} onClick={() => void download(snapshot.snapshotId)} className={button}>Download</button><button disabled={busy} onClick={() => void inspectSnapshot(snapshot.snapshotId)} className={button}>Inspect recovery</button></div>
          </article>
        ))}
      </div>
    </section>
  );
}
