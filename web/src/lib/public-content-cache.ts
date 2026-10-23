import { unstable_cache } from "next/cache";
import * as data from "@/lib/db";

// Only public route reads import this module. Admin editing always reads the database directly.
// The public project cache fixes the visibility boundary and never accepts includeHidden.
const cachedProjects = unstable_cache(() => data.getProjects({ refreshVideoViews: false }), ["public-projects-v1"], { tags:["public-content"], revalidate:300 });
export async function getProjects() { return cachedProjects(); }
export const getArticles = unstable_cache(() => data.getArticles(), ["public-articles-v1"], { tags:["public-content"], revalidate:300 });
export const getClients = unstable_cache(() => data.getClients(), ["public-clients-v1"], { tags:["public-content"], revalidate:300 });
export const getExperiences = unstable_cache(() => data.getExperiences(), ["public-experiences-v1"], { tags:["public-content"], revalidate:300 });
export const getEducations = unstable_cache(() => data.getEducations(), ["public-education-v1"], { tags:["public-content"], revalidate:300 });
export const getSkills = unstable_cache(() => data.getSkills(), ["public-skills-v1"], { tags:["public-content"], revalidate:300 });
export const getSkillCategories = unstable_cache(() => data.getSkillCategories(), ["public-skill-categories-v1"], { tags:["public-content"], revalidate:300 });
export const getCertifications = unstable_cache(() => data.getCertifications(), ["public-certifications-v1"], { tags:["public-content"], revalidate:300 });
export const getAwards = unstable_cache(() => data.getAwards(), ["public-awards-v1"], { tags:["public-content"], revalidate:300 });
export const getClubs = unstable_cache(() => data.getClubs(), ["public-clubs-v1"], { tags:["public-content"], revalidate:300 });
export const getResumeProfile = unstable_cache(() => data.getResumeProfile(), ["public-resume-v1"], { tags:["public-content"], revalidate:300 });
export { getSiteContent } from "@/lib/db";
