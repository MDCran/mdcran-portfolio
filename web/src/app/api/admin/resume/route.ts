import { adminError, synchronizeContent, type ContentGroup } from "@/lib/admin-content";
import { NextRequest, NextResponse } from "next/server";
import {
  getExperiences,
  getEducations,
  getSkills,
  getCertifications,
  getAwards,
  getClubs,
  getResumeProfile,
  getSkillCategories,
} from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [experiences, educations, skills, certifications, awards, clubs, profile, skillCategories] =
    await Promise.all([
      getExperiences(),
      getEducations(),
      getSkills(),
      getCertifications(),
      getAwards(),
      getClubs(),
      getResumeProfile(),
      getSkillCategories(),
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

  return NextResponse.json({
    experiences,
    educations: legacyEducation,
    skills,
    certifications,
    awards,
    clubs,
    profile,
    skillCategories,
  });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const collections = ["experiences", "educations", "skills", "certifications", "awards", "clubs", "skillCategories"] as const;
    const groups: ContentGroup[] = collections.filter((name) => body[name] !== undefined).map((collection) => ({ collection, records: body[collection] }));
    if (body.profile !== undefined) groups.push({ collection: "resumeProfile", records: [body.profile] });
    return NextResponse.json({ ok: true, ...await synchronizeContent(groups) });
  } catch (error) { return adminError(error); }
}
