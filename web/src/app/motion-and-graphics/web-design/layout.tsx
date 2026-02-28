import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Dev & Design",
  description: "Modern, premium web experiences for creators, companies and brands.",
  openGraph: {
    title: "Web Dev & Design | MDCran",
    description: "Modern, premium web experiences for creators, companies and brands.",
  },
};

export default function WebDesignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
