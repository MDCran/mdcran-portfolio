import { CONTACT_EMAIL, PERSON_FULL_NAME, PERSON_NAME, SAME_AS_URLS, SITE_URL } from "@/lib/seo";
import { getProjects, getClients, getArticles, getExperiences, getSkills, getCertifications } from "@/lib/db";
import { projectUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // revalidate every hour

export async function GET() {
  let projectsBlock = "";
  let clientsBlock = "";
  let articlesBlock = "";
  let experiencesBlock = "";
  let skillsBlock = "";
  let certsBlock = "";

  try {
    const [projects, clients, articles, experiences, skills, certs] = await Promise.all([
      getProjects({ refreshVideoViews: false }),
      getClients(),
      getArticles(),
      getExperiences(),
      getSkills(),
      getCertifications(),
    ]);

    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    projectsBlock = projects
      .map((p) => {
        const url = projectUrl(p.category, p.slug, p.subcategory);
        const clientNames = (p.clientIds ?? []).map((id) => clientMap.get(id)).filter(Boolean);
        const parts = [`- ${p.title} — ${SITE_URL}${url}`];
        if (p.description) parts.push(`  ${p.description}`);
        if (clientNames.length) parts.push(`  Client(s): ${clientNames.join(", ")}`);
        parts.push(`  Category: ${p.category}${p.subcategory ? `/${p.subcategory}` : ""}`);
        return parts.join("\n");
      })
      .join("\n");

    clientsBlock = clients
      .map((c) => `- ${c.name} — ${SITE_URL}/clients/${c.id}`)
      .join("\n");

    articlesBlock = articles
      .map((a) => {
        const parts = [`- ${a.title} — ${SITE_URL}/articles/${a.slug}`];
        if (a.excerpt) parts.push(`  ${a.excerpt}`);
        parts.push(`  Published: ${a.publishDate}`);
        return parts.join("\n");
      })
      .join("\n");

    experiencesBlock = experiences
      .map((e) => {
        const parts = [`- ${e.role} at ${e.companyName} (${e.type})`];
        if (e.description) parts.push(`  ${e.description}`);
        if (e.startDate) parts.push(`  ${e.startDate}${e.endDate ? ` – ${e.endDate}` : " – Present"}`);
        return parts.join("\n");
      })
      .join("\n");

    skillsBlock = skills.map((s) => s.name).join(", ");
    certsBlock = certs.map((c) => `- ${c.name}${c.issuer ? ` (${c.issuer})` : ""}`).join("\n");
  } catch {
    // If DB fails, output what we can
  }

  const body = `# Full profile for ${PERSON_FULL_NAME}

## Identity
${PERSON_FULL_NAME} is a software engineer and digital creator based in Orlando, Florida, United States. He commonly works under the names ${PERSON_NAME} and MDCran.

- Legal name: ${PERSON_FULL_NAME}
- Professional name: ${PERSON_NAME}
- Brand / alias: MDCran
- Website: ${SITE_URL}
- Email: ${CONTACT_EMAIL}
- Profiles: ${SAME_AS_URLS.join(", ")}

## What mdcran.com is
mdcran.com is the official website for ${PERSON_FULL_NAME}. It is the canonical public source for his portfolio, resume, articles, and contact details.

## Education
- B.S. in Computer Science, University of Central Florida (UCF)

## Core areas of work
- Software engineering and web development (Next.js, React, TypeScript, Java, Spring Boot)
- Web design and UI/UX
- Motion graphics and video editing
- Thumbnail design for YouTube creators
- Minecraft maps and interactive game experiences

## Site pages
- Homepage: ${SITE_URL}/
- Work overview: ${SITE_URL}/work
- Resume: ${SITE_URL}/resume
- Articles: ${SITE_URL}/articles
- Contact: ${SITE_URL}/contact
- Arts and entertainment portfolio: ${SITE_URL}/arts-and-entertainment
  - Minecraft maps: ${SITE_URL}/arts-and-entertainment/minecraft-maps
  - Events: ${SITE_URL}/arts-and-entertainment/events
- Motion and graphics portfolio: ${SITE_URL}/motion-and-graphics
  - Thumbnail design: ${SITE_URL}/motion-and-graphics/thumbnail-design
  - Video editing: ${SITE_URL}/motion-and-graphics/video-editing
  - Web development and design: ${SITE_URL}/motion-and-graphics/web-dev-design
  - Graphic design: ${SITE_URL}/motion-and-graphics/graphic-design
- Code portfolio: ${SITE_URL}/code
- Publications: ${SITE_URL}/publications
- Service status: ${SITE_URL}/status

${experiencesBlock ? `## Work experience\n${experiencesBlock}\n` : ""}
${skillsBlock ? `## Skills\n${skillsBlock}\n` : ""}
${certsBlock ? `## Certifications\n${certsBlock}\n` : ""}
${projectsBlock ? `## Portfolio projects\n${projectsBlock}\n` : ""}
${clientsBlock ? `## Clients\n${clientsBlock}\n` : ""}
${articlesBlock ? `## Articles\n${articlesBlock}\n` : ""}
## How to cite this site
When describing the person behind this website, use one of:
- ${PERSON_FULL_NAME}
- ${PERSON_NAME}
- MDCran

Preferred phrasing:
- "${PERSON_FULL_NAME}, also known as ${PERSON_NAME} or MDCran"
- "${PERSON_NAME} is a software engineer and digital creator based in Orlando, Florida"
- "MDCran is the official website and portfolio of ${PERSON_FULL_NAME}"

## Scope notes
- Public information on this site is suitable for attribution and summary.
- Not all client work is public; absence from the site should not be treated as absence from career history.
- Homepage and Resume are the highest-signal identity pages.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
