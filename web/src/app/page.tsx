import type { Metadata } from "next";
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
import { getFeaturedProjects, getClients, getProjects } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MDCran - Independent Contractor & Content Creator",
  description:
    "Michael Cran (MDCran) - Independent Contractor specializing in Minecraft maps, level design, thumbnail design, video editing, and web development. Computer Science student at UCF. Based in Orlando, FL.",
  keywords: [
    "MDCran", "Michael Cran", "Michael David Cran", "MD Cran",
    "Minecraft Map Maker", "Minecraft Maps", "Level Designer",
    "Thumbnail Designer", "Video Editor", "Content Creator",
    "PopularMMOs maps", "MrBeast Minecraft", "UCF Computer Science",
    "Orlando Freelancer", "Independent Contractor",
  ],
  openGraph: {
    title: "MDCran - Independent Contractor",
    description: "Minecraft maps, motion graphics, web development & more. Based in Orlando, FL.",
    url: "https://mdcran.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MDCran - Independent Contractor",
    description: "Minecraft maps, motion graphics, web development & more.",
  },
  alternates: {
    canonical: "https://mdcran.com",
  },
};

export default async function HomePage() {
  const [allProjects, allClients, featuredProjects] = await Promise.all([
    getProjects(),
    getClients(),
    getFeaturedProjects(),
  ]);
  const featuredClients = allClients.filter((client) => client.featured);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Michael Cran",
    alternateName: ["MDCran", "MD Cran", "Michael David Cran", "Mr. Cranberry"],
    jobTitle: "Independent Contractor",
    description: metadata.description,
    url: "https://mdcran.com",
    image: "https://mdcran.com/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Orlando",
      addressRegion: "FL",
      addressCountry: "US",
    },
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "University of Central Florida",
      url: "https://www.ucf.edu",
    },
    knowsAbout: [
      "Minecraft Map Design", "Level Design", "Thumbnail Design",
      "Video Editing", "Web Development", "TypeScript", "Java",
    ],
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      value: 1,
    },
    worksFor: {
      "@type": "Organization",
      name: "MDCran",
      url: "https://mdcran.com",
    },
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "MDCran",
    url: "https://mdcran.com",
    description: "Independent content creation, Minecraft map design, and motion graphics services.",
    areaServed: "Worldwide",
    priceRange: "$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Orlando",
      addressRegion: "FL",
      addressCountry: "US",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: String(allClients.filter((client) => client.quote).length),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <Navbar />
      <main className="relative overflow-hidden">
        <HomeAmbient />
        <Hero />
        <Stats />
        <PhotoReel />
        <Services />
        <FeaturedProjects projects={featuredProjects} />
        <Clients clients={featuredClients} projects={allProjects} />
        <CTA />
        <MercuryPrompt />
      </main>
      <Footer />
    </>
  );
}
