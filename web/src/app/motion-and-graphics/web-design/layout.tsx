import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Dev & Design",
  description: "Custom websites designed and developed for gaming content creators, community organizations, and creative brands.",
  openGraph: {
    title: "Web Dev & Design | MDCran",
    description: "Custom websites designed and developed for gaming content creators, community organizations, and creative brands.",
  },
};

export default function WebDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
