import { NextResponse } from "next/server";
import { publicSiteContent } from "@/lib/public-site-content";
import {
  getArticles,
  getAwards,
  getCertifications,
  getClients,
  getClubs,
  getEducations,
  getExperiences,
  getFeaturedProjects,
  getProjects,
  getResumeProfile,
  getSiteContent,
  getSkills,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [
    siteContent,
    projects,
    featuredProjects,
    articles,
    clients,
    experiences,
    educations,
    skills,
    certifications,
    awards,
    clubs,
    resumeProfile,
  ] = await Promise.all([
    getSiteContent(),
    getProjects(),
    getFeaturedProjects(),
    getArticles(),
    getClients(),
    getExperiences(),
    getEducations(),
    getSkills(),
    getCertifications(),
    getAwards(),
    getClubs(),
    getResumeProfile(),
  ]);

  const featuredClients = clients.filter((client) => client.featured);

  return NextResponse.json({
    siteContent: publicSiteContent(siteContent),
    projects,
    featuredProjects,
    articles,
    clients,
    featuredClients,
    experiences,
    educations,
    skills,
    certifications,
    awards,
    clubs,
    resumeProfile,
    generatedAt: new Date().toISOString(),
  });
}
