"use client";

import Link from "next/link";
import { Mail, Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerLinks = [
  {
    title: "Arts & Entertainment",
    links: [
      { label: "Minecraft Maps", href: "/arts-and-entertainment/minecraft-maps" },
      { label: "Events", href: "/arts-and-entertainment/events" },
    ],
  },
  {
    title: "Motion & Graphics",
    links: [
      { label: "Thumbnail Design", href: "/motion-and-graphics/thumbnail-design" },
      { label: "Video Editing", href: "/motion-and-graphics/video-editing" },
      { label: "Web Dev & Design", href: "/motion-and-graphics/web-dev-design" },
    ],
  },
  {
    title: "Code & Articles",
    links: [
      { label: "Code", href: "/code" },
      { label: "Articles", href: "/articles" },
    ],
  },
  {
    title: "Other",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Resume", href: "/resume" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/7">
      <div className="content-container py-14 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-9 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-5">
              <Link
                href="/"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-3 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png"
                  alt="MDCran"
                  style={{ height: "30px", width: "auto" }}
                  className="opacity-75 group-hover:opacity-100 transition-opacity duration-200 rounded-sm"
                />
                <span className="font-nord text-sm tracking-[0.18em] text-white/85 group-hover:text-white transition-colors duration-200">
                  <span>MD</span>
                  <span className="text-[#ef4242]">CRAN</span>
                </span>
              </Link>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-[240px] mb-5">
              Based in Orlando, FL.
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center h-7 px-3 rounded-sm border border-[rgba(239,66,66,0.5)] bg-[rgba(239,66,66,0.08)] text-[#ef4242] text-[9px] tracking-widest uppercase whitespace-nowrap">Open for work</span>
              <a
                href="mailto:contact@mdcran.com"
                aria-label="Email"
                className="w-7 h-7 rounded-sm border border-white/10 bg-white/4 flex items-center justify-center text-white/40 hover:text-[#ef4242] hover:border-[rgba(239,66,66,0.3)] hover:bg-[rgba(239,66,66,0.06)] transition-all duration-200"
              >
                <Mail size={13} />
              </a>
              <a
                href="https://github.com/mdcran"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-7 h-7 rounded-sm border border-white/10 bg-white/4 flex items-center justify-center text-white/40 hover:text-[#ef4242] hover:border-[rgba(239,66,66,0.3)] hover:bg-[rgba(239,66,66,0.06)] transition-all duration-200"
              >
                <Github size={13} />
              </a>
            </div>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="font-nord text-xs tracking-widest uppercase text-white/70 mb-4">
                {section.title}
              </h4>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
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
          <span>© {new Date().getFullYear()} MDCran. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/unsubscribe" className="hover:text-white/50 transition-colors">Unsubscribe</Link>
            <Link
              href="/admin"
              className="hover:text-white/50 transition-colors opacity-40 hover:opacity-100"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
