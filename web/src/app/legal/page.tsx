import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";
import ClientPageTitle from "@/components/shared/ClientPageTitle";
import CookiePreferences from "@/components/shared/CookiePreferences";
import { getSiteContent } from "@/lib/db";
import { buildSeoMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildSeoMetadata({
    title: "Legal — Privacy, Cookies & Terms",
    description: "Privacy policy, cookie policy, AI disclosures, and terms of service for MDCran.",
    path: "/legal",
  });
}

export const dynamic = "force-dynamic";

const COOKIE_AI_SECTIONS: { heading: string; body: string; bullets?: string[] }[] = [
  {
    heading: "Cookies & Local Storage",
    body: "This site uses cookies and browser local/session storage to operate, remember your preferences, measure performance, and understand how the site is used. These include a strictly-necessary consent cookie, performance/analytics identifiers (a per-device visitor id and per-tab session id), and load-time measurements.",
    bullets: [
      "Consent cookie — records your cookie choice so we don't ask again.",
      "Analytics identifiers — a random visitor id (local storage) and session id (session storage) used to count visits, pages, time-on-page and scroll depth. No name or email is attached.",
      "Performance — page load timing stored to show your average load time and improve speed.",
    ],
  },
  {
    heading: "Analytics & Tracking",
    body: "We collect privacy-conscious analytics: page views, time on page, scroll depth, referring page, approximate location (country/region) derived from your IP address, device, browser and operating system, and aggregate click/scroll heatmaps stored as anonymous page-percentage coordinates. We also use Google Analytics. Your IP address is processed to derive location and is stored (hashed for analytics; retained briefly in raw form for abuse prevention and session management).",
    bullets: [
      "We do not sell your personal data.",
      "You can opt out of analytics on this page; opting out stops analytics recording for your device.",
      "Aggregate, de-identified metrics may be shown publicly (e.g. visitor counts).",
    ],
  },
  {
    heading: "AI Chat & Voice Assistant",
    body: "The site includes an AI assistant (text chat and an optional voice mode). Messages you send are processed by third-party AI providers (Anthropic Claude, and/or OpenAI/OpenRouter as fallback) to generate responses, and — in voice mode — your microphone audio is transcribed and replies are synthesized to speech using ElevenLabs. Audio is processed transiently to produce a transcript/voice and is not retained by us for advertising. Do not share sensitive personal information with the assistant. Voice mode only activates when you start it and uses your microphone solely while active.",
  },
  {
    heading: "IP Address & Location",
    body: "Your IP address is used to derive an approximate country/region (for analytics, the visitor map, and to lock displayed locale), for rate-limiting, and for security/abuse prevention including the ability to restrict access. We do not use it to identify you personally.",
  },
  {
    heading: "Caching, Search & Sitemaps",
    body: "We cache content for performance and publish a sitemap and machine-readable metadata so search engines and AI crawlers can index the site. Pages may be served from edge/CDN caches.",
  },
  {
    heading: "Legal Bases for Processing (GDPR)",
    body: "Where the EU/UK General Data Protection Regulation applies, we process personal data under the following legal bases:",
    bullets: [
      "Consent (Art. 6(1)(a)) — for non-essential analytics, heatmaps, and AI/voice features. You may withdraw consent at any time using the controls on this page; withdrawal does not affect prior lawful processing.",
      "Legitimate interests (Art. 6(1)(f)) — for security, abuse and fraud prevention, rate-limiting, and keeping the site reliable, balanced against your rights and freedoms.",
      "Contract / pre-contract steps (Art. 6(1)(b)) — when you submit a contact form or book a meeting so we can respond and arrange it.",
      "Legal obligation (Art. 6(1)(c)) — where we must retain or disclose data to comply with applicable law.",
    ],
  },
  {
    heading: "Your Privacy Rights (GDPR, UK GDPR & CCPA/CPRA)",
    body: "Depending on where you live, you have rights over your personal data. We honor verifiable requests from all visitors regardless of region:",
    bullets: [
      "Access — request a copy of the personal data we hold about you.",
      "Rectification — correct inaccurate or incomplete data.",
      "Erasure / Deletion — request deletion of your data ('right to be forgotten').",
      "Restriction & Objection — limit or object to certain processing, including profiling and direct marketing.",
      "Portability — receive your data in a portable, machine-readable format.",
      "Withdraw consent — opt out of analytics, AI, and cookies at any time on this page.",
      "Do Not Sell/Share (CCPA/CPRA) — we do not sell or share your personal information for cross-context behavioral advertising. California residents may still submit requests and will not be discriminated against for exercising them.",
      "Lodge a complaint — you may complain to your local supervisory authority (e.g. an EU Data Protection Authority or the UK ICO).",
    ],
  },
  {
    heading: "Third-Party Processors & International Transfers",
    body: "We share the minimum data necessary with vetted service providers that process it on our behalf, and only for the purposes described here. These may include hosting/CDN and edge delivery, MongoDB (data storage), Cloudflare R2 (media), Google Analytics, IP-geolocation, Anthropic/OpenAI/OpenRouter (AI chat), ElevenLabs (voice), Resend (email), and Twilio (SMS). Some providers are located in the United States; where data is transferred internationally we rely on appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms. We do not sell your personal data to anyone.",
  },
  {
    heading: "Data Retention",
    body: "We keep personal data only as long as necessary for the purposes above. Raw IP addresses used for abuse prevention/session management are retained briefly and then discarded or hashed; aggregate analytics are de-identified; contact and booking submissions are retained while relevant to our correspondence and then deleted on request or on a routine schedule. Backups are rotated and overwritten over time.",
  },
  {
    heading: "Children's Privacy",
    body: "This site is not directed to children under 13 (or the minimum age in your jurisdiction), and we do not knowingly collect their personal data. If you believe a child has provided us data, contact us and we will delete it.",
  },
  {
    heading: "Security",
    body: "We use reasonable technical and organizational measures to protect your data, including encryption in transit (HTTPS), access controls, and rate-limiting. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.",
  },
  {
    heading: "Exercising Your Rights & Contact",
    body: "To make a privacy request (access, deletion, correction, opt-out) or ask a question about this notice, email contact@mdcran.com with the subject 'Privacy Request'. We will verify your identity where required and respond within the timeframe set by applicable law (generally 30 days under GDPR, 45 days under CCPA). You can also opt out of analytics, AI, and cookies directly using the controls on this page. We may update this notice from time to time; material changes will be reflected by an updated 'last updated' date.",
  },
];

