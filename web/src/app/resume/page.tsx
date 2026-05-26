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
  getResumeProfile,
  getSkillCategories,
  getProjects,
  getArticles,
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
  const [experiences, educations, skills, certifications, awards, clubs, clients, profile, skillCategoryMeta] =
    await Promise.all([
      getExperiences(),
      getEducations(),
      getSkills(),
      getCertifications(),
      getAwards(),
      getClubs(),
      getClients(),
      getResumeProfile(),
      getSkillCategories(),
    ]);
  const [allProjects, allArticles] = await Promise.all([
    getProjects({ refreshVideoViews: false }).catch(() => []),
    getArticles().catch(() => []),
  ]);
  const siteContent = await getSiteContent();

  // Featured work for the Renowned Projects section — reuse the home-page featured selection.
  const featuredProjectsAll = allProjects.filter((p) => p.featured);
  const featuredArticlesAll = allArticles.filter((a) => a.homeFeatured);
  const featuredIds = new Set([...featuredProjectsAll.map((p) => p.id), ...featuredArticlesAll.map((a) => a.id)]);
  const workOrder = (siteContent.featuredWorkOrder ?? []).filter((id) => featuredIds.has(id));
  const orderedSet = new Set(workOrder);
  const finalFeaturedOrder = [
    ...workOrder,
    ...featuredProjectsAll.filter((p) => !orderedSet.has(p.id)).map((p) => p.id),
    ...featuredArticlesAll.filter((a) => !orderedSet.has(a.id)).map((a) => a.id),
  ];
  const projById = new Map(allProjects.map((p) => [p.id, p]));
  const artById = new Map(allArticles.map((a) => [a.id, a]));
  const featuredWork = finalFeaturedOrder
    .map((id) => {
      const p = projById.get(id);
      if (p && p.featured) return { type: "project" as const, project: p };
      const a = artById.get(id);
      if (a && a.homeFeatured) return { type: "article" as const, article: a };
      return null;
    })
    .filter(Boolean) as ({ type: "project"; project: (typeof allProjects)[number] } | { type: "article"; article: (typeof allArticles)[number] })[];
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

  const [locality, region] = profile.location.split(",").map((part) => part.trim());
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName,
    alternateName: "MDCran",
    jobTitle: profile.title,
    description:
      "Minecraft map maker, graphic designer, video editor, and web developer based in " +
      profile.location +
      ".",
    url: SITE_URL,
    sameAs: [profile.githubUrl, profile.linkedinUrl].filter(Boolean),
    address: {
      "@type": "PostalAddress",
      addressLocality: locality || profile.location,
      addressRegion: region || undefined,
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
        profile={profile}
        skillCategoryMeta={skillCategoryMeta}
        featuredWork={featuredWork}
      />
      <Footer />
    </>
  );
}
