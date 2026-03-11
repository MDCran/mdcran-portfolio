import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // AI crawlers — allow full access to public content
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
      {
        userAgent: "cohere-ai",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: "https://mdcran.com/sitemap.xml",
    host: "https://mdcran.com",
  };
}