export default async function LegalPage() {
  const siteContent = await getSiteContent();
  const privacy = siteContent.privacyPage;
  const terms = siteContent.termsPage;

  return (
    <>
      <ClientPageTitle title="Legal" />
      <Navbar />
      <PageHeader
        eyebrow="Legal"
        title="Privacy, Cookies & Terms"
        description="How this site handles your data, cookies, AI features, and the terms of use."
        breadcrumbs={[{ label: "Legal" }]}
      />
      <main className="content-container py-14 sm:py-16">
        <div className="max-w-3xl space-y-12 text-sm text-white/60 leading-relaxed">
          <CookiePreferences />

          <section>
            <h2 className="font-nord text-xl text-white tracking-wider mb-6">Cookies, Tracking &amp; AI</h2>
            <div className="space-y-8">
              {COOKIE_AI_SECTIONS.map((s, i) => (
                <div key={i}>
                  <h3 className="font-nord text-base text-white/90 mb-2">{s.heading}</h3>
                  <p className="mb-2">{s.body}</p>
                  {s.bullets && (
                    <ul className="space-y-1.5 mt-2">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2"><span className="text-[#ef4242] mt-0.5">·</span>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-nord text-xl text-white tracking-wider mb-1">{privacy.title || "Privacy Policy"}</h2>
            {privacy.lastUpdated && <p className="text-[11px] text-white/30 mb-6">Last updated {privacy.lastUpdated}</p>}
            <div className="space-y-8">
              {privacy.sections.map((section, index) => (
                <div key={`p-${index}`}>
                  <h3 className="font-nord text-base text-white/90 mb-2">{section.heading}</h3>
                  <p>{section.body}</p>
                  {section.bullets && (
                    <ul className="space-y-1.5 mt-2">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2"><span className="text-[#ef4242] mt-0.5">·</span>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-nord text-xl text-white tracking-wider mb-1">{terms.title || "Terms of Service"}</h2>
            {terms.lastUpdated && <p className="text-[11px] text-white/30 mb-6">Last updated {terms.lastUpdated}</p>}
            <div className="space-y-8">
              {terms.sections.map((section, index) => (
                <div key={`t-${index}`}>
                  <h3 className="font-nord text-base text-white/90 mb-2">{section.heading}</h3>
                  <p>{section.body}</p>
                  {section.bullets && (
                    <ul className="space-y-1.5 mt-2">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2"><span className="text-[#ef4242] mt-0.5">·</span>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
