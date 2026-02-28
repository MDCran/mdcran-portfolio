import { SeoHead } from "@/lib/seo";

export default function Head() {
  return (
    <SeoHead
      title="Admin Dashboard"
      description="Restricted administrative dashboard for MDCran."
      path="/admin/dashboard"
      noIndex
    />
  );
}
