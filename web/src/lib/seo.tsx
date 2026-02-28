import type { Metadata } from "next";

export const SITE_URL = "https://mdcran.com";
export const DEFAULT_OG_IMAGE = "/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png";

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
  return title.includes("MDCran") ? title : `${title} | MDCran`;
}

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
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
        },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: "MDCran",
      type,
      images: [socialImage],
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
      <meta property="og:site_name" content="MDCran" />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={socialImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={socialTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large"}
      />
      <meta
        name="googlebot"
        content={noIndex ? "noindex, nofollow, noimageindex" : "index, follow, max-image-preview:large"}
      />
    </>
  );
}
