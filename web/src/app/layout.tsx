import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalChrome from "@/components/layout/GlobalChrome";
import { getSiteContent } from "@/lib/db";
import { assetUrl } from "@/lib/utils";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_ICON,
  DEFAULT_SOCIAL_DESCRIPTION,
  DEFAULT_SOCIAL_TITLE,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#ef4242",
};

export async function generateMetadata(): Promise<Metadata> {
  const siteContent = await getSiteContent().catch(() => null);
  const faviconUrl = assetUrl(siteContent?.faviconUrl) ?? DEFAULT_SITE_ICON;

  return {
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
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    openGraph: {
      title: DEFAULT_SOCIAL_TITLE,
      description: DEFAULT_SOCIAL_DESCRIPTION,
      url: SITE_URL,
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
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="w-full min-h-screen">
        <div className="relative z-[1] w-full min-h-screen flex flex-col">
          {children}
          <GlobalChrome />
        </div>
      </body>
    </html>
  );
}
