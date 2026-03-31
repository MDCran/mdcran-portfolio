"use client";

import Link from "next/link";
import ExperienceCard from "@/components/resume/ExperienceCard";
import PageHeader from "@/components/shared/PageHeader";
import type { Experience, Education, Skill, Certification, Award, ClubMembership, Client } from "@/lib/types";
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
  Github,
  Linkedin,
  Mail,
  Star,
  Sparkles,
} from "lucide-react";


const skillCategoryMeta: Record<string, { label: string; icon: typeof Code2 }> = {
  technology: { label: "Technology", icon: Code2 },
  creative: { label: "Creative", icon: Palette },
  language: { label: "Languages", icon: Globe },
  ai: { label: "AI", icon: Sparkles },
  other: { label: "Other", icon: Users },
};

function humanizeCategory(category: string) {
  return category.replace(/[-_]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

const MONTH_ABBRS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

function formatMonthYear(date?: string) {
  if (!date) return "";

  // MM-YYYY
  const mmYyyy = date.match(/^(\d{2})-(\d{4})$/);
  if (mmYyyy) return `${MONTH_ABBRS[parseInt(mmYyyy[1], 10) - 1] ?? mmYyyy[1]} ${mmYyyy[2]}`;

  // YYYY-MM or YYYY-MM-DD — parse month/year directly to avoid timezone shift
  const yyyyMm = date.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (yyyyMm) return `${MONTH_ABBRS[parseInt(yyyyMm[2], 10) - 1] ?? yyyyMm[2]} ${yyyyMm[1]}`;

  return date;
}

interface ResumeContentProps {
  header: { eyebrow: string; title: string; description: string };
  jobs: Experience[];
  renownedProjects: Experience[];
  derivedEducations: (Education & { highlights?: string[] })[];
  volunteerWork: Experience[];
  skills: Skill[];
  skillCategories: string[];
  certifications: Certification[];
  awards: Award[];
  clubs: ClubMembership[];
  clientsById: Map<string, Client>;
}

export default function ResumeContent({
  header,
  jobs,
  renownedProjects,
  derivedEducations,
  volunteerWork,
  skills,
  skillCategories,
  certifications,
  awards,
  clubs,
  clientsById,
}: ResumeContentProps) {

  return (
    <>
      <PageHeader
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        breadcrumbs={[{ label: "Resume" }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative group">
              <a
                href="https://www.linkedin.com/in/mdcran/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open LinkedIn profile"
                className="flex items-center justify-center h-9 w-9 border border-white/15 text-white/60 rounded-sm hover:border-[rgba(239,66,66,0.4)] hover:text-white transition-colors"
              >
                <Linkedin size={13} />
              </a>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="rounded px-2.5 py-1 text-[10px] text-white/80 whitespace-nowrap" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
                  LinkedIn
                </div>
              </div>
            </div>
            <div className="relative group">
              <a
                href="https://github.com/mdcran"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open GitHub profile"
                className="flex items-center justify-center h-9 w-9 border border-white/15 text-white/60 rounded-sm hover:border-[rgba(239,66,66,0.4)] hover:text-white transition-colors"
              >
                <Github size={13} />
              </a>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="rounded px-2.5 py-1 text-[10px] text-white/80 whitespace-nowrap" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
                  GitHub
                </div>
              </div>
            </div>
            <a
              href="/Michael_Cran_Resume.pdf"
              download
              className="flex items-center gap-2 h-9 px-4 text-xs tracking-widest uppercase bg-[#ef4242] text-white rounded-sm hover:bg-[#dd3030] transition-colors shadow-[0_0_20px_rgba(239,66,66,0.3)]"
            >
              Download PDF
            </a>
            <a
              href="mailto:mdcranberry@gmail.com"
              className="flex items-center gap-2 h-9 px-4 text-xs tracking-widest uppercase border border-white/15 text-white/60 rounded-sm hover:border-[rgba(239,66,66,0.4)] hover:text-white transition-colors"
            >
              <Mail size={13} />
              Contact Me
            </a>
          </div>
        }
      />

      <main className="content-container py-14 md:py-16">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-2 space-y-14 pt-0">
            {/* Work Experience - always shown */}
            <section id="experience" data-highlight-id="experience">
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

            {/* Renowned Projects - always shown */}
            {renownedProjects.length > 0 && (
              <section id="renowned-projects" data-highlight-id="renowned-projects">
                <div className="flex items-center justify-between mb-9">
                  <div className="flex items-center gap-3">
                    <Star size={16} className="text-[#ef4242]" />
                    <h2 className="font-nord text-xl text-white tracking-wider">Renowned Projects</h2>
                  </div>
                  <Link
                    href="/#featured"
                    className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-white/30 hover:text-[#ef4242] transition-colors"
                  >
                    View Featured Work
                    <ExternalLink size={10} />
                  </Link>
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

            {/* Education - always shown */}
            {derivedEducations.length > 0 && (
              <section id="education" data-highlight-id="education">
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

            {/* Volunteer */}
            {volunteerWork.length > 0 && (
              <section id="volunteer" data-highlight-id="volunteer">
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
            {/* Skills - always shown */}
            <div id="skills" data-highlight-id="skills" className="p-6 rounded-sm border border-white/7 bg-white/2">
              <div className="flex items-center gap-2 mb-4">
                <Code2 size={14} className="text-[#ef4242]" />
                <h2 className="font-nord text-base text-white tracking-wider">Skills</h2>
              </div>
              <div className="space-y-4">
                {skillCategories.map((category) => {
                  const categorySkills = skills.filter((s) => s.category === category);
                  if (!categorySkills.length) return null;
                  const normalized = category.toLowerCase();
                  const meta = skillCategoryMeta[normalized] ?? { label: humanizeCategory(category), icon: Users };
                  const Icon = meta.icon;
                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={11} className="text-white/40" />
                        <span className="text-[10px] tracking-widest uppercase text-white/40">{meta.label}</span>
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

            {/* Certifications - always shown */}
            {certifications.length > 0 && (
              <div id="certifications" data-highlight-id="certifications" className="p-6 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-5">
                  <GraduationCap size={14} className="text-[#ef4242]" />
                  <h2 className="font-nord text-base text-white tracking-wider">Certifications</h2>
                </div>
                <div className="space-y-4">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-white/80 group-hover:text-white transition-colors leading-snug mb-0.5">
                            {cert.name}
                          </div>
                          <div className="text-[11px] text-[#ef4242]">{cert.issuer}</div>
                          <div className="text-[10px] text-white/25 mt-0.5">{formatMonthYear(cert.date)}</div>
                        </div>
                        {cert.credentialUrl && (
                          <a
                            href={cert.credentialUrl}
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

            {/* Awards - always shown */}
            {awards.length > 0 && (
              <div id="awards" data-highlight-id="awards" className="p-6 rounded-sm border border-white/7 bg-white/2">
                <div className="flex items-center gap-2 mb-5">
                  <AwardIcon size={14} className="text-[#ef4242]" />
                  <h2 className="font-nord text-base text-white tracking-wider">Awards</h2>
                </div>
                <div className="space-y-4">
                  {awards.map((award) => (
                    <div key={award.id}>
                      <div className="text-xs text-white/80 leading-snug mb-0.5">{award.name}</div>
                      {award.issuer && <div className="text-[11px] text-[#ef4242]">{award.issuer}</div>}
                      {award.description && (
                        <div className="text-[11px] text-white/35 mt-1 leading-relaxed">{award.description}</div>
                      )}
                      <div className="text-[10px] text-white/25 mt-0.5">{formatMonthYear(award.date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizations */}
            {clubs.length > 0 && (
              <div id="organizations" data-highlight-id="organizations" className="p-6 rounded-sm border border-white/7 bg-white/2">
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
                          <a href={club.url} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-[#ef4242] transition-colors">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                      {club.role && <div className="text-[11px] text-[#ef4242]">{club.role}</div>}
                      {club.description && (
                        <div className="text-[11px] text-white/35 mt-1 leading-relaxed">{club.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
