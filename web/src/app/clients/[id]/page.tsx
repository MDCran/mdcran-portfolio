import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientProjectsSection from "@/components/clients/ClientProjectsSection";
import { getClientById, getProjectsByClientId } from "@/lib/db";
import { Youtube, Twitch, Instagram, Twitter, Github, Globe, Facebook, Music2, EyeOff } from "lucide-react";
import type { Platform } from "@/lib/types";
import { buildSeoMetadata } from "@/lib/seo";

const platformConfig: Record<Platform, { icon: typeof Globe; color: string; label: string }> = {
  youtube: { icon: Youtube, color: "#ff0000", label: "YouTube" },
  twitch: { icon: Twitch, color: "#9146ff", label: "Twitch" },
  tiktok: { icon: Music2, color: "#69c9d0", label: "TikTok" },
  instagram: { icon: Instagram, color: "#e1306c", label: "Instagram" },
  facebook: { icon: Facebook, color: "#1877f2", label: "Facebook" },
  x: { icon: Twitter, color: "#1da1f2", label: "X / Twitter" },
  github: { icon: Github, color: "#ffffff", label: "GitHub" },
  website: { icon: Globe, color: "#ffffff", label: "Website" },
  spotify: { icon: Music2, color: "#1db954", label: "Spotify" },
  discord: { icon: Globe, color: "#5865f2", label: "Discord" },
};

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) {
    return buildSeoMetadata({
      title: "Client Not Found",
      description: "The requested client profile could not be found.",
      path: `/clients/${id}`,
      noIndex: true,
    });
  }

  return buildSeoMetadata({
    title: client.name,
    description: client.bio ?? `Projects created for ${client.name} by MDCran.`,
    path: `/clients/${client.id}`,
    image: client.bannerUrl ?? client.avatarUrl,
    type: "profile",
  });
}

export default async function ClientPage({ params }: Props) {
  const { id } = await params;
  const [client, clientProjects] = await Promise.all([
    getClientById(id),
    getProjectsByClientId(id),
  ]);
  if (!client) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: client.name,
    description: client.bio,
    url: client.socialLinks[0]?.url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <div className="relative h-52 md:h-72 w-full mt-[var(--navbar-height)] overflow-hidden bg-gradient-to-br from-[rgba(239,66,66,0.15)] to-[#0a0a0a]">
        {client.bannerUrl && (
          <Image
            src={client.bannerUrl}
            alt={`${client.name} banner`}
            fill
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(239,66,66,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,66,66,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <main className="content-container max-w-6xl py-14">
        <div className="relative -mt-20 mb-12 flex flex-col items-start gap-6 md:flex-row md:items-start">
          <div className="relative shrink-0">
            {client.avatarUrl ? (
              <div className="relative w-32 h-32 rounded-sm overflow-hidden border-2 border-[rgba(239,66,66,0.4)] shadow-[0_0_30px_rgba(239,66,66,0.2)]">
                <Image src={client.avatarUrl} alt={client.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-sm bg-[rgba(239,66,66,0.1)] border-2 border-[rgba(239,66,66,0.4)] shadow-[0_0_30px_rgba(239,66,66,0.2)] flex items-center justify-center">
                <span className="font-nord text-[#ef4242] text-4xl">
                  {client.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="font-nord text-3xl md:text-4xl text-white tracking-wider">
                {client.name}
              </h1>
              {client.location && (
                <span className="text-[11px] text-white/30 tracking-wider border border-white/10 px-2 py-0.5 rounded-sm">
                  {client.location}
                </span>
              )}
            </div>
            <p className="text-sm text-white/50 mb-3">{client.roles.join(" · ")}</p>
            {client.bio && (
              <p className="text-sm text-white/40 max-w-xl leading-relaxed">{client.bio}</p>
            )}
          </div>

          <div className="shrink-0 w-[148px]">
            {clientProjects.length > 0 ? (
              <div className="px-4 py-2 rounded-sm border border-[rgba(239,66,66,0.3)] bg-[rgba(239,66,66,0.08)]">
                <div className="font-nord text-2xl text-white">{clientProjects.length}</div>
                <div className="text-[10px] text-[#ef4242] tracking-widest uppercase">Projects</div>
              </div>
            ) : (
              <div className="group relative w-full px-4 py-2 rounded-sm border border-white/10 bg-white/4">
                <div className="flex h-8 items-center">
                  <EyeOff size={22} className="text-white/65" />
                </div>
                <div className="text-[10px] text-white/70 tracking-widest uppercase">Private</div>
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-sm border border-white/10 bg-[#090909]/95 px-3 py-2 text-[10px] leading-relaxed text-white/70 opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-opacity duration-150 group-hover:opacity-100">
                  This client may have private projects that are not able to be shown to the public due to NDA, project type, or by request. Or they have not been added yet.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-12">
          {client.socialLinks.map((link) => {
            const cfg = platformConfig[link.platform];
            const Icon = cfg.icon;
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-sm bg-white/4 border border-white/8 hover:border-white/20 hover:bg-white/8 backdrop-blur-sm transition-all duration-200"
              >
                <Icon size={14} style={{ color: cfg.color }} />
                <div>
                  <div className="text-xs text-white/70 group-hover:text-white transition-colors">
                    {cfg.label}
                  </div>
                  {link.handle && (
                    <div className="text-[10px] text-white/35">{link.handle}</div>
                  )}
                </div>
              </a>
            );
          })}
        </div>

        {client.quote && (
          <div className="relative mb-14 p-6 md:p-8 rounded-sm border border-[rgba(239,66,66,0.2)] bg-[rgba(239,66,66,0.04)] backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ef4242] to-transparent" />
            <div className="absolute -top-4 -left-2 text-[120px] font-nord text-[rgba(239,66,66,0.08)] leading-none select-none">
              &ldquo;
            </div>
            <p className="relative text-white/80 text-base md:text-lg leading-relaxed italic mb-3">
              {client.quote.text}
            </p>
            <div className="text-[11px] text-[#ef4242] tracking-widest uppercase">
              - {client.name}
              {client.quote.context && (
                <span className="text-white/30 ml-2 normal-case tracking-normal">
                  · {client.quote.context}
                </span>
              )}
            </div>
          </div>
        )}

        <ClientProjectsSection projects={clientProjects} />
      </main>
      <Footer />
    </>
  );
}
