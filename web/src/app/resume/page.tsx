import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import ResumeContent from "@/components/resume/ResumeContent";
import {
  getAwards,
  getCertifications,
  getClients,
  getClubs,
  getEducations,
  getExperiences,
  getSiteContent,
  getSkills,
} from "@/lib/db";
import { buildSeoMetadata, SITE_URL } from "@/lib/seo";

export async function generateMetadata() {
  const siteContent = await getSiteContent();
  const header = siteContent.pageHeaders.resume;

  return buildSeoMetadata({
    title: header.title || "Resume — Software Engineer & Developer",
    description: header.description || "Michael Cran's professional experience, skills, certifications, awards, and resume details.",
    path: "/resume",
  });
}

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const [experiences, educations, skills, certifications, awards, clubs, clients] = await Promise.all([
    getExperiences(),
    getEducations(),
    getSkills(),
    getCertifications(),
    getAwards(),
    getClubs(),
    getClients(),
  ]);
  const siteContent = await getSiteContent();
  const header = siteContent.pageHeaders.resume;
  const clientsById = new Map(clients.map((client) => [client.id, client]));

  // Sort experiences newest-first by endDate (current jobs first), then startDate
  function parseExpDate(d?: string): number {
    if (!d) return Infinity; // "current" / no end date → sort first
    // MM-YYYY
    const mmYyyy = d.match(/^(\d{2})-(\d{4})$/);
    if (mmYyyy) return parseInt(mmYyyy[2], 10) * 100 + parseInt(mmYyyy[1], 10);
    // YYYY-MM or YYYY-MM-DD
    const yyyyMm = d.match(/^(\d{4})-(\d{2})/);
    if (yyyyMm) return parseInt(yyyyMm[1], 10) * 100 + parseInt(yyyyMm[2], 10);
    return 0;
  }
  function sortNewest(a: typeof experiences[0], b: typeof experiences[0]) {
    const endA = a.current ? Infinity : parseExpDate(a.endDate);
    const endB = b.current ? Infinity : parseExpDate(b.endDate);
    if (endB !== endA) return endB - endA;
    return parseExpDate(b.startDate) - parseExpDate(a.startDate);
  }

  const jobs = experiences.filter((e) => e.type === "job").sort(sortNewest);
  const renownedProjects = experiences.filter((e) => e.type === "renowned").sort(sortNewest);
  const derivedEducations =
    educations.length > 0
      ? educations
      : experiences
          .filter((e) => e.id === "ucf-cs")
          .map((e) => ({
            id: e.id,
            institution: e.companyName,
            degree: e.role,
            field: undefined,
            startDate: e.startDate,
            endDate: e.endDate,
            current: e.current,
            location: e.location,
            gpa: undefined,
            description: e.description,
            highlights: e.highlights,
          }));
  const volunteerWork = experiences.filter(
    (e) => e.type === "volunteer" && !(educations.length === 0 && e.id === "ucf-cs")
  ).sort(sortNewest);
  const skillCategories = Array.from(new Set(skills.map((s) => s.category)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Michael Cran",
    alternateName: "MDCran",
    jobTitle: "Independent Contractor & Content Creator",
    description:
      "Minecraft map maker, graphic designer, video editor, and web developer based in Orlando, FL.",
    url: SITE_URL,
    sameAs: [
      "https://github.com/mdcran",
      "https://www.linkedin.com/in/mdcran/",
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Orlando",
      addressRegion: "FL",
      addressCountry: "US",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientPageTitle title={header.title} />
      <Navbar />
      <ResumeContent
        header={header}
        jobs={jobs}
        renownedProjects={renownedProjects}
        derivedEducations={derivedEducations}
        volunteerWork={volunteerWork}
        skills={skills}
        skillCategories={skillCategories}
        certifications={certifications}
        awards={awards}
        clubs={clubs}
        clientsById={clientsById}
      />
      <Footer />
    </>
  );
}
