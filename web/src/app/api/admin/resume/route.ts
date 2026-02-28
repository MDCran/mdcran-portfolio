import { NextRequest, NextResponse } from "next/server";
import {
  getExperiences,
  getEducations,
  getSkills,
  getCertifications,
  getAwards,
  getClubs,
  saveExperiences,
  saveEducations,
  saveSkills,
  saveCertifications,
  saveAwards,
  saveClubs,
} from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [experiences, educations, skills, certifications, awards, clubs] = await Promise.all([
    getExperiences(),
    getEducations(),
    getSkills(),
    getCertifications(),
    getAwards(),
    getClubs(),
  ]);
  const legacyEducation =
    educations.length > 0
      ? educations
      : experiences
          .filter((experience) => experience.id === "ucf-cs")
          .map((experience) => ({
            id: experience.id,
            institution: experience.companyName,
            degree: experience.role,
            field: undefined,
            startDate: experience.startDate,
            endDate: experience.endDate,
            current: experience.current,
            location: experience.location,
            gpa: undefined,
            description: experience.description,
            highlights: experience.highlights,
          }));

  return NextResponse.json({ experiences, educations: legacyEducation, skills, certifications, awards, clubs });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { experiences, educations, skills, certifications, awards, clubs } = await req.json();
  await Promise.all([
    experiences !== undefined ? saveExperiences(experiences) : Promise.resolve(),
    educations !== undefined ? saveEducations(educations) : Promise.resolve(),
    skills !== undefined ? saveSkills(skills) : Promise.resolve(),
    certifications !== undefined ? saveCertifications(certifications) : Promise.resolve(),
    awards !== undefined ? saveAwards(awards) : Promise.resolve(),
    clubs !== undefined ? saveClubs(clubs) : Promise.resolve(),
  ]);
  return NextResponse.json({ ok: true });
}
