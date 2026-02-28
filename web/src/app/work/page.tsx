import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import { ArrowRight } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Work",
  description: "Browse all work categories across portfolio projects, code, and articles.",
  path: "/work",
});

const sections = [
  {
    title: "Arts & Entertainment",
    description: "Minecraft experiences and live event builds.",
    href: "/arts-and-entertainment",
    links: [
      { label: "Minecraft Maps", href: "/arts-and-entertainment/minecraft-maps" },
      { label: "Events", href: "/arts-and-entertainment/events" },
    ],
  },
  {
    title: "Motion & Graphics",
    description: "Thumbnail design, video editing, and web design work.",
    href: "/motion-and-graphics",
    links: [
      { label: "Thumbnail Design", href: "/motion-and-graphics/thumbnail-design" },
      { label: "Video Editing", href: "/motion-and-graphics/video-editing" },
      { label: "Web Dev & Design", href: "/motion-and-graphics/web-dev-design" },
    ],
  },
  {
    title: "Code",
    description: "Software, tools, plugins, and full-stack builds.",
    href: "/code",
    links: [],
  },
  {
    title: "Articles",
    description: "Writing, tutorials, recipes, and personal posts.",
    href: "/articles",
    links: [],
  },
];

export default function WorkPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Portfolio"
        title="Work"
        description="Jump into every major section of the site from one place."
        breadcrumbs={[{ label: "Work" }]}
      />
      <main className="content-container py-14 sm:py-16">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="relative flex flex-col rounded-sm border border-white/7 bg-white/2 p-6 transition-colors hover:border-[rgba(239,66,66,0.22)] sm:p-7"
            >
              <Link
                href={section.href}
                aria-label={`Open ${section.title}`}
                className="absolute inset-0 z-10 rounded-sm"
              />

              <div className="relative z-20 mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-nord text-2xl text-white tracking-wider">
                    {section.title}
                  </h2>
                  <p className="text-sm text-white/40 mt-2 max-w-lg">
                    {section.description}
                  </p>
                </div>
                <Link
                  href={section.href}
                  className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase text-[#ef4242] hover:text-white transition-colors"
                >
                  Open
                  <ArrowRight size={12} />
                </Link>
              </div>

              {section.links.length > 0 && (
                <div className="relative z-20 mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="group relative overflow-hidden rounded-sm border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.015] to-transparent px-4 py-3.5 text-sm text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all hover:border-[rgba(239,66,66,0.28)] hover:text-white hover:shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
                    >
                      <span className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#ef4242]/45 to-transparent opacity-80" />
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgba(239,66,66,0.05)] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <span className="relative inline-flex items-center gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ef4242]/85 shadow-[0_0_8px_rgba(239,66,66,0.35)]" />
                        <span>{link.label}</span>
                        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
