import { NextResponse } from "next/server";
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
  ]);

  const featuredClients = clients.filter((client) => client.featured);

  return NextResponse.json({
    siteContent,
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
    generatedAt: new Date().toISOString(),
  });
}
