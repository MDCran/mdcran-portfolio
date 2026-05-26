import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomeAmbient from "@/components/home/HomeAmbient";
import HomeLoader from "@/components/home/HomeLoader";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Services from "@/components/home/Services";
import FeaturedProjects from "@/components/home/FeaturedProjects";
import Clients from "@/components/home/Clients";
import CTA from "@/components/home/CTA";
import PhotoReel from "@/components/home/PhotoReel";
import MercuryPrompt from "@/components/home/MercuryPrompt";
import VisitorMap from "@/components/home/VisitorMap";
import Timeline from "@/components/home/Timeline";
import { getArticles, getClients, getExperiences, getProjects, getSiteContent, getVisitorCountsByCountry } from "@/lib/db";
import {
  PERSON_ALIASES,
  PERSON_FULL_NAME,
  PERSON_NAME,
  SITE_URL,
  buildProfessionalServiceJsonLd,
  buildSeoMetadata,
} from "@/lib/seo";
import { assetUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSeoMetadata({
  title: "Michael Cran | Software, Design, and Digital Experiences",
  description:
    "Michael David Cran (MDCran) builds software, web platforms, Minecraft maps, and creative digital work for creators and companies.",
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
  const [allProjects, allClients, allArticles, siteContent, visitorCountries, experiences] = await Promise.all([
    getProjects(),
    getClients(),
    getArticles(),
    getSiteContent(),
    getVisitorCountsByCountry().catch(() => []),
    getExperiences().catch(() => []),
  ]);

  // Build unified featured work list (projects + articles interleaved per admin order)
  const allFeaturedProjects = allProjects.filter((p) => p.featured);
  const allFeaturedArticles = allArticles.filter((a) => a.homeFeatured);

  // Collect all featured item IDs
  const allFeaturedIds = new Set([
    ...allFeaturedProjects.map((p) => p.id),
    ...allFeaturedArticles.map((a) => a.id),
  ]);

  // Use unified work order if available, otherwise fall back to projects then articles
  const workOrder = siteContent.featuredWorkOrder ?? [];
  const orderedWork = workOrder.filter((id) => allFeaturedIds.has(id));
  const orderedSet = new Set(orderedWork);
  // Append any featured items not in the order yet
  const unorderedProjects = allFeaturedProjects.filter((p) => !orderedSet.has(p.id)).map((p) => p.id);
  const unorderedArticles = allFeaturedArticles.filter((a) => !orderedSet.has(a.id)).map((a) => a.id);
  const finalWorkOrder = [...orderedWork, ...unorderedProjects, ...unorderedArticles];

  // Resolve into typed arrays for the component
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));
  const articleMap = new Map(allArticles.map((a) => [a.id, a]));
  const featuredProjects: typeof allProjects = [];
  const featuredArticles: typeof allArticles = [];
  // Keep track of order for the component — pass both arrays but they'll be interleaved by workOrder
  for (const id of finalWorkOrder) {
    const proj = projectMap.get(id);
    if (proj && proj.featured) { featuredProjects.push(proj); continue; }
    const art = articleMap.get(id);
    if (art && art.homeFeatured) { featuredArticles.push(art); continue; }
  }

  // Admin-ordered client IDs first, then any other featured clients/employers not already in the list
  const orderedFeaturedClients = siteContent.featuredClientIds
    .map((id) => allClients.find((c) => c.id === id))
    .filter((c): c is typeof allClients[number] => !!c && !!c.featured);
  const orderedClientIds = new Set(orderedFeaturedClients.map((c) => c.id));
  const additionalFeaturedClients = allClients.filter((c) => c.featured && !orderedClientIds.has(c.id));
  const featuredClients = [...orderedFeaturedClients, ...additionalFeaturedClients];

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Michael Cran | MDCran",
    url: SITE_URL,
    description: typeof metadata.description === "string" ? metadata.description : undefined,
    isPartOf: {
      "@type": "WebSite",
      name: "MDCran",
      url: SITE_URL,
    },
    about: {
      "@type": "Person",
      name: PERSON_NAME,
      alternateName: [...PERSON_ALIASES],
      url: SITE_URL,
    },
    primaryImageOfPage: assetUrl("/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_RED.png"),
  };

  const orgJsonLd = buildProfessionalServiceJsonLd(allClients.filter((client) => client.quote).length);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${PERSON_FULL_NAME} services and portfolio categories`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Arts & Entertainment", url: `${SITE_URL}/arts-and-entertainment` },
      { "@type": "ListItem", position: 2, name: "Motion & Graphics", url: `${SITE_URL}/motion-and-graphics` },
      { "@type": "ListItem", position: 3, name: "Code", url: `${SITE_URL}/code` },
      { "@type": "ListItem", position: 4, name: "Articles", url: `${SITE_URL}/articles` },
      { "@type": "ListItem", position: 5, name: "Resume", url: `${SITE_URL}/resume` },
    ],
  };

  const sectionMap: Record<string, ReactNode> = {
    hero: <Hero content={siteContent.homeHero} />,
    stats: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>
        <Stats content={siteContent.homeStats} />
      </div>
    ),
    about: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}>
        <PhotoReel content={siteContent.homeAbout} />
      </div>
    ),
    timeline: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "400px" }}>
        <Timeline experiences={experiences} content={siteContent.homeTimeline} />
      </div>
    ),
    services: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}>
        <Services content={siteContent.homeServices} />
      </div>
    ),
    featured: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1200px" }}>
        <FeaturedProjects projects={featuredProjects} articles={featuredArticles} workOrder={finalWorkOrder} content={siteContent.homeFeaturedWork} />
      </div>
    ),
    clients: (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "1200px" }}>
        <Clients clients={featuredClients} projects={allProjects} content={siteContent.homeClients} />
        <div className="content-container py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/8" />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--cranberry)]" />
            <div className="flex-1 h-px bg-white/8" />
          </div>
        </div>
      </div>
    ),
    "visitor-map": (
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "600px" }}>
        <VisitorMap countries={visitorCountries} content={siteContent.homeVisitorMap} />
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
      <HomeLoader />
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
          <div key={section.id} id={section.id} data-highlight-id={section.id} style={{ scrollMarginTop: "5rem" }}>{section.node}</div>
        ))}
        <MercuryPrompt />
      </main>
      <Footer />
    </>
  );
}
