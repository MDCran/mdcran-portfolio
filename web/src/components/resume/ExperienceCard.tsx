"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Client, Experience } from "@/lib/types";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  MapPin,
} from "lucide-react";

function ClientAvatar({ client }: { client: Client }) {
  if (client.avatarUrl) {
    return (
      <Link
        href={`/clients/${client.id}`}
        title={client.name}
        className="relative block w-7 h-7 rounded-full overflow-hidden border border-white/15 hover:border-[rgba(239,66,66,0.4)] transition-all duration-200 hover:scale-110 shrink-0"
      >
        <Image
          src={client.avatarUrl}
          alt={client.name}
          fill
          className="object-cover"
        />
      </Link>
    );
  }

  const initials = client.name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/clients/${client.id}`}
      title={client.name}
      className="block w-7 h-7 rounded-full border border-white/15 hover:border-[rgba(239,66,66,0.4)] transition-all duration-200 hover:scale-110 bg-white/8 flex items-center justify-center shrink-0"
    >
      <span className="text-[9px] text-white/60 font-mono">{initials}</span>
    </Link>
  );
}

export default function ExperienceCard({
  exp,
  clientsById,
  isFirstInSection = false,
  isLastInSection = false,
}: {
  exp: Experience;
  clientsById: Map<string, Client>;
  isFirstInSection?: boolean;
  isLastInSection?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const linkedClients = (exp.clientIds ?? [])
    .map((clientId) => clientsById.get(clientId))
    .filter((client): client is Client => Boolean(client));
  const hasHighlights = !!exp.highlights?.length;
  const startYear = exp.startDate.split("-")[0];
  const endLabel = exp.current ? "Present" : exp.endDate ? exp.endDate.split("-")[0] : "";

  return (
    <div className="relative pl-6 pb-12 last:pb-0">
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.08) 82%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div
        className="absolute left-0 w-px animate-timeline-glow"
        style={{
          top: isFirstInSection ? "14px" : "0",
          bottom: isLastInSection ? "12px" : "0",
          background: "linear-gradient(to bottom, transparent, #ef4242, transparent)",
          backgroundSize: "100% 120px",
          maskImage: isLastInSection
            ? "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)"
            : undefined,
          WebkitMaskImage: isLastInSection
            ? "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)"
            : undefined,
        }}
      />
      <div className="absolute left-0 top-1.5 -translate-x-1/2">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4242] shadow-[0_0_12px_rgba(239,66,66,0.8)]" />
        <div className="absolute inset-0 rounded-full bg-[#ef4242] animate-ping opacity-40" />
      </div>

      <div className="group relative rounded-sm border border-white/7 bg-white/2 hover:border-[rgba(239,66,66,0.2)] hover:bg-white/4 transition-all duration-300">
        <div className="absolute top-0 left-6 right-0 h-px bg-gradient-to-r from-[#ef4242] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-sm" />

        <div className={`p-5 sm:p-6 ${hasHighlights ? "pb-10" : ""}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <h3 className="font-nord text-lg md:text-xl text-white tracking-wide">{exp.role}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm md:text-base text-[#ef4242]">{exp.companyName}</span>
                {exp.companyUrl && (
                  <a
                    href={exp.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/20 hover:text-white/60 transition-colors"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-white/35">
                <Calendar size={11} />
                <span>{startYear}{endLabel ? ` - ${endLabel}` : ""}</span>
              </div>
              {exp.location && (
                <div className="flex items-center gap-1.5 text-xs text-white/25">
                  <MapPin size={11} />
                  <span>{exp.location}</span>
                </div>
              )}
              {exp.current && (
                <span className="text-[10px] text-[#ef4242] tracking-widest uppercase border border-[rgba(239,66,66,0.3)] px-2 py-0.5 rounded-sm mt-1">
                  Current
                </span>
              )}
            </div>
          </div>

          <p className="text-sm md:text-[15px] text-white/50 leading-relaxed mb-5">{exp.description}</p>

          {linkedClients.length > 0 && (
            <div className={`${hasHighlights ? "mb-0" : "pt-1"}`}>
              <div className="flex -space-x-1.5">
                {linkedClients.map((client) => (
                  <ClientAvatar key={client.id} client={client} />
                ))}
              </div>
            </div>
          )}
        </div>

        {hasHighlights && (
          <div className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-1/2">
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-sm border border-white/10 bg-[#0b0b0b]/95 px-5 text-[10px] tracking-widest uppercase text-white/35 transition-colors hover:text-white/70 hover:border-white/20"
            >
              <span>{expanded ? "Hide Details" : "Read More"}</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        )}

        {hasHighlights && expanded && (
          <div className="border-t border-white/7 px-5 pb-5 pt-8 sm:px-6">
            <ul className="space-y-2">
              {exp.highlights!.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm md:text-[15px] text-white/40">
                  <CheckCircle2 size={13} className="text-[#ef4242] mt-0.5 shrink-0" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
