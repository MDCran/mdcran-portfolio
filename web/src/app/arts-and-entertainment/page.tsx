import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import { Gamepad2, Swords } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Arts & Entertainment",
  description: "Minecraft maps, immersive events, and resource packs.",
  path: "/arts-and-entertainment",
});

const subcategories = [
  {
    icon: Gamepad2,
    title: "Minecraft Maps",
    description: "Custom-built Minecraft experiences for the world's biggest YouTubers.",
    href: "/arts-and-entertainment/minecraft-maps",
    count: "20+ Maps",
  },
  {
    icon: Swords,
    title: "Events",
    description: "Large-scale competitive and community Minecraft events.",
    href: "/arts-and-entertainment/events",
    count: "5+ Events",
  },
];

export default function ArtsAndEntertainmentPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Category"
        title="Arts & Entertainment"
        description="Custom Minecraft maps and immersive events for the world's biggest gaming creators."
        breadcrumbs={[{ label: "Arts & Entertainment" }]}
      />
      <main className="content-container py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subcategories.map((sub) => {
            const Icon = sub.icon;
            return (
              <Link key={sub.href} href={sub.href} className="group">
                <div className="relative p-6 rounded-sm border border-white/7 bg-white/2 overflow-hidden transition-all duration-300 hover:border-[rgba(239,66,66,0.25)] hover:bg-white/4 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(239,66,66,0.08)] h-full">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-10 h-10 rounded-sm bg-[rgba(239,66,66,0.08)] border border-[rgba(239,66,66,0.15)] flex items-center justify-center mb-5 group-hover:bg-[rgba(239,66,66,0.15)] transition-colors">
                    <Icon size={18} className="text-[#ef4242]" />
                  </div>
                  <div className="text-[10px] text-[#ef4242] tracking-widest uppercase mb-2">
                    {sub.count}
                  </div>
                  <h2 className="font-nord text-xl tracking-wide text-white mb-3 group-hover:text-[#ef4242] transition-colors">
                    {sub.title}
                  </h2>
                  <p className="text-sm text-white/40 leading-relaxed">{sub.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
