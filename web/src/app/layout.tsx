import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme-effects.css";
import GlobalChrome from "@/components/layout/GlobalChrome";
import { ThemeProvider } from "@/lib/ThemeContext";
import VisitorTracker from "@/components/visitor/VisitorTracker";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";
import ReferrerTrackerMount from "@/components/analytics/ReferrerTrackerMount";
import AnnouncementBanner from "@/components/layout/AnnouncementBanner";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import IdentityPreservationProvider from "@/components/identity/IdentityPreservationProvider";
import WelcomeBack from "@/components/identity/WelcomeBack";
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
  // Favicon matches the navbar profile mark: explicit faviconUrl → brand logo → red default.
  const faviconUrl = assetUrl(siteContent?.faviconUrl || siteContent?.brandLogoUrl) ?? DEFAULT_SITE_ICON;

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
    authors: [{ name: PERSON_FULL_NAME, url: SITE_URL }],
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const websiteJsonLd = buildWebsiteJsonLd();
  const personJsonLd = buildPersonJsonLd();
  const serviceJsonLd = buildProfessionalServiceJsonLd();
  const layoutContent = await getSiteContent().catch(() => null);

  return (
    <html lang="en" className="dark scroll-smooth" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("mdcran_theme");if(t)document.documentElement.setAttribute("data-theme",t);else document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`,
          }}
        />
        <link rel="author" href={SITE_URL} />
        {SAME_AS_URLS.map((url) => (
          <link key={url} rel="me" href={url} />
        ))}
      </head>
      <body className="w-full min-h-screen">
        {/* SVG colorblind filters — server-rendered so they exist before any CSS filter reference fires */}
        <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <defs>
            <filter id="cb-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0" /></filter>
            <filter id="cb-protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0" /></filter>
            <filter id="cb-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0" /></filter>
          </defs>
        </svg>
        <GoogleAnalytics />
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
        <ThemeProvider>
          <IdentityPreservationProvider>
            <WelcomeBack />
            <AnnouncementBanner banner={layoutContent?.announcementBanner} />
            <div className="relative z-[1] w-full min-h-screen flex flex-col">
              {/* Color-blind filters apply here only — the fixed chrome below stays unfiltered
                  so it doesn't break position:fixed (chat, accessibility menu, etc.). */}
              <div data-cb-content className="flex w-full flex-1 flex-col">
                {children}
              </div>
              <GlobalChrome />
              <VisitorTracker />
              <AnalyticsTracker />
              <ReferrerTrackerMount />
            </div>
          </IdentityPreservationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
