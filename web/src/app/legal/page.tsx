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
    heading: "Agreement to Terms by Using This Site",
    body: "By accessing or using this site — including simply browsing pages, following a shared link, or interacting with any feature — you confirm that you have read, understood, and agree to be bound by these disclosures, the Privacy Policy, and the Terms of Service set out below. Visiting this site is your choice; by choosing to visit, you consent to the collection of public session data as described herein. If you do not agree, please discontinue use of the site.",
    bullets: [
      "All tracking, tethering, and session data collected by this site constitutes public-session data — information your browser transmits as a standard part of web browsing. No collection on this site exceeds what your browser voluntarily exposes to any web server.",
      "Any and all tracked information — including device fingerprints, visit history, session metadata, interaction patterns, and identity associations — may be retained by this site indefinitely for purposes including but not limited to: site integrity, fraud prevention, abuse detection, personalisation, analytics, AI context, and general learning about how this site is used.",
      "You may opt out of optional analytics and personalisation cookies by selecting 'Essential Only' on the cookie banner. This choice is yours to make at any time; however, continued use of this site following any choice constitutes acceptance of essential data collection regardless of cookie preference.",
      "Essential cookies (consent preference, session management, and security) are required for the site to function and are set regardless of analytics preference. They cannot be disabled while using this site.",
    ],
  },
  {
    heading: "Cookies & Local Storage",
    body: "This site uses cookies and browser local/session storage to operate, remember your preferences, measure performance, and understand how the site is used.",
    bullets: [
      "Consent cookie (strictly necessary) — records your cookie choice so we do not ask again. Set for 1 year. Cannot be disabled.",
      "Analytics identifiers — a random visitor ID (local storage, persisted) and session ID (session storage, per-tab) used to count visits, pages, time-on-page, and scroll depth. No name or email is attached unless you have set one in the accessibility panel.",
      "Authentication cookie — a short-lived JWT set only for the admin area. Not used for tracking visitors.",
      "Performance — page load timing stored anonymously to measure and improve site speed.",
      "Translation cache — your selected language preference stored locally to remember your choice.",
    ],
  },
  {
    heading: "Analytics & Behavioural Tracking",
    body: "We operate a first-party analytics system that collects session and engagement data directly on this site. Data collected includes: page URL, page title, time on page, maximum scroll depth (0–100 %), referring URL, approximate geographic location (country / region) derived from your IP address, device type (desktop / tablet / mobile), browser name and version, and operating system. We additionally collect click and scroll heatmap data — stored as normalised page-percentage X/Y co-ordinates with no personal identifiers attached. We also use Google Analytics (GA4). Your IP address is processed to derive location and is stored in hashed form for analytics; a raw form may be retained briefly for abuse prevention and is then discarded.",
    bullets: [
      "We do not sell your personal data.",
      "You can opt out of optional analytics on this page at any time; opting out stops analytics recording for your device.",
      "Aggregate, de-identified metrics (e.g. total visitor counts, country breakdown) may be displayed publicly on this site.",
      "Recruiter-intent events (e.g. viewing the résumé, clicking a GitHub link) are logged as custom named events to help the site owner understand professional interest.",
    ],
  },
  {
    heading: "AI Chat & Voice Assistant",
    body: "The site includes an AI assistant (text chat and an optional voice mode powered by Michael's synthesised voice). Messages you send are processed by third-party AI providers — Anthropic Claude as the primary provider, with OpenAI / OpenRouter as automated fallbacks — to generate responses. In voice mode, your microphone audio is transcribed and replies are synthesised to speech using ElevenLabs. Audio is processed transiently and is not retained by us for advertising. The AI assistant may, through natural conversation, ask for or infer your name and — if confirmed via the identity system — associate it with your device fingerprint (see 'Device Recognition & Personal Identity' below).",
    bullets: [
      "Do not share sensitive personal information (passwords, financial data, government IDs) with the assistant.",
      "Voice mode activates only when you explicitly start it and uses your microphone solely while active.",
      "AI response content is generated by a language model and may be imperfect; verify any professional or legal information independently.",
      "Chat interactions are rate-limited per IP address to prevent abuse; rate-limit records are retained for the duration of the window.",
    ],
  },
  {
    heading: "IP Address & Location",
    body: "Your IP address is collected on every request to the server. It is used to: derive approximate country/region for analytics and the visitor map; enforce per-IP rate limits on AI chat and API endpoints; detect and block abusive or malicious traffic; and associate a session with a geographic location. Your IP is hashed for long-term analytics storage. The site owner can view approximate (not precise) IP addresses via private authenticated access for security and session management purposes. We do not use your IP to identify you personally or share it with advertisers.",
  },
  {
    heading: "Device Recognition, Tracking Links & Personal Identity",
    body: "To offer a personalised experience, this site can recognise your device across visits using a deterministic device fingerprint — a hash derived from browser characteristics your device exposes (user-agent string, language, screen dimensions and colour depth, timezone, GPU renderer identifier, and a canvas-rendering signature). This fingerprint is stable across page loads and can recognise a returning device even after cookies or browser cache are cleared. We do NOT and CANNOT read your MAC address or access hardware identifiers outside the browser sandbox. Additionally, the site owner may distribute personalised tracking links (e.g. containing ?uid=, ?name=, or ?utm_source= parameters). If you follow such a link, the identity encoded in it is captured and stored in your browser (localStorage and a long-lasting cookie) so that you may be recognised on future visits — even from a clean, untagged URL. By following a personalised link and continuing to use the site, you consent to this session tethering. This data is stored in a private database accessible only to the site owner.",
    bullets: [
      "A name is only stored if you voluntarily enter it in the Accessibility panel ('Personal Identity' section), if the AI assistant extracts it from conversation and you confirm it, or if it is encoded in a personalised tracking link you followed.",
      "Your fingerprint, approximate IP, browser/OS details, and chosen name are stored together as an 'identity record' in our private database, accessible only to the site owner via private authenticated access.",
      "Only your self-chosen display name may be suggested to other visitors connecting from the same network IP as a 'who are you?' convenience; no other personal data is exposed to other visitors.",
      "The site owner may view, rename, merge, or delete identity records at any time. You can detach your device at any time using 'Not me' in the Accessibility panel, which removes the association.",
      "The site owner receives real-time notifications (via a private Discord server) when an identity record is created or updated, including how it was created (by you, by the admin, or by the AI). These notifications are private and not shared with third parties.",
      "Legal basis: your consent, given when you enter your name. You may withdraw by using 'Not me' or by contacting us.",
    ],
  },
  {
    heading: "Contact Form, Booking & Newsletter Data",
    body: "When you submit the contact form, book a meeting, subscribe to the newsletter, or unsubscribe, we collect the information you provide (name, email, phone, message, and consent record). This data is stored in our private database and used to respond to your inquiry, fulfil the booking, or manage your subscription.",
    bullets: [
      "Contact form submissions are associated with your session data (IP address, browser, country, and optionally a UTM source, HTTP referrer, and device fingerprint) to help the site owner understand visitor context.",
      "Booking records include your name, email, phone, the selected meeting time, duration, and any notes you provide.",
      "The site owner receives a real-time private Discord notification for each contact form submission, booking, and newsletter action. These notifications contain the submitted data (name, email, phone, message) and session metadata. They are sent only to the site owner's private Discord server.",
      "By submitting a contact form or booking, you consent to us using your contact details to respond. By subscribing, you consent to receive occasional updates; you can unsubscribe at any time.",
    ],
  },
  {
    heading: "CRM & Real-Time Notifications",
    body: "This site is operated with a private CRM system accessible only to the site owner via authenticated private access. The system aggregates visitor sessions, contact submissions, bookings, newsletter subscribers, and identity records. Certain site events automatically trigger real-time notifications to a private Discord server controlled by the site owner. These events include:",
    bullets: [
      "Contact form submissions — including submitted name, email, phone, message, and associated session metadata.",
      "Meeting bookings — including attendee details, selected time slot, and any associated identity record.",
      "Newsletter subscription or unsubscription — including contact channel (email or phone) and source page.",
      "Identity record creation or update — including name, origin (admin-created, user-entered, or AI-extracted), and device count.",
      "Weekly automated analytics digest — a summary of visitor counts, top pages, and country breakdown sent every Sunday.",
      "These notifications are sent exclusively to the site owner's private Discord server and are never shared with third parties.",
    ],
  },
  {
    heading: "Legal Bases for Processing (GDPR)",
    body: "Where the EU/UK General Data Protection Regulation applies, we process personal data under the following legal bases:",
    bullets: [
      "Consent (Art. 6(1)(a)) — for non-essential analytics, heatmaps, device fingerprinting / personal identity, and AI/voice features. You may withdraw consent at any time using the controls on this page; withdrawal does not affect prior lawful processing.",
      "Legitimate interests (Art. 6(1)(f)) — for security, abuse and fraud prevention, rate-limiting, admin CRM management, and keeping the site reliable, balanced against your rights and freedoms.",
      "Contract / pre-contract steps (Art. 6(1)(b)) — when you submit a contact form or book a meeting so we can respond and arrange it.",
      "Legal obligation (Art. 6(1)(c)) — where we must retain or disclose data to comply with applicable law.",
    ],
  },
  {
    heading: "Your Privacy Rights (GDPR, UK GDPR & CCPA/CPRA)",
    body: "Depending on where you live, you have rights over your personal data. We honour verifiable requests from all visitors regardless of region:",
    bullets: [
      "Access — request a copy of the personal data we hold about you.",
      "Rectification — correct inaccurate or incomplete data.",
      "Erasure / Deletion — request deletion of your data ('right to be forgotten').",
      "Restriction & Objection — limit or object to certain processing, including profiling and direct marketing.",
      "Portability — receive your data in a portable, machine-readable format.",
      "Withdraw consent — opt out of analytics, AI, and cookies at any time using the controls on this page.",
      "Do Not Sell/Share (CCPA/CPRA) — we do not sell or share your personal information for cross-context behavioural advertising. California residents may submit requests and will not be discriminated against for exercising them.",
      "Lodge a complaint — you may complain to your local supervisory authority (e.g. an EU Data Protection Authority or the UK ICO).",
    ],
  },
  {
    heading: "Third-Party Processors & International Transfers",
    body: "We share the minimum data necessary with vetted service providers that process it on our behalf, and only for the purposes described here. These providers include: Vercel (hosting / CDN), MongoDB Atlas (database), Cloudflare R2 (media storage), Google Analytics (GA4), IP geolocation service, Anthropic (AI chat), OpenAI / OpenRouter (AI fallback), ElevenLabs (voice synthesis and transcription), Resend (transactional email), Twilio (SMS), and Discord (private admin notifications). Some providers are located in the United States; where data is transferred internationally we rely on appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms. We do not sell your personal data to anyone.",
  },
  {
    heading: "Data Retention",
    body: "We keep personal data only as long as necessary for the purposes above. Raw IP addresses used for abuse prevention / session management are retained briefly and then hashed or discarded. Analytics session and heatmap data accumulates over time and may be cleared periodically by the site owner. Contact form and booking submissions are retained while relevant to the correspondence and deleted on request or on a routine schedule. Identity records persist until you detach your device ('Not me') or request deletion. Backups are rotated and overwritten over time.",
  },
  {
    heading: "Children's Privacy",
    body: "This site is not directed to children under 13 (or the minimum applicable age in your jurisdiction), and we do not knowingly collect their personal data. If you believe a child has provided us data, contact us and we will delete it promptly.",
  },
  {
    heading: "Security",
    body: "We use reasonable technical and organisational measures to protect your data, including encryption in transit (HTTPS/TLS), hashed storage of sensitive identifiers, two-factor authentication for owner access, access controls, and rate-limiting. No method of transmission or storage is 100 % secure, and we cannot guarantee absolute security.",
  },
  {
    heading: "Exercising Your Rights & Contact",
    body: "To make a privacy request (access, deletion, correction, opt-out) or ask a question about this notice, email contact@mdcran.com with the subject 'Privacy Request'. We will verify your identity where required and respond within the timeframe set by applicable law (generally 30 days under GDPR, 45 days under CCPA). You can also opt out of analytics, AI, and cookies directly using the controls on this page. We may update this notice from time to time; material changes will be reflected by an updated 'last updated' date above.",
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
