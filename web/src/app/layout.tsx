import type { Metadata, Viewport } from "next";
import "./globals.css";
import ResumeButton from "@/components/shared/ResumeButton";
import { DEFAULT_OG_IMAGE, SITE_URL, absoluteUrl } from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#ef4242",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MDCran",
    template: "%s | MDCran",
  },
  description:
    "An Independent Contractor creating unique online content — Minecraft maps, events, thumbnail design, video editing, and more.",
  keywords: [
    "MDCran", "Michael Cran", "Minecraft Map Maker", "Level Designer",
    "Content Manager", "Thumbnail Designer", "Video Editor", "UCF",
  ],
  authors: [{ name: "MDCran" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "MDCran",
    description: "Independent Contractor · Content Creator · Developer",
    url: "https://mdcran.com",
    siteName: "MDCran",
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    title: "MDCran",
    description: "Independent Contractor · Content Creator · Developer",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="w-full min-h-screen">
        <div className="relative z-[1] w-full min-h-screen flex flex-col">
          {children}
          <ResumeButton />
        </div>
      </body>
    </html>
  );
}
