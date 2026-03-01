import type { Metadata, Viewport } from "next";
import "./globals.css";
import ResumeButton from "@/components/shared/ResumeButton";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SOCIAL_DESCRIPTION,
  DEFAULT_SOCIAL_TITLE,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

export const viewport: Viewport = {
  themeColor: "#ef4242",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MDCran",
    template: "%s | MDCran",
  },
  description: DEFAULT_SOCIAL_DESCRIPTION,
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
    title: DEFAULT_SOCIAL_TITLE,
    description: DEFAULT_SOCIAL_DESCRIPTION,
    url: "https://mdcran.com",
    siteName: "MDCran",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        alt: DEFAULT_SOCIAL_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    title: DEFAULT_SOCIAL_TITLE,
    description: DEFAULT_SOCIAL_DESCRIPTION,
    creator: "@mdcran",
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
