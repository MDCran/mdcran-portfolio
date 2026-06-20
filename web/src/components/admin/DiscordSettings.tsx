"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Check, Send, Radio, Key, Hash } from "lucide-react";
import type { DiscordConfig, DiscordChannelMap } from "@/lib/discord";

const input =
  "h-9 rounded-sm border border-white/10 bg-white/4 px-2.5 text-xs text-white font-mono outline-none focus:border-[var(--cranberry,#ef4242)] w-full";
const label = "text-[10px] uppercase tracking-[0.15em] text-white/40";
const card = "rounded-sm border border-white/8 bg-white/2 p-5 space-y-4";

const CHANNEL_LABELS: Record<keyof DiscordChannelMap, string> = {
  forms: "Contact Form Submissions",
  bookings: "Meeting Bookings",
  newsletter: "Newsletter Sub / Unsub",
  identities: "Identity Lifecycle",
  analytics: "Weekly Analytics Digest",
  deviceLinks: "Cross-Device Links",
};

const CHANNEL_DESCRIPTIONS: Record<keyof DiscordChannelMap, string> = {
  forms: "Fires when a visitor submits the contact form — includes name, email, phone, message, IP, browser and optional UTM/session metadata.",
  bookings: "Fires when a meeting is booked — includes date, duration, type, location, attendee details and any recognised identity.",
  newsletter: "Fires on every subscribe or unsubscribe — shows action type, contact channel, source and session history.",
  identities: "Fires when an identity is created (by admin, user input, or AI extraction) — shows name, origin and device count.",
  analytics: "Sent every Sunday at midnight UTC via Vercel Cron — weekly visitor stats, top pages, countries and engagement events.",
  deviceLinks: "Fires when two devices are bridged — the deterministic QR \"Scan to Mobile\" handshake or a confirmed probabilistic match. Falls back to the Identity channel if left blank.",
};

type TestState = "idle" | "loading" | "ok" | "error";

