import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ExperienceCard from "@/components/resume/ExperienceCard";
import {
  getAwards,
  getCertifications,
  getClients,
  getClubs,
  getEducations,
  getExperiences,
  getSkills,
} from "@/lib/db";
import {
  Briefcase,
  Heart,
  Code2,
  Palette,
  Globe,
  Award as AwardIcon,
  GraduationCap,
  Users,
  ExternalLink,
  Linkedin,
  Star,
} from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = buildSeoMetadata({
  title: "Resume",
  description: "Michael Cran's professional experience, skills, certifications, awards, and resume details.",
  path: "/resume",
});

const skillCategoryMeta = {
  technology: { label: "Technology", icon: Code2 },
  creative: { label: "Creative", icon: Palette },
  language: { label: "Languages", icon: Globe },
  ai: { label: "AI", icon: Code2 },
  other: { label: "Other", icon: Users },
};

function humanizeCategory(category: string) {
  return category
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const clientsById = new Map(clients.map((client) => [client.id, client]));

  const jobs = experiences.filter((experience) => experience.type === "job");
  const renownedProjects = experiences.filter((experience) => experience.type === "renowned");
  const derivedEducations =
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
  const volunteerWork = experiences.filter(
    (experience) => experience.type === "volunteer" && !(educations.length === 0 && experience.id === "ucf-cs")
  );
  const skillCategories = Array.from(new Set(skills.map((skill) => skill.category)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Michael Cran",
    alternateName: "MDCran",
    jobTitle: "Independent Contractor & Content Creator",
    description:
      "Minecraft map maker, graphic designer, video editor, and web developer based in Orlando, FL.",
    url: "https://mdcran.com",
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
      <Navbar />
      <PageHeader
        eyebrow="Career"
        title="Resume"
        breadcrumbs={[{ label: "Resume" }]}
        actions={
          <div className="flex items-center gap-3">
            <a
              href="https://www.linkedin.com/in/mdcran/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open LinkedIn profile"
              title="LinkedIn"
              className="flex items-center justify-center h-9 w-9 border border-white/15 text-white/60 rounded-sm hover:border-[rgba(239,66,66,0.4)] hover:text-white transition-colors"
            >
              <Linkedin size={13} />
            </a>
            <a
              href="/Michael_Cran_Resume.pdf"
              download
              className="flex items-center gap-2 h-9 px-4 text-xs tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors shadow-[0_0_20px_rgba(239,66,66,0.3)]"
            >
              Download PDF
            </a>
          </div>
        }
      />
      <main className="content-container py-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-2 space-y-14 pt-0">
            <section>
              <div className="flex items-center gap-3 mb-9">
                <Briefcase size={16} className="text-[#ef4242]" />
                <h2 className="font-nord text-xl text-white tracking-wider">Work Experience</h2>
              </div>
              <div className="space-y-0">
                {jobs.map((experience, index) => (
                  <ExperienceCard
                    key={experience.id}
                    exp={experience}
                    clientsById={clientsById}
                    isFirstInSection={index === 0}
                    isLastInSection={index === jobs.length - 1}
                  />
                ))}
              </div>
            </section>

            {renownedProjects.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-9">
                  <Star size={16} className="text-[#ef4242]" />
                  <h2 className="font-nord text-xl text-white tracking-wider">Renowned Projects</h2>
                </div>
                <div className="space-y-0">
                  {renownedProjects.map((experience, index) => (
                    <ExperienceCard
                      key={experience.id}
                      exp={experience}
                      clientsById={clientsById}
                      isFirstInSection={index === 0}
                      isLastInSection={index === renownedProjects.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {derivedEducations.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-9">
                  <GraduationCap size={16} className="text-[#ef4242]" />
                  <h2 className="font-nord text-xl text-white tracking-wider">Education</h2>
                </div>
                <div className="space-y-0">
                  {derivedEducations.map((education, index) => (
                    <ExperienceCard
                      key={education.id}
                      exp={{
                        id: education.id,
                        type: "job",
                        companyName: education.institution,
                        role: education.field ? `${education.degree} in ${education.field}` : education.degree,
                        startDate: education.startDate,
                        endDate: education.endDate,
                        current: education.current,
                        location: education.location,
                        description:
                          education.description?.trim() ||
                          (education.gpa ? `GPA: ${education.gpa}` : "Academic background"),
                        highlights: education.highlights,
                      }}
                      clientsById={clientsById}
                      isFirstInSection={index === 0}
                      isLastInSection={index === derivedEducations.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {volunteerWork.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-9">
                  <Heart size={16} className="text-[#ef4242]" />
                  <h2 className="font-nord text-xl text-white tracking-wider">Volunteer</h2>
                </div>
                <div className="space-y-0">
                  {volunteerWork.map((experience, index) => (
                    <ExperienceCard
                      key={experience.id}
                      exp={experience}
                      clientsById={clientsById}
                      isFirstInSection={index === 0}
                      isLastInSection={index === volunteerWork.length - 1}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-10 pt-0 lg:pt-[56px]">
            <div className="p-6 rounded-sm border border-white/7 bg-white/2">
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={14} className="text-[#ef4242]" />
                <h2 className="font-nord text-base text-white tracking-wider">Skills</h2>
              </div>
              <div className="space-y-4">
                {skillCategories.map((category) => {
                  const categorySkills = skills.filter((skill) => skill.category === category);
                  if (!categorySkills.length) return null;
                  const normalizedCategory = category.toLowerCase();
                  const meta =
                    skillCategoryMeta[normalizedCategory as keyof typeof skillCategoryMeta] ?? {
                      label: humanizeCategory(category),
                      icon: Users,
                    };
                  const Icon = meta.icon;

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={11} className="text-white/40" />
                        <span className="text-[10px] tracking-widest uppercase text-white/40">
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {categorySkills.map((skill) => (
                          <span
                            key={skill.name}
                            className="text-[10px] px-2 py-0.5 rounded-sm border border-white/10 bg-white/5 text-white/60 hover:text-white/80 hover:border-white/20 transition-colors"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {certifications.length > 0 && (
              <div className="p-6 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-5">
                  <GraduationCap size={14} className="text-[#ef4242]" />
                  <h2 className="font-nord text-base text-white tracking-wider">Certifications</h2>
                </div>
                <div className="space-y-4">
                  {certifications.map((certification) => (
                    <div key={certification.id} className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-white/80 group-hover:text-white transition-colors leading-snug mb-0.5">
                            {certification.name}
                          </div>
                          <div className="text-[11px] text-[#ef4242]">{certification.issuer}</div>
                          <div className="text-[10px] text-white/25 mt-0.5">
                            {certification.date.replace("-", "/")}
                          </div>
                        </div>
                        {certification.credentialUrl && (
                          <a
                            href={certification.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-white/20 hover:text-[#ef4242] transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {awards.length > 0 && (
              <div className="p-6 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-5">
                  <AwardIcon size={14} className="text-[#ef4242]" />
                  <h2 className="font-nord text-base text-white tracking-wider">Awards</h2>
                </div>
                <div className="space-y-4">
                  {awards.map((award) => (
                    <div key={award.id}>
                      <div className="text-xs text-white/80 leading-snug mb-0.5">{award.name}</div>
                      {award.issuer && (
                        <div className="text-[11px] text-[#ef4242]">{award.issuer}</div>
                      )}
                      {award.description && (
                        <div className="text-[11px] text-white/35 mt-1 leading-relaxed">
                          {award.description}
                        </div>
                      )}
                      <div className="text-[10px] text-white/25 mt-0.5">
                        {award.date.replace("-", "/")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {clubs.length > 0 && (
              <div className="p-6 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-5">
                  <Users size={14} className="text-[#ef4242]" />
                  <h2 className="font-nord text-base text-white tracking-wider">Organizations</h2>
                </div>
                <div className="space-y-4">
                  {clubs.map((club) => (
                    <div key={club.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-white/80 leading-snug">{club.name}</div>
                        {club.url && (
                          <a
                            href={club.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/20 hover:text-[#ef4242] transition-colors"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      {club.role && (
                        <div className="text-[11px] text-[#ef4242]">{club.role}</div>
                      )}
                      {club.description && (
                        <div className="text-[11px] text-white/35 mt-1 leading-relaxed">
                          {club.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
