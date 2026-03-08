import type { MetadataRoute } from "next";
import {
  DEFAULT_SITE_ICON,
  DEFAULT_SOCIAL_DESCRIPTION,
  PERSON_NAME,
  SITE_URL,
} from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${PERSON_NAME} | MDCran`,
    short_name: "MDCran",
    description: DEFAULT_SOCIAL_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#ef4242",
    categories: ["portfolio", "software", "design", "developer"],
    icons: [
      {
        src: DEFAULT_SITE_ICON,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: `${SITE_URL}/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_RED.png`,
        sizes: "1000x1000",
        type: "image/png",
        label: "MDCran site identity graphic",
      },
    ],
  };
}
