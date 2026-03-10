import type { Metadata } from "next";
import { assetUrl } from "./utils";

export const SITE_URL = "https://mdcran.com";
export const BRAND_NAME = "MDCran";
export const PERSON_NAME = "Michael Cran";
export const PERSON_FULL_NAME = "Michael David Cran";
export const CONTACT_EMAIL = "contact@mdcran.com";
export const SAME_AS_URLS = [
  "https://github.com/mdcran",
  "https://www.linkedin.com/in/mdcran/",
] as const;
export const PERSON_ALIASES = [
  BRAND_NAME,
  "MD Cran",
  PERSON_NAME,
  PERSON_FULL_NAME,
  "Michael D Cran",
] as const;
export const DEFAULT_SITE_ICON = assetUrl("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png")!;
export const DEFAULT_OG_IMAGE = assetUrl("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_RED.png")!;
export const DEFAULT_SOCIAL_TITLE = "Michael Cran | MDCran";
export const DEFAULT_SOCIAL_DESCRIPTION =
  "Official website of Michael David Cran, also known as Michael Cran and MDCran, featuring software engineering, web design, motion graphics, Minecraft projects, articles, and client work.";

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
};

function withBrand(title: string) {
  return title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}`;
}

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    alternateName: [PERSON_NAME, PERSON_FULL_NAME],
    url: SITE_URL,
    description: DEFAULT_SOCIAL_DESCRIPTION,
    inLanguage: "en-US",
    publisher: {
      "@type": "Person",
      name: PERSON_NAME,
      alternateName: [...PERSON_ALIASES],
      url: SITE_URL,
    },
  };
}

export function buildPersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PERSON_NAME,
    givenName: "Michael",
    additionalName: "David",
    familyName: "Cran",
    alternateName: [...PERSON_ALIASES],
    url: SITE_URL,
    image: absoluteUrl(DEFAULT_SITE_ICON),
    description:
      "Software engineer, web developer, digital designer, motion graphics creator, and Minecraft experience builder based in Orlando, Florida.",
    email: CONTACT_EMAIL,
    sameAs: [...SAME_AS_URLS],
    homeLocation: {
      "@type": "Place",
      name: "Orlando, Florida, United States",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Orlando",
        addressRegion: "FL",
        addressCountry: "US",
      },
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "University of Central Florida",
      url: "https://www.ucf.edu",
    },
    jobTitle: "Independent Contractor",
    worksFor: {
      "@type": "Organization",
      name: BRAND_NAME,
      url: SITE_URL,
    },
    knowsAbout: [
      "Software engineering",
      "Web development",
      "Web design",
      "Motion graphics",
      "Video editing",
      "Thumbnail design",
      "Minecraft map design",
      "Digital experiences",
      "TypeScript",
      "Java",
    ],
  };
}

export function buildProfessionalServiceJsonLd(reviewCount = 0) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: BRAND_NAME,
    url: SITE_URL,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description:
      "Independent software engineering, web design, motion graphics, and Minecraft project services from Michael Cran.",
    areaServed: "Worldwide",
    priceRange: "$",
    founder: {
      "@type": "Person",
      name: PERSON_NAME,
      url: SITE_URL,
    },
    email: CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Orlando",
      addressRegion: "FL",
      addressCountry: "US",
    },
    sameAs: [...SAME_AS_URLS],
    aggregateRating:
      reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: "5",
            reviewCount: String(reviewCount),
          }
        : undefined,
  };
}

export function buildSeoMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  keywords,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
}: SeoOptions): Metadata {
  const canonical = absoluteUrl(path);
  const socialTitle = withBrand(title);
  const socialImage = absoluteUrl(image);

  return {
    title,
    description,
    keywords,
    creator: PERSON_FULL_NAME,
    publisher: BRAND_NAME,
    authors: authors?.length
      ? authors.map((name) => ({ name }))
      : [{ name: PERSON_FULL_NAME, url: SITE_URL }],
    category: "Portfolio",
    alternates: {
      canonical,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
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
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: BRAND_NAME,
      locale: "en_US",
      type,
      images: [
        {
          url: socialImage,
          alt: socialTitle,
        },
      ],
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      creator: "@mdcran",
      images: [socialImage],
    },
  };
}

export function SeoHead({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = "website",
}: Omit<SeoOptions, "keywords" | "publishedTime" | "modifiedTime" | "authors">) {
  const canonical = absoluteUrl(path);
  const socialTitle = withBrand(title);
  const socialImage = absoluteUrl(image);

  return (
    <>
      <title>{socialTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={socialTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={BRAND_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={socialImage} />
      <meta property="og:image:alt" content={socialTitle} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={socialTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />
      <meta name="twitter:image:alt" content={socialTitle} />
      <meta name="twitter:creator" content="@mdcran" />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}
      />
      <meta
        name="googlebot"
        content={noIndex ? "noindex, nofollow, noimageindex" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}
      />
    </>
  );
}
