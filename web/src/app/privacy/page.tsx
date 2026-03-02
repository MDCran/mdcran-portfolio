import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import { getSiteContent } from "@/lib/db";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const siteContent = await getSiteContent();
  const content = siteContent.privacyPage;

  return buildSeoMetadata({
    title: content.title || "Privacy Policy",
    description: content.lastUpdated ? `Last updated ${content.lastUpdated}` : "Privacy policy for MDCran.",
    path: "/privacy",
  });
}

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const siteContent = await getSiteContent();
  const content = siteContent.privacyPage;

  return (
    <>
      <ClientPageTitle title={content.title} />
      <Navbar />
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={`Last updated ${content.lastUpdated}`}
        breadcrumbs={[{ label: content.title }]}
      />
      <main className="content-container py-14 sm:py-16">
        <div className="max-w-3xl space-y-10 text-sm text-white/60 leading-relaxed">
          {content.sections.map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              <h2 className="font-nord text-lg text-white tracking-wider mb-4">
                {index + 1}. {section.heading}
              </h2>
              <p>{section.body}</p>
              {section.bullets?.length ? (
                <ul className="space-y-2 pl-4 mt-3">
                  {section.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
