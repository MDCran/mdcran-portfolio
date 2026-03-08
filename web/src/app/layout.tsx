import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalChrome from "@/components/layout/GlobalChrome";
import VisitorTracker from "@/components/visitor/VisitorTracker";
import { getSiteContent } from "@/lib/db";
import { assetUrl } from "@/lib/utils";
import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_ICON,
  DEFAULT_SOCIAL_DESCRIPTION,
  DEFAULT_SOCIAL_TITLE,
  PERSON_FULL_NAME,
  SAME_AS_URLS,
  SITE_URL,
  absoluteUrl,
  buildPersonJsonLd,
  buildProfessionalServiceJsonLd,
  buildWebsiteJsonLd,
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
      default: DEFAULT_SOCIAL_TITLE,
      template: "%s | MDCran",
    },
    description: DEFAULT_SOCIAL_DESCRIPTION,
    keywords: [
      "MDCran", "Michael Cran", "Michael David Cran", "MD Cran",
      "software engineer", "web developer", "web designer", "motion graphics",
      "Minecraft map maker", "level designer", "content manager",
      "thumbnail designer", "video editor", "UCF", "Orlando developer",
    ],
    authors: [{ name: PERSON_FULL_NAME, url: absoluteUrl("/about") }],
    creator: PERSON_FULL_NAME,
    publisher: BRAND_NAME,
    alternates: {
      canonical: SITE_URL,
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
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
      siteName: BRAND_NAME,
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
    other: {
      "profile:first_name": "Michael",
      "profile:last_name": "Cran",
      "profile:username": "mdcran",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const websiteJsonLd = buildWebsiteJsonLd();
  const personJsonLd = buildPersonJsonLd();
  const serviceJsonLd = buildProfessionalServiceJsonLd();

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="author" href={absoluteUrl("/about")} />
        {SAME_AS_URLS.map((url) => (
          <link key={url} rel="me" href={url} />
        ))}
      </head>
      <body className="w-full min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
        />
        <div className="relative z-[1] w-full min-h-screen flex flex-col">
          {children}
          <GlobalChrome />
          <VisitorTracker />
        </div>
      </body>
    </html>
  );
}
