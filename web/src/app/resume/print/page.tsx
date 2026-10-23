import { formatResumeDate, resumeSections } from "@/lib/resume-data";
import Link from "next/link";
import {
  getResumeProfile,
  getExperiences,
  getEducations,
  getSkills,
  getCertifications,
  getAwards,
} from "@/lib/db";
import { buildSeoMetadata } from "@/lib/seo";
import SectionActions from "@/components/shared/SectionActions";
export const dynamic = "force-dynamic";
export const metadata = buildSeoMetadata({
  title: "Michael Cran — Printable Resume",
  description:
    "A plain-text-friendly resume with experience, education, skills, and credentials. Print or save as PDF.",
  path: "/resume/print",
});
export default async function PrintableResume() {
  const [profile, jobs, education, skills, certs, awards] = await Promise.all([
    getResumeProfile(),
    getExperiences(),
    getEducations(),
    getSkills(),
    getCertifications(),
    getAwards(),
  ]);
  const {
    jobs: sortedJobs,
    renownedProjects,
    derivedEducations,
    volunteerWork,
  } = resumeSections(jobs, education);
  return (
    <main className="ats-resume mx-auto max-w-3xl bg-white px-6 py-12 text-black sm:px-12">
      <div className="print:hidden mb-8 text-sm">
        <Link className="underline" href="/resume">
          Back to interactive resume
        </Link>
        <div className="[&_button]:text-black [&_span]:text-black">
          <SectionActions />
        </div>
        <p>
          Use your browser’s Print → Save as PDF. Text remains selectable, in
          reading order, without columns or graphics.
        </p>
        {profile.pdfUrl && (
          <a className="mt-2 inline-block underline" href={profile.pdfUrl}>
            Download existing resume PDF
          </a>
        )}
      </div>
      <h1 className="text-3xl font-bold">{profile.fullName}</h1>
      <p className="mt-1 text-lg">{profile.title}</p>
      <p className="mt-2">
        {profile.location} ·{" "}
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </p>
      <p className="mt-1 break-words">
        {profile.githubUrl} · {profile.linkedinUrl}
      </p>
      <section className="mt-7">
        <h2 className="border-b border-black pb-1 text-xl font-bold">
          Experience
        </h2>
        {[...sortedJobs, ...renownedProjects].map((j) => (
          <article key={j.id} className="mt-4">
            <h3 className="font-bold">
              {j.role} — {j.companyName}
            </h3>
            <p>
              {formatResumeDate(j.startDate)}
              {j.current
                ? " – Present"
                : j.endDate
                  ? ` – ${formatResumeDate(j.endDate)}`
                  : ""}
              {j.location ? ` · ${j.location}` : ""}
            </p>
            <p className="mt-2">{j.description}</p>
            {j.highlights?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {j.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
      <section className="mt-7">
        <h2 className="border-b border-black pb-1 text-xl font-bold">
          Education
        </h2>
        {derivedEducations.map((e) => (
          <article key={e.id} className="mt-3">
            <h3 className="font-bold">{e.institution}</h3>
            <p>
              {e.degree}
              {e.field ? ` in ${e.field}` : ""}
            </p>
            <p>
              {formatResumeDate(e.startDate)}
              {e.endDate
                ? ` – ${formatResumeDate(e.endDate)}`
                : e.current
                  ? " – Present"
                  : ""}
            </p>
          </article>
        ))}
      </section>
      {volunteerWork.length > 0 && (
        <section className="mt-7">
          <h2 className="border-b border-black pb-1 text-xl font-bold">
            Volunteer experience
          </h2>
          {volunteerWork.map((j) => (
            <article key={j.id} className="mt-3">
              <h3 className="font-bold">
                {j.role} — {j.companyName}
              </h3>
              <p>
                {formatResumeDate(j.startDate)}
                {j.current
                  ? " – Present"
                  : j.endDate
                    ? ` – ${formatResumeDate(j.endDate)}`
                    : ""}
              </p>
              <p>{j.description}</p>
            </article>
          ))}
        </section>
      )}
      <section className="mt-7">
        <h2 className="border-b border-black pb-1 text-xl font-bold">Skills</h2>
        <p className="mt-3">{skills.map((s) => s.name).join(" · ")}</p>
      </section>
      {certs.length > 0 && (
        <section className="mt-7">
          <h2 className="border-b border-black pb-1 text-xl font-bold">
            Certifications
          </h2>
          {certs.map((c) => (
            <p className="mt-2" key={c.id}>
              {c.name} — {c.issuer} · {formatResumeDate(c.date)}
              {c.credentialUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a className="underline" href={c.credentialUrl}>
                    Verify credential
                  </a>
                </>
              )}
            </p>
          ))}
        </section>
      )}
      {awards.length > 0 && (
        <section className="mt-7">
          <h2 className="border-b border-black pb-1 text-xl font-bold">
            Awards
          </h2>
          {awards.map((a) => (
            <p className="mt-2" key={a.id}>
              {a.name}
              {a.issuer ? ` — ${a.issuer}` : ""} · {formatResumeDate(a.date)}
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
