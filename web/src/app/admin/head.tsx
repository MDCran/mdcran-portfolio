import { SeoHead } from "@/lib/seo";

export default function Head() {
  return (
    <SeoHead
      title="Admin"
      description="Restricted administrative access for MDCran."
      path="/admin"
      noIndex
    />
  );
}
