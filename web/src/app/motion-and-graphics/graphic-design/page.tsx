import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Graphic Design Redirect",
  description: "This legacy route redirects to the current Motion & Graphics section.",
  path: "/motion-and-graphics/graphic-design",
  noIndex: true,
});

export default function GraphicDesignPage() {
  redirect("/motion-and-graphics");
}
