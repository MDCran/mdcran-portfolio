import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomeAmbient from "@/components/home/HomeAmbient";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Services from "@/components/home/Services";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import Clients from "@/components/home/Clients";
import CTA from "@/components/home/CTA";
import PhotoReel from "@/components/home/PhotoReel";
import MercuryPrompt from "@/components/home/MercuryPrompt";
import { getClients, getProjects, getSiteContent } from "@/lib/db";
import {
  PERSON_ALIASES,
  PERSON_FULL_NAME,
  PERSON_NAME,
  buildProfessionalServiceJsonLd,
  buildSeoMetadata,
} from "@/lib/seo";
import { assetUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Michael Cran | Software, Design, and Digital Experiences",
  description:
    "Michael David Cran, also known as Michael Cran and MDCran, builds software, secure web platforms, Minecraft experiences, and creative digital work for creators, companies, and online communities.",
  path: "/",
  keywords: [
    "MDCran", "Michael Cran", "Michael David Cran", "MD Cran",
    "Minecraft Map Maker", "Minecraft Maps", "Level Designer",
    "Thumbnail Designer", "Video Editor", "Content Creator",
    "Software Developer", "Web Developer", "UCF Computer Science",
    "Orlando Freelancer", "Independent Contractor",
  ],
});

export default async function HomePage() {
  const [allProjects, allClients, siteContent] = await Promise.all([
    getProjects(),
    getClients(),
    getSiteContent(),
  ]);

  // Use admin-ordered lists if configured, otherwise fall back to featured flag
  const featuredProjects = siteContent.featuredProjectIds.length
    ? siteContent.featuredProjectIds
        .map((id) => allProjects.find((p) => p.id === id))
        .filter((p): p is typeof allProjects[number] => !!p && !!p.featured)
    : allProjects.filter((p) => p.featured);

  const featuredClients = siteContent.featuredClientIds.length
    ? siteContent.featuredClientIds.map((id) => allClients.find((c) => c.id === id)).filter(Boolean) as typeof allClients
    : allClients.filter((c) => c.featured);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Michael Cran | MDCran",
    url: "https://mdcran.com",
    description: typeof metadata.description === "string" ? metadata.description : undefined,
    isPartOf: {
      "@type": "WebSite",
      name: "MDCran",
      url: "https://mdcran.com",
    },
    about: {
      "@type": "Person",
      name: PERSON_NAME,
      alternateName: [...PERSON_ALIASES],
      url: "https://mdcran.com/about",
    },
    primaryImageOfPage: assetUrl("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_RED.png"),
  };

  const orgJsonLd = buildProfessionalServiceJsonLd(allClients.filter((client) => client.quote).length);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${PERSON_FULL_NAME} services and portfolio categories`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Arts & Entertainment", url: "https://mdcran.com/arts-and-entertainment" },
      { "@type": "ListItem", position: 2, name: "Motion & Graphics", url: "https://mdcran.com/motion-and-graphics" },
      { "@type": "ListItem", position: 3, name: "Code", url: "https://mdcran.com/code" },
      { "@type": "ListItem", position: 4, name: "Articles", url: "https://mdcran.com/articles" },
      { "@type": "ListItem", position: 5, name: "Resume", url: "https://mdcran.com/resume" },
      { "@type": "ListItem", position: 6, name: "About Michael Cran", url: "https://mdcran.com/about" },
    ],
  };

  const sectionMap: Record<string, ReactNode> = {
    hero: <Hero content={siteContent.homeHero} />,
    stats: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>
        <Stats />
      </div>
    ),
    about: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}>
        <PhotoReel content={siteContent.homeAbout} />
      </div>
    ),
    services: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}>
        <Services content={siteContent.homeServices} />
      </div>
    ),
    featured: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1200px" }}>
        <FeaturedProjects projects={featuredProjects} content={siteContent.homeFeaturedWork} />
      </div>
    ),
    clients: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1200px" }}>
        <Clients clients={featuredClients} projects={allProjects} content={siteContent.homeClients} />
      </div>
    ),
    cta: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "700px" }}>
        <CTA content={siteContent.homeCta} />
      </div>
    ),
  };

  const orderedSections = siteContent.homeSectionOrder
    .map((id) => ({ id, node: sectionMap[id] }))
    .filter((entry): entry is { id: string; node: ReactNode } => !!entry.node);
  const sectionsToRender = orderedSections.length
    ? orderedSections
    : Object.entries(sectionMap).map(([id, node]) => ({ id, node }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <Navbar />
      <main className="relative overflow-hidden">
        <HomeAmbient />
        {sectionsToRender.map((section) => (
          <div key={section.id}>{section.node}</div>
        ))}
        <MercuryPrompt />
      </main>
      <Footer />
    </>
  );
}
