"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { assetUrl } from "@/lib/utils";
import { Mail, Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { SiteContent } from "@/lib/types";
import { defaultSiteContent } from "@/lib/site-content";

export default function Footer() {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/data/site-content")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SiteContent | null) => {
        if (!cancelled && data) {
          setSiteContent(data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const footer = siteContent.footer;
  const bottomLinks = footer.bottomLinks.filter((link) => link.href !== "/about");

  return (
    <footer className="border-t border-white/7">
      <div className="content-container py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-9 sm:gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-5">
              <Link
                href="/"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-3 group"
              >
                <Image
                  src={assetUrl(siteContent.brandLogoUrl) ?? ""}
                  alt="MDCran"
                  width={120}
                  height={30}
                  style={{ height: "30px", width: "auto" }}
                  className="opacity-75 group-hover:opacity-100 transition-opacity duration-200 rounded-sm"
                />
                <span className="font-nord text-sm tracking-[0.18em] text-white/85 group-hover:text-white transition-colors duration-200">
                  <span>MD</span>
                  <span className="text-[var(--cranberry)]">CRAN</span>
                </span>
              </Link>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-[240px] mb-5">
              {footer.locationText}
            </p>
            <p className="text-sm text-white/30 leading-relaxed max-w-[260px] mb-5">
              {footer.blurb}
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center h-7 px-3 rounded-sm border border-[rgba(239,66,66,0.5)] bg-[rgba(239,66,66,0.08)] text-[var(--cranberry)] text-[9px] tracking-widest uppercase whitespace-nowrap">
                {footer.statusLabel}
              </span>
              <Link
                href={footer.emailHref}
                aria-label="Email"
                className="w-7 h-7 rounded-sm border border-white/10 bg-white/4 flex items-center justify-center text-white/40 hover:text-[var(--cranberry)] hover:border-[rgba(239,66,66,0.3)] hover:bg-[rgba(239,66,66,0.06)] transition-all duration-200"
              >
                <Mail size={13} />
              </Link>
              <a
                href={footer.githubHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-7 h-7 rounded-sm border border-white/10 bg-white/4 flex items-center justify-center text-white/40 hover:text-[var(--cranberry)] hover:border-[rgba(239,66,66,0.3)] hover:bg-[rgba(239,66,66,0.06)] transition-all duration-200"
              >
                <Github size={13} />
              </a>
            </div>
          </div>

          {footer.linkGroups.map((section) => (
            <div key={section.title}>
              <h4 className="font-nord text-xs tracking-widest uppercase text-white/70 mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/45 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8 bg-white/6" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-white/25">
          <span>
            © {new Date().getFullYear()} {footer.copyrightText}
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {bottomLinks.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="hover:text-white/50 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
