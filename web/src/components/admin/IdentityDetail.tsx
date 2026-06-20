"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Monitor, Smartphone, Tablet, MessageSquare, Mic, Network, Mail, Calendar,
  Sparkles, Activity, ShieldAlert, X, ExternalLink, ChevronDown, ChevronRight, Copy, Check,
} from "lucide-react";
import type { Identity, LinkMethod } from "@/lib/types";
import IdentityPicker from "@/components/admin/IdentityPicker";
import type { ConfirmOpts } from "@/components/admin/ConfirmModal";

/* Deep-link targets — each admin section is a hash route on the dashboard. */
const DASH = "/admin/dashboard";
const SECTION = {
  sessions: `${DASH}#sessions`,
  traffic: `${DASH}#traffic`,
  messages: `${DASH}#contact-form-entries`,
  bookings: `${DASH}#booking`,
  rizz: `${DASH}#rizz`,
  rateLimits: `${DASH}#rate-limits`,
  crossdevice: `${DASH}#crossdevice`,
  analytics: `${DASH}#analytics`,
};

type RegDevice = { serial: string; deviceType?: string; browser?: string; os?: string; gpu?: string; ip?: string | null; lastSeen?: string };
type CandidateEdge = { id: string; sourceSerial: string; targetSerial: string; confidenceScore: number; criteria: string[]; state: string; sharedPath?: string | null };
type FeedMsg = { id: string; role: "user" | "assistant"; channel: "text" | "voice"; content: string; currentPage?: string | null; createdAt: string };
type ContactMsg = { id: string; name?: string; email?: string; phone?: string; subject?: string; message: string; createdAt: string; ip?: string | null };
type BookingRow = { id: string; typeName: string; start: string; name: string; email: string; status: string; durationMinutes: number; location: string };
type RizzRow = { id: string; name: string; nickname?: string; phone?: string; createdAt: string };
type SessionRow = {
  sessionId: string; ip?: string | null; lastPath?: string | null; lastSeen: string; countryName?: string | null;
  browser?: string; os?: string; device?: string; utmSource?: string | null; utmCampaign?: string | null; utmMedium?: string | null;
  referrerDomain?: string | null; resolvedSourceLabel?: string | null; pageviews?: number; events?: number;
};
type RateLimits = {
  chat: { ip: string; count: number; resetAt: string }[];
  forms: { id?: string; scope?: string; ip?: string; count?: number; blockedCount?: number }[];
};
type DetailData = {
  identity: Identity; registry: RegDevice[]; candidates: CandidateEdge[]; messages: FeedMsg[];
  contactMessages: ContactMsg[]; bookings: BookingRow[]; rizz: RizzRow[]; sessions: SessionRow[]; rateLimits: RateLimits;
};

const LINK_METHOD_LABEL: Record<LinkMethod, string> = {
  serial: "fingerprint", token: "tracking link", ip: "same network",
  handshake: "QR bridge", manual: "admin", merge: "merged", candidate: "matched",
};

function DeviceIcon({ type }: { type?: string }) {
  if (type === "mobile") return <Smartphone size={12} className="text-white/40" />;
  if (type === "tablet") return <Tablet size={12} className="text-white/40" />;
  return <Monitor size={12} className="text-white/40" />;
}
function fmtDate(s?: string) { try { return s ? new Date(s).toLocaleString() : "—"; } catch { return "—"; } }
function isActiveSession(lastSeen?: string): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
      className="text-white/25 hover:text-white/70 transition-colors cursor-pointer"
      title="Copy"
    >
      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  );
}