export default function DiscordSettings() {
  const [config, setConfig] = useState<DiscordConfig | null>(null);
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStates, setTestStates] = useState<Record<keyof DiscordChannelMap, TestState>>({
    forms: "idle", bookings: "idle", newsletter: "idle", identities: "idle", analytics: "idle", deviceLinks: "idle",
  });
  const [digestState, setDigestState] = useState<TestState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/discord")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.config) setConfig(d.config);
        setTokenConfigured(Boolean(d?.tokenConfigured));
      })
      .catch(() => {});
  }, []);

  const patch = (p: Partial<DiscordConfig>) =>
    setConfig((c) => (c ? { ...c, ...p } : c));

  const patchChannel = (key: keyof DiscordChannelMap, value: string) =>
    setConfig((c) =>
      c ? { ...c, channels: { ...c.channels, [key]: value.trim() || null } } : c
    );

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/discord", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError("Failed to save — check the console.");
      }
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (channel: keyof DiscordChannelMap) => {
    setTestStates((s) => ({ ...s, [channel]: "loading" }));
    try {
      const res = await fetch(`/api/admin/discord?action=test&channel=${channel}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      setTestStates((s) => ({ ...s, [channel]: res.ok ? "ok" : "error" }));
      if (!res.ok) setError(d?.error ?? "Test failed.");
      setTimeout(() => setTestStates((s) => ({ ...s, [channel]: "idle" })), 3000);
    } catch {
      setTestStates((s) => ({ ...s, [channel]: "error" }));
    }
  };

  const triggerDigest = async () => {
    setDigestState("loading");
    try {
      const res = await fetch("/api/cron/discord-digest", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      setDigestState(res.ok && d?.sent ? "ok" : "error");
      if (!d?.sent) setError(d?.error ?? "Digest failed.");
      setTimeout(() => setDigestState("idle"), 4000);
    } catch {
      setDigestState("error");
    }
  };

  if (!config) {
    return <p className="text-xs text-white/30">Loading Discord settings…</p>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-nord text-base text-white flex items-center gap-2">
            <Radio size={16} className="text-[var(--cranberry,#ef4242)]" />
            Discord Notifications
          </p>
          <p className="text-xs text-white/35 mt-0.5">
            Route site events to your Discord server channels via a bot token.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[var(--cranberry,#ef4242)] text-white text-xs uppercase tracking-wider hover:bg-[#dd3030] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} />
          ) : (
            <Save size={14} />
          )}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      {/* Token status */}
      <div className={card}>
        <div className="flex items-center gap-2">
          <Key size={13} className={tokenConfigured ? "text-green-400" : "text-white/30"} />
          <span className="text-xs text-white/70">
            <span className="font-mono">DISCORD_BOT_TOKEN</span>
            {" "}—{" "}
            {tokenConfigured ? (
              <span className="text-green-400">Configured in environment</span>
            ) : (
              <span className="text-amber-400">Not set — add to Vercel environment variables</span>
            )}
          </span>
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed">
          Create a bot at{" "}
          <span className="font-mono">discord.com/developers/applications</span>, add it to your server with{" "}
          <span className="font-mono">Send Messages</span> permission, and store the token as{" "}
          <span className="font-mono">DISCORD_BOT_TOKEN</span>. The bot must be invited to each channel you map below.
        </p>
      </div>

      {/* Global enable + guild ID */}
      <div className={card}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="accent-[var(--cranberry,#ef4242)]"
          />
          <span className="text-sm text-white">Enable Discord notifications</span>
          <span className="text-xs text-white/35">— all events fire only when this is on</span>
        </label>

        <div className="flex flex-col gap-1">
          <span className={label}>Guild / Server ID (optional — for reference only)</span>
          <input
            className={input}
            value={config.guildId}
            onChange={(e) => patch({ guildId: e.target.value })}
            placeholder="e.g. 123456789012345678"
          />
        </div>
      </div>

      {/* Channel mapping */}
      <div className={card}>
        <p className="font-nord text-sm text-white flex items-center gap-2">
          <Hash size={13} className="text-[var(--cranberry,#ef4242)]" />
          Channel Mapping
        </p>
        <p className="text-xs text-white/30">
          Enter the Discord Channel ID (right-click a channel → Copy Channel ID — requires Developer Mode enabled in Discord settings).
        </p>

        <div className="space-y-4 pt-1">
          {(Object.keys(CHANNEL_LABELS) as (keyof DiscordChannelMap)[]).map((key) => {
            const ts = testStates[key];
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={label}>{CHANNEL_LABELS[key]}</span>
                  <button
                    onClick={() => sendTest(key)}
                    disabled={ts === "loading" || !config.channels[key]}
                    title={config.channels[key] ? "Send a test embed to this channel" : "Enter a channel ID first"}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded-sm text-[10px] uppercase tracking-wider border border-white/10 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    {ts === "loading" ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : ts === "ok" ? (
                      <Check size={10} className="text-green-400" />
                    ) : ts === "error" ? (
                      <span className="text-red-400">✕</span>
                    ) : (
                      <Send size={10} />
                    )}
                    {ts === "ok" ? "Sent!" : ts === "error" ? "Failed" : "Test"}
                  </button>
                </div>
                <input
                  className={input}
                  value={config.channels[key] ?? ""}
                  onChange={(e) => patchChannel(key, e.target.value)}
                  placeholder="e.g. 987654321098765432"
                />
                <p className="text-[11px] text-white/25 leading-snug">{CHANNEL_DESCRIPTIONS[key]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly digest manual trigger */}
      <div className={card}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Trigger Weekly Digest Now</p>
            <p className="text-xs text-white/35 mt-0.5">
              Manually send the digest to the configured analytics channel. Vercel Cron fires this automatically every Sunday at midnight UTC.
            </p>
          </div>
          <button
            onClick={triggerDigest}
            disabled={digestState === "loading" || !config.channels.analytics}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm border border-white/15 text-white text-xs uppercase tracking-wider hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {digestState === "loading" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : digestState === "ok" ? (
              <Check size={14} className="text-green-400" />
            ) : digestState === "error" ? (
              <span className="text-red-400 text-sm">✕</span>
            ) : (
              <Send size={14} />
            )}
            {digestState === "ok" ? "Sent!" : digestState === "error" ? "Failed" : "Send Digest"}
          </button>
        </div>
      </div>
    </div>
  );
}
