import type { Metadata } from "next";
import PersonalPresentation from "./PersonalPresentation";
import { cookies } from "next/headers";
import { SLIDES_COOKIE, verifySlidesSession } from "@/lib/slides-access";
import SlidePinGate from "./SlidePinGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "A little about me · Michael Cran" },
  description: "A private presentation prepared for The Anywhere Company.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://www.mdcran.com/slides/theanywherecompany" },
  openGraph: {
    title: "A little about me · Michael Cran",
    description: "A private presentation prepared for The Anywhere Company.",
    url: "https://www.mdcran.com/slides/theanywherecompany",
    images: [],
  },
};

export default async function AnywhereCompanySlides() {
  const token = (await cookies()).get(SLIDES_COOKIE)?.value;
  return verifySlidesSession(token) ? <PersonalPresentation /> : <SlidePinGate />;
}