function DeviceRow({ d, allIdentities, id, onMove, onRemove, canRemove }: {
  d: import("@/lib/types").IdentityDevice;
  allIdentities: import("@/lib/types").Identity[];
  id: string;
  onMove: (serial: string, toId: string) => void;
  onRemove: (serial: string) => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const fingerFields = [
    { label: "GPU", value: d.gpu },
    { label: "Screen", value: d.screen },
    { label: "Timezone", value: d.timezone },
    { label: "Language", value: d.language },
    { label: "UA", value: d.userAgent },
  ].filter((f) => f.value);
  return (
    <div className="rounded-sm border border-white/6 bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-[11px]">
        <button onClick={() => setExpanded((v) => !v)} className="text-white/30 hover:text-white/70 cursor-pointer shrink-0">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <DeviceIcon type={d.device} />
        <span className="font-mono text-[10px] text-white/55 select-all">{d.serial}</span>
        <CopyButton value={d.serial} />
        <span className="font-mono text-white/45">{d.ip ?? "—"}</span>
        <span className="text-white/40">{d.browser} · {d.os} · {d.device}</span>
        {d.linkMethod && (
          <span className="rounded-sm bg-white/8 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/45" title={`Linked via ${LINK_METHOD_LABEL[d.linkMethod]}${typeof d.linkConfidence === "number" ? ` · ${Math.round(d.linkConfidence * 100)}%` : ""}`}>
            {LINK_METHOD_LABEL[d.linkMethod]}{typeof d.linkConfidence === "number" ? ` ${Math.round(d.linkConfidence * 100)}%` : ""}
          </span>
        )}
        <span className="ml-auto text-white/25">{new Date(d.lastSeen).toLocaleDateString()}</span>
        {allIdentities.length > 1 && <IdentityPicker identities={allIdentities} excludeId={id} onPick={(toId) => onMove(d.serial, toId)} label="Move" icon={<ExternalLink size={11} />} />}
        {canRemove && <button onClick={() => onRemove(d.serial)} title="Remove device" className="text-white/30 hover:text-[#ef4242] cursor-pointer"><X size={12} /></button>}
      </div>
      {expanded && (
        <div className="border-t border-white/6 px-3 py-2 grid grid-cols-1 gap-0.5">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-white/30 w-16 shrink-0">First seen</span>
            <span className="font-mono text-white/55">{fmtDate(d.firstSeen)}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-white/30 w-16 shrink-0">Last seen</span>
            <span className="font-mono text-white/55">{fmtDate(d.lastSeen)}</span>
          </div>
          {fingerFields.map((f) => (
            <div key={f.label} className="flex items-start gap-2 text-[10px]">
              <span className="text-white/30 w-16 shrink-0">{f.label}</span>
              <span className="font-mono text-white/55 break-all">{f.value}</span>
              <CopyButton value={f.value!} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sub-section header with a deep-link to the relevant full admin section. */
function HubHeader({ icon, label, count, href }: { icon: React.ReactNode; label: string; count: number; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-white/40">{icon} {label} ({count})</p>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-[10px] text-[var(--cranberry)]/80 hover:text-[var(--cranberry)]">
          Open in admin <ExternalLink size={10} />
        </Link>
      )}
    </div>
  );
}
/** A clickable row that deep-links to its admin section. */
function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-sm border border-white/6 bg-white/[0.02] px-2.5 py-1.5 transition-colors hover:border-white/15 hover:bg-white/[0.04]">
      {children}
    </Link>
  );
}

export default function IdentityDetail({ id, allIdentities, confirm, onMutate }: {
  id: string;
  allIdentities: Identity[];
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  onMutate?: () => void;
}) {
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    // No synchronous setState here — all state updates happen in the async callbacks
    // (avoids cascading-renders / set-state-in-effect when called from the effect).
    fetch(`/api/admin/identities/${id}/detail`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.identity) { setData(d as DetailData); setError(false); } else setError(true); })
      .catch(() => setError(true));
  }, [id]);
  useEffect(() => { reload(); }, [reload]);

  const moveDevice = async (serial: string, toId: string) => {
    if (!toId) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move-device", serial, toId }) });
    setBusy(false); reload(); onMutate?.();
  };
  const removeDevice = async (serial: string) => {
    if (!(await confirm({ title: "Remove this device?", body: "It will be detached from this identity.", confirmLabel: "Remove", danger: true }))) return;
    setBusy(true);
    await fetch("/api/admin/identities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove-device", id, serial }) });
    setBusy(false); reload(); onMutate?.();
  };

  if (error) return <p className="text-xs text-white/30">Couldn’t load this identity’s activity.</p>;
  if (!data) return <div className="flex items-center gap-2 text-[11px] text-white/40"><Loader2 size={12} className="animate-spin" /> Loading everything tied to this identity…</div>;

  const devices = data.identity.devices ?? [];
  const suspected = data.candidates.filter((c) => c.state === "SUSPECTED");

  return (
    <div className="space-y-4">
      {/* Devices */}
      <div className="space-y-1.5">
        <HubHeader icon={<Network size={11} />} label="Devices" count={devices.length} href={SECTION.crossdevice} />
        {devices.map((d) => (
          <DeviceRow key={d.serial} d={d} allIdentities={allIdentities} id={id} onMove={moveDevice} onRemove={removeDevice} canRemove={devices.length > 1} />
        ))}
      </div>

      {/* Suspected cross-device links */}
      {suspected.length > 0 && (
        <div className="space-y-1.5">
          <HubHeader icon={<Network size={11} />} label="Suspected device links" count={suspected.length} href={SECTION.crossdevice} />
          {suspected.map((c) => (
            <RowLink key={c.id} href={SECTION.crossdevice}>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-mono text-white/45">{c.sourceSerial.slice(0, 8)}… ↔ {c.targetSerial.slice(0, 8)}…</span>
                <span className="ml-auto font-medium text-[var(--cranberry)]">{c.confidenceScore}/100</span>
              </div>
              {c.criteria?.length > 0 && <p className="mt-0.5 text-[10px] text-white/35">{c.criteria.slice(0, 3).join(" · ")}</p>}
            </RowLink>
          ))}
        </div>
      )}

      {/* Sessions & traffic */}
      <div className="space-y-1.5">
        {(() => {
          const activeSessions = data.sessions.filter((s) => isActiveSession(s.lastSeen));
          const allSessions = [...data.sessions].sort((a, b) => (isActiveSession(b.lastSeen) ? 1 : 0) - (isActiveSession(a.lastSeen) ? 1 : 0));
          return (
            <HubHeader
              icon={
                <span className="flex items-center gap-1">
                  <Activity size={11} />
                  {activeSessions.length > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-[9px]">{activeSessions.length} live</span>
                    </span>
                  )}
                </span>
              }
              label="Sessions & traffic"
              count={data.sessions.length}
              href={SECTION.sessions}
            />
          );
        })()}
        {data.sessions.length === 0 ? <p className="text-[11px] text-white/30">No sessions recorded.</p> : (
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {[...data.sessions].sort((a, b) => (isActiveSession(b.lastSeen) ? 1 : 0) - (isActiveSession(a.lastSeen) ? 1 : 0)).slice(0, 60).map((s) => {
              const active = isActiveSession(s.lastSeen);
              return (
                <RowLink key={s.sessionId} href={SECTION.sessions}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/45">
                    {active && (
                      <span className="flex items-center gap-1 rounded-sm bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] text-emerald-400 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
                      </span>
                    )}
                    <span className="font-mono text-white/40">{s.ip ?? "—"}</span>
                    {s.countryName && <span>{s.countryName}</span>}
                    <span>{s.browser} · {s.os}</span>
                    {s.lastPath && <span className="text-white/35">{s.lastPath}</span>}
                    {(s.pageviews || s.events) && <span className="text-white/30">{s.pageviews ?? 0}pv · {s.events ?? 0}ev</span>}
                    {(s.resolvedSourceLabel || s.utmSource || s.referrerDomain) && (
                      <span className="rounded-sm bg-white/8 px-1.5 py-0.5 text-white/50">
                        {s.resolvedSourceLabel || s.utmSource || s.referrerDomain}{s.utmCampaign ? ` · ${s.utmCampaign}` : ""}{s.utmMedium ? ` · ${s.utmMedium}` : ""}
                      </span>
                    )}
                    <span className="ml-auto text-white/25">{fmtDate(s.lastSeen)}</span>
                  </div>
                </RowLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-1.5">
        <HubHeader icon={<Mail size={11} />} label="Messages" count={data.contactMessages.length} href={SECTION.messages} />
        {data.contactMessages.length === 0 ? <p className="text-[11px] text-white/30">No contact messages.</p> : (
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {data.contactMessages.map((m) => (
              <RowLink key={m.id} href={SECTION.messages}>
                <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                  <span className="text-white/60">{m.name || "—"}</span>{m.email && <span>· {m.email}</span>}{m.phone && <span>· {m.phone}</span>}
                  <span className="ml-auto text-white/25">{fmtDate(m.createdAt)}</span>
                </div>
                {m.subject && <p className="mt-0.5 text-[11px] text-white/55">{m.subject}</p>}
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] leading-snug text-white/70">{m.message}</p>
              </RowLink>
            ))}
          </div>
        )}
      </div>

      {/* Bookings */}
      <div className="space-y-1.5">
        <HubHeader icon={<Calendar size={11} />} label="Bookings" count={data.bookings.length} href={SECTION.bookings} />
        {data.bookings.length === 0 ? <p className="text-[11px] text-white/30">No bookings.</p> : data.bookings.map((b) => (
          <RowLink key={b.id} href={SECTION.bookings}>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/50">
              <span className="text-white/65">{b.typeName}</span><span>· {b.durationMinutes}m</span><span>· {b.location}</span><span className="text-white/40">· {b.name}</span>
              <span className={`ml-auto ${b.status === "cancelled" ? "text-white/30 line-through" : "text-emerald-400/70"}`}>{fmtDate(b.start)}</span>
            </div>
          </RowLink>
        ))}
      </div>

      {/* Rizz */}
      {data.rizz.length > 0 && (
        <div className="space-y-1.5">
          <HubHeader icon={<Sparkles size={11} />} label="Rizz submissions" count={data.rizz.length} href={SECTION.rizz} />
          {data.rizz.map((r) => (
            <RowLink key={r.id} href={SECTION.rizz}>
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <span className="text-white/65">{r.name}{r.nickname ? ` (${r.nickname})` : ""}</span>{r.phone && <span className="font-mono text-white/40">{r.phone}</span>}
                <span className="ml-auto text-white/25">{fmtDate(r.createdAt)}</span>
              </div>
            </RowLink>
          ))}
        </div>
      )}

      {/* AI conversations (text + voice) */}
      <div className="space-y-1.5">
        <HubHeader icon={<MessageSquare size={11} />} label="AI conversations" count={data.messages.length} href={SECTION.crossdevice} />
        {data.messages.length === 0 ? <p className="text-[11px] text-white/30">No AI conversations recorded yet.</p> : (
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {data.messages.map((m) => (
              <div key={m.id} className={`rounded-sm px-2.5 py-1.5 text-[11px] ${m.role === "user" ? "bg-white/[0.03] text-white/70" : "bg-[var(--cranberry)]/8 text-white/80"}`}>
                <div className="mb-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-white/35">
                  {m.channel === "voice" ? <Mic size={9} /> : <MessageSquare size={9} />}
                  <span>{m.role === "user" ? "Visitor" : "Michael (AI)"}</span>
                  <span className="ml-auto normal-case tracking-normal text-white/25">{fmtDate(m.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap break-words leading-snug">{m.content}</p>
                {m.currentPage && <p className="mt-0.5 text-[9px] text-white/25">on {m.currentPage}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate-limit hits */}
      {(data.rateLimits.chat.length > 0 || data.rateLimits.forms.length > 0) && (
        <div className="space-y-1.5">
          <HubHeader icon={<ShieldAlert size={11} />} label="Rate-limit hits" count={data.rateLimits.chat.length + data.rateLimits.forms.length} href={SECTION.rateLimits} />
          {data.rateLimits.chat.map((c) => (
            <RowLink key={`chat-${c.ip}`} href={SECTION.rateLimits}>
              <div className="flex items-center gap-2 text-[10px] text-white/45"><span>AI chat</span><span className="font-mono text-white/40">{c.ip}</span><span className="ml-auto">{c.count} reqs · resets {fmtDate(c.resetAt)}</span></div>
            </RowLink>
          ))}
          {data.rateLimits.forms.map((f, i) => (
            <RowLink key={`form-${f.id ?? i}`} href={SECTION.rateLimits}>
              <div className="flex items-center gap-2 text-[10px] text-white/45"><span>{f.scope ?? "form"}</span><span className="font-mono text-white/40">{f.ip}</span><span className="ml-auto">{f.count ?? 0} · {f.blockedCount ?? 0} blocked</span></div>
            </RowLink>
          ))}
        </div>
      )}

      {busy && <div className="flex items-center gap-2 text-[11px] text-white/40"><Loader2 size={12} className="animate-spin" /> Working…</div>}
    </div>
  );
}
