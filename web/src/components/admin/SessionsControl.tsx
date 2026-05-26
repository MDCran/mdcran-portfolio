"use client";

import React, { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { flagEmoji } from "@/lib/flag";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r)));

interface Tab { sessionId: string; lastPath: string | null; lastSeen: string; active: boolean }
interface Visitor {
  visitorId: string; ip: string | null; countryName: string | null; countryCode: string | null;
  browser: string; os: string; device: string; visitCount: number; returning: boolean;
  tabs: Tab[]; activeTabs: number;
}

function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

async function post(body: unknown) {
  await fetch("/api/admin/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

const card = "rounded-sm border border-white/7 bg-white/2 p-5";
const btn = "px-2 py-1 rounded-sm text-[10px] tracking-wide uppercase border transition-colors";

export default function SessionsControl() {
  const { data, error } = useSWR<{ visitors: Visitor[]; blacklist: string[] }>("/api/admin/sessions", fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
  const { mutate } = useSWRConfig();
  const refresh = () => mutate("/api/admin/sessions");

  const [busy, setBusy] = useState<string | null>(null);
  const act = async (key: string, body: unknown) => {
    setBusy(key);
    await post(body);
    await refresh();
    setBusy(null);
  };

  if (error) return <p className="text-xs text-white/30">Couldn&apos;t load sessions.</p>;
  if (!data) return <p className="text-white/30 text-xs">Loading sessions…</p>;

  const visitors = data.visitors;
  const totalActiveTabs = visitors.reduce((a, v) => a + v.activeTabs, 0);
  const activeVisitors = visitors.filter((v) => v.activeTabs > 0).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Active Visitors", value: activeVisitors, live: true },
          { label: "Active Tabs", value: totalActiveTabs, live: true },
          { label: "Recent Visitors (24h)", value: visitors.length },
          { label: "Blacklisted IPs", value: data.blacklist.length },
        ].map((c) => (
          <div key={c.label} className={`${card} relative`}>
            {c.live && (
              <span className="absolute right-3 top-3 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
            )}
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/35 mb-2">{c.label}</p>
            <p className="font-nord text-2xl text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-white/35">
        Live control via ~7s polling (serverless can&apos;t host raw WebSockets). Commands reach a tab on its next poll.
      </p>

      {data.blacklist.length > 0 && (
        <div className={card}>
          <p className="font-nord text-sm text-white mb-3">Blacklisted IPs</p>
          <div className="flex flex-wrap gap-2">
            {data.blacklist.map((ip) => (
              <span key={ip} className="inline-flex items-center gap-2 rounded-sm border border-[#ef4242]/30 bg-[#ef4242]/8 px-2.5 py-1 text-xs text-[#ef4242]">
                {ip}
                <button onClick={() => act(`unbl-${ip}`, { action: "blacklist", ip, blocked: false })} className="text-white/40 hover:text-white">✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {visitors.length === 0 && <p className="text-xs text-white/25">No recent visitors.</p>}
        {visitors.map((v) => (
          <div key={v.visitorId} className={card}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${v.activeTabs > 0 ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                <div>
                  <div className="text-sm text-white flex items-center gap-2">
                    {v.ip ?? "Unknown IP"}
                    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${v.returning ? "bg-[#ef4242]/10 text-[#ef4242]" : "bg-white/5 text-white/40"}`}>
                      {v.returning ? "Returning" : "New"}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40">
                    {v.countryCode ? `${flagEmoji(v.countryCode)} ` : ""}{v.countryName ?? "—"} · {v.browser} · {v.os} · {v.device} · {v.visitCount} visit{v.visitCount === 1 ? "" : "s"} · {v.activeTabs}/{v.tabs.length} tab{v.tabs.length === 1 ? "" : "s"} active
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={busy === `kill-v-${v.visitorId}`}
                  onClick={() => act(`kill-v-${v.visitorId}`, { action: "command", visitorId: v.visitorId, command: { action: "kill" } })}
                  className={`${btn} border-[#ef4242]/30 text-[#ef4242] hover:bg-[#ef4242]/10`}
                >Kill all tabs</button>
                {v.ip && (
                  <button
                    disabled={busy === `bl-${v.ip}`}
                    onClick={() => act(`bl-${v.ip}`, { action: "blacklist", ip: v.ip, blocked: true })}
                    className={`${btn} border-[#ef4242]/30 text-[#ef4242] hover:bg-[#ef4242]/10`}
                  >Blacklist IP</button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-3 space-y-1.5">
              {v.tabs.map((t) => (
                <div key={t.sessionId} className="flex items-center justify-between gap-2 rounded-sm border border-white/6 bg-white/[0.02] px-3 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.active ? "bg-emerald-400" : "bg-white/20"}`} />
                    <span className="text-xs text-white/60 truncate">{t.lastPath ?? "—"}</span>
                    <span className="text-[10px] text-white/25 shrink-0">{timeAgo(t.lastSeen)} ago</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => act(`r-${t.sessionId}`, { action: "command", sessionId: t.sessionId, command: { action: "refresh" } })} className={`${btn} border-white/15 text-white/50 hover:text-white`}>Refresh</button>
                    <button
                      onClick={() => {
                        const path = window.prompt("Redirect this tab to which path?", t.lastPath ?? "/");
                        if (path) act(`rd-${t.sessionId}`, { action: "command", sessionId: t.sessionId, command: { action: "redirect", path } });
                      }}
                      className={`${btn} border-white/15 text-white/50 hover:text-white`}
                    >Redirect</button>
                    <button onClick={() => act(`k-${t.sessionId}`, { action: "command", sessionId: t.sessionId, command: { action: "kill" } })} className={`${btn} border-[#ef4242]/25 text-[#ef4242]/80 hover:bg-[#ef4242]/10`}>Kill</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
