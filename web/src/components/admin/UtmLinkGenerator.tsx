"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Loader2,
  HelpCircle,
  X,
  Save,
} from "lucide-react";
import type { UtmLink } from "@/lib/types";

const SOURCES = [
  { label: "LinkedIn", value: "linkedin" },
  { label: "Handshake", value: "handshake" },
  { label: "Indeed", value: "indeed" },
  { label: "ZipRecruiter", value: "ziprecruiter" },
  { label: "Glassdoor", value: "glassdoor" },
  { label: "Discord", value: "discord" },
  { label: "SMS/Text", value: "sms" },
  { label: "Email", value: "email" },
  { label: "Custom", value: "custom" },
];

const MEDIUMS = [
  { label: "social", value: "social" },
  { label: "referral", value: "referral" },
  { label: "sms", value: "sms" },
  { label: "email", value: "email" },
  { label: "direct", value: "direct" },
  { label: "cpc", value: "cpc" },
  { label: "custom", value: "custom" },
];

// Short explanations shown in the help tooltips next to each UTM field.
const HELP: Record<string, string> = {
  source:
    "utm_source — where the traffic comes from (the referrer / platform). e.g. linkedin, indeed, newsletter.",
  medium:
    "utm_medium — the marketing channel / type of link. e.g. social, email, cpc, referral.",
  campaign:
    "utm_campaign — the specific promotion or initiative this link belongs to. e.g. spring-outreach, resume-blast.",
  term: "utm_term — paid-search keyword the link targets. Mostly optional. e.g. software engineer.",
  content:
    "utm_content — distinguishes links pointing to the same place (A/B tests, placements). e.g. hero-cta, footer-link.",
};

function buildUrl(
  base: string,
  campaign: string,
  source: string,
  medium: string,
  customSource: string,
  term: string,
  content: string
): string {
  const resolvedSource = source === "custom" ? customSource.trim() : source;
  if (!base || !resolvedSource || !campaign.trim()) return "";

  try {
    const url = new URL(base.trim());
    if (campaign.trim()) url.searchParams.set("utm_campaign", campaign.trim());
    if (resolvedSource) url.searchParams.set("utm_source", resolvedSource);
    if (medium) url.searchParams.set("utm_medium", medium);
    if (term.trim()) url.searchParams.set("utm_term", term.trim());
    if (content.trim()) url.searchParams.set("utm_content", content.trim());
    return url.toString();
  } catch {
    return "";
  }
}

/* ─── Help icon with tooltip ─────────────────────────────────────────────── */

