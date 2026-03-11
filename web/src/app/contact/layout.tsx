import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Contact",
  description:
    "Get in touch with Michael Cran to discuss projects, timelines, collaborations, and custom work. Based in Orlando, Florida.",
  path: "/contact",
  keywords: [
    "contact MDCran",
    "hire Michael Cran",
    "freelance developer Orlando",
    "web developer for hire",
    "Minecraft map commission",
  ],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
