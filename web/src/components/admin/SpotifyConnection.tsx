"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";

const messages: Record<string, string> = {
  connected: "Connected. Your listening activity is available to the homepage widget.",
  "reconnect-required": "Authorization has expired or needs new permissions. Reconnect below.",
  "not-configured": "Spotify app credentials need to be configured before connecting.",
  unavailable: "Spotify could not be checked right now. Try checking again.",
};
const outcomes: Record<string, string> = {
  connected: "Spotify authorization was saved successfully.",
  cancelled: "Authorization was cancelled. Your previous connection has not been replaced.",
  "invalid-state": "This authorization session expired. Start a new reconnect below.",
  failed: "The connection could not be saved. Please try reconnecting again.",
};

export default function SpotifyConnection() {
  const [outcome, setOutcome] = useState("");
  const { data, error, isValidating, mutate } = useSWR<{ status: string; checkedAt: string }>("/api/admin/spotify", async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Connection check failed");
    return response.json();
  }, { revalidateOnFocus: true, dedupingInterval: 30000 });
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("spotify") || "";
    const timer = window.setTimeout(() => setOutcome(status), 0);
    if (url.searchParams.has("spotify")) {
      url.searchParams.delete("spotify");
      window.history.replaceState(null, "", url);
    }
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="border border-white/7 bg-white/2 rounded-sm p-4 sm:p-5 space-y-4">
    <div><p className="font-nord text-sm text-white">Spotify Connection</p><p className="mt-2 text-xs leading-relaxed text-white/50">Manage the listening activity displayed on your homepage.</p></div>
    {outcomes[outcome] && <p role="status" className="text-xs text-white/75">{outcomes[outcome]}</p>}
    <p role="status" className="rounded-sm border border-white/10 p-3 text-xs leading-relaxed text-white/60">{error ? messages.unavailable : data ? messages[data.status] || messages.unavailable : "Checking Spotify connection…"}</p>
    <div className="flex flex-wrap gap-3">
      <a href="/api/spotify/auth" className="inline-flex min-h-11 items-center justify-center px-4 bg-[#ef4242] hover:bg-[#d93838] text-white text-xs rounded-sm">Connect / Reconnect</a>
      <button type="button" disabled={isValidating} onClick={() => void mutate()} className="min-h-11 rounded-sm border border-white/15 px-4 text-xs text-white/65 disabled:opacity-40">{isValidating ? "Checking…" : "Check connection"}</button>
    </div>
    <p className="text-xs leading-relaxed text-white/40">Approve access on Spotify, then return here automatically. Credentials stay on the server.</p>
  </div>;
}