function HelpTip({ text }: { text: string }) {
  return (
    <span className="group/help relative inline-flex">
      <HelpCircle
        size={11}
        className="text-white/25 hover:text-white/55 transition-colors cursor-help"
      />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-52 -translate-x-1/2 rounded-sm border border-white/10 bg-[#101018] px-2.5 py-1.5 text-[10px] font-normal normal-case leading-relaxed tracking-normal text-white/70 shadow-xl group-hover/help:block">
        {text}
      </span>
    </span>
  );
}

export default function UtmLinkGenerator() {
  const [baseUrl, setBaseUrl] = useState("https://mdcran.com");
  const [label, setLabel] = useState("");
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("linkedin");
  const [medium, setMedium] = useState("social");
  const [customSource, setCustomSource] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [links, setLinks] = useState<UtmLink[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/utm-links")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.links) setLinks(d.links as UtmLink[]);
        else setLinks([]);
      })
      .catch(() => setLinks([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generatedUrl = buildUrl(baseUrl, campaign, source, medium, customSource, term, content);

  const resetForm = () => {
    setEditingId(null);
    setLabel("");
    setBaseUrl("https://mdcran.com");
    setCampaign("");
    setSource("linkedin");
    setMedium("social");
    setCustomSource("");
    setTerm("");
    setContent("");
    setShowAdvanced(false);
  };

  const handleSave = async () => {
    if (!generatedUrl || saving) return;
    const resolvedSource = source === "custom" ? customSource.trim() : source;
    setSaving(true);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      label: label.trim() || `${resolvedSource} — ${campaign.trim()}`,
      baseUrl: baseUrl.trim(),
      source: resolvedSource,
      medium,
      campaign: campaign.trim(),
      term: term.trim() || undefined,
      content: content.trim() || undefined,
      url: generatedUrl,
    };
    try {
      await fetch("/api/admin/utm-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      resetForm();
      load();
    } catch {
      // swallow — the list reload will reflect actual state
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (link: UtmLink) => {
    setEditingId(link.id);
    setLabel(link.label);
    setBaseUrl(link.baseUrl);
    setCampaign(link.campaign);
    // If the saved source isn't a known preset, treat it as a custom source.
    const known = SOURCES.some((s) => s.value === link.source && s.value !== "custom");
    if (known) {
      setSource(link.source);
      setCustomSource("");
    } else {
      setSource("custom");
      setCustomSource(link.source);
    }
    setMedium(link.medium || "social");
    setTerm(link.term ?? "");
    setContent(link.content ?? "");
    if (link.term || link.content) setShowAdvanced(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this saved link?")) return;
    try {
      await fetch("/api/admin/utm-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (editingId === id) resetForm();
      load();
    } catch {
      /* ignore — reload reflects state */
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard
      .writeText(generatedUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const handleCopyRow = (url: string, id: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => {});
  };

  const inputCls =
    "h-8 w-full rounded-sm border border-white/10 bg-white/5 px-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20";
  const selectCls =
    "h-8 w-full rounded-sm border border-white/10 bg-white/5 px-2 text-xs text-white outline-none focus:border-white/30 appearance-none cursor-pointer [&>option]:bg-[#1a1a1a] [&>option]:text-white";
  const labelCls =
    "flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/35 mb-1";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LinkIcon size={15} className="text-[var(--cranberry)]" />
        <div>
          <p className="font-nord text-base text-white leading-none">UTM Link Generator</p>
          <p className="text-xs text-white/35 mt-0.5">
            Build, save, and reuse campaign tracking URLs.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-sm border border-white/8 bg-white/[0.02] p-4 space-y-3">
        {editingId && (
          <div className="flex items-center justify-between rounded-sm border border-[var(--cranberry)]/30 bg-[var(--cranberry)]/10 px-2.5 py-1.5">
            <span className="text-[11px] text-[var(--cranberry)]">Editing saved link</span>
            <button
              onClick={resetForm}
              title="Cancel edit"
              className="inline-flex items-center gap-1 text-[10px] text-white/50 hover:text-white transition-colors"
            >
              <X size={11} /> Cancel
            </button>
          </div>
        )}

        {/* Label + Base URL */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. LinkedIn — Spring outreach"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Base URL</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://mdcran.com"
              className={inputCls}
            />
          </div>
        </div>

        {/* Campaign + Source */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Campaign <HelpTip text={HELP.campaign} />
            </label>
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="e.g. summer-2025"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Source <HelpTip text={HELP.source} />
            </label>
            <div className="relative">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={selectCls}
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
              />
            </div>
          </div>
        </div>

        {/* Medium + Custom Source (conditional) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              Medium <HelpTip text={HELP.medium} />
            </label>
            <div className="relative">
              <select
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                className={selectCls}
              >
                {MEDIUMS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
              />
            </div>
          </div>
          {source === "custom" && (
            <div>
              <label className={labelCls}>Custom Source</label>
              <input
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
                placeholder="e.g. newsletter"
                className={inputCls}
              />
            </div>
          )}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors"
        >
          <ChevronDown
            size={11}
            className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
          Advanced (term, content)
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Term <HelpTip text={HELP.term} />
              </label>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. software engineer"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                Content <HelpTip text={HELP.content} />
              </label>
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g. hero-cta"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Generated URL preview */}
        <div>
          <label className={labelCls}>Generated URL</label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={generatedUrl}
              placeholder="Fill in campaign and source to generate a URL…"
              className={`${inputCls} flex-1 font-mono text-[10px] text-white/70 select-all`}
            />
            <button
              onClick={handleCopy}
              disabled={!generatedUrl}
              title="Copy URL"
              className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-sm border transition-colors ${
                copied
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : "border-white/10 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white"
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {editingId && (
            <button
              onClick={resetForm}
              className="h-8 px-3 rounded-sm border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/25 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!generatedUrl || saving}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-sm bg-[var(--cranberry)] text-xs text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {editingId ? "Update link" : "Save link"}
          </button>
        </div>
      </div>

      {/* Saved links table */}
      {links === null ? (
        <p className="text-xs text-white/30 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Loading saved links…
        </p>
      ) : links.length === 0 ? (
        <div className="rounded-sm border border-white/8 bg-white/[0.02] p-8 text-center">
          <LinkIcon size={24} className="mx-auto mb-2 text-white/15" />
          <p className="text-sm text-white/30">No saved links yet.</p>
          <p className="text-xs text-white/20 mt-1">
            Build a URL above and click Save to keep it here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-white/8">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/[0.025]">
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Label
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Source / Medium / Campaign
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  URL
                </th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {links.map((link) => (
                <tr
                  key={link.id}
                  className={`bg-white/[0.01] hover:bg-white/[0.04] transition-colors ${
                    editingId === link.id ? "bg-[var(--cranberry)]/[0.06]" : ""
                  }`}
                >
                  {/* Label */}
                  <td className="px-3 py-3 text-white font-medium max-w-[160px] truncate">
                    {link.label}
                  </td>

                  {/* Source / Medium / Campaign */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <code className="rounded bg-white/8 px-1 py-0.5 text-[10px] text-[var(--cranberry)]/90">
                      {link.source}
                    </code>{" "}
                    <span className="text-white/30">/</span>{" "}
                    <span className="text-white/55">{link.medium}</span>{" "}
                    <span className="text-white/30">/</span>{" "}
                    <span className="text-white/55">{link.campaign}</span>
                  </td>

                  {/* URL */}
                  <td className="px-3 py-3 max-w-[260px]">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex-1 font-mono text-[10px] text-white/30 truncate min-w-0"
                        title={link.url}
                      >
                        {link.url}
                      </span>
                      <button
                        onClick={() => handleCopyRow(link.url, link.id)}
                        title="Copy"
                        className={`shrink-0 h-6 w-6 flex items-center justify-center rounded-sm border transition-colors ${
                          copiedId === link.id
                            ? "border-green-500/40 bg-green-500/10 text-green-400"
                            : "border-white/10 bg-white/5 hover:bg-white/15 text-white/40 hover:text-white/70"
                        }`}
                      >
                        {copiedId === link.id ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(link)}
                        title="Edit"
                        className="text-white/35 hover:text-white transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        title="Remove"
                        className="text-white/35 hover:text-[#ef4242] transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
