import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import { Image, Video, Monitor } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Motion & Graphics",
  description: "Thumbnail design, video editing, and web design.",
  path: "/motion-and-graphics",
});

const subcategories = [
  {
    icon: Image,
    title: "Thumbnail Design",
    description: "Eye-catching thumbnails for gaming and entertainment content.",
    href: "/motion-and-graphics/thumbnail-design",
  },
  {
    icon: Video,
    title: "Video Editing",
    description: "Fast, on-demand video editing for YouTube and social media.",
    href: "/motion-and-graphics/video-editing",
  },
  {
    icon: Monitor,
    title: "Web Dev & Design",
    description: "Modern, premium web experiences for creators, companies and brands.",
    href: "/motion-and-graphics/web-dev-design",
  },
];

export default function MotionAndGraphicsPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Category"
        title="Motion & Graphics"
        description="High-impact visual content — thumbnails, video edits, graphic design, and full web experiences."
        breadcrumbs={[{ label: "Motion & Graphics" }]}
      />
      <main className="content-container py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {subcategories.map((sub) => {
            const Icon = sub.icon;
            return (
              <Link key={sub.href} href={sub.href} className="group">
                <div className="relative p-7 rounded-sm border border-white/7 bg-white/2 overflow-hidden transition-all duration-300 hover:border-[rgba(239,66,66,0.25)] hover:bg-white/4 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(239,66,66,0.08)] h-full">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-10 h-10 rounded-sm bg-[rgba(239,66,66,0.08)] border border-[rgba(239,66,66,0.15)] flex items-center justify-center mb-5 group-hover:bg-[rgba(239,66,66,0.15)] transition-colors">
                    <Icon size={18} className="text-[#ef4242]" />
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
