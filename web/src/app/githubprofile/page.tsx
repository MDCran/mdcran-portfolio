import type { Metadata } from "next";
import GitHubProfilePage from "@/components/github/GitHubProfilePage";

export const metadata: Metadata = {
  title: "GitHub Profile",
  description: "A GitHub README-ready profile card for Michael Cran.",
};

export default function Page() {
  return <GitHubProfilePage />;
}
