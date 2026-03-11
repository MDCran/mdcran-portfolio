import { MetadataRoute } from "next";
import { getArticles, getClients, getProjects } from "@/lib/db";
import { projectUrl } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/work`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/resume`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.7 },
    // Category pages
    { url: `${BASE_URL}/arts-and-entertainment`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/arts-and-entertainment/minecraft-maps`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/arts-and-entertainment/events`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/motion-and-graphics`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/motion-and-graphics/thumbnail-design`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.78 },
    { url: `${BASE_URL}/motion-and-graphics/video-editing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.78 },
    { url: `${BASE_URL}/motion-and-graphics/web-dev-design`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.78 },
    { url: `${BASE_URL}/motion-and-graphics/graphic-design`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.78 },
    { url: `${BASE_URL}/code`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // Content pages
    { url: `${BASE_URL}/articles`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/publications`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.65 },
    { url: `${BASE_URL}/status`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    // Legal
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  let clients = [] as Awaited<ReturnType<typeof getClients>>;
  let projects = [] as Awaited<ReturnType<typeof getProjects>>;
  let articles = [] as Awaited<ReturnType<typeof getArticles>>;

  try {
    [clients, projects, articles] = await Promise.all([
      getClients(),
      getProjects(),
      getArticles(),
    ]);
  } catch (error) {
    console.error("Sitemap data fetch failed. Falling back to static routes only.", error);
    return staticRoutes;
  }

  const clientRoutes: MetadataRoute.Sitemap = clients.map((client) => ({
    url: `${BASE_URL}/clients/${client.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${BASE_URL}${projectUrl(project.category, project.slug, project.subcategory)}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.updatedDate ?? article.publishDate),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...clientRoutes, ...projectRoutes, ...articleRoutes];
}
