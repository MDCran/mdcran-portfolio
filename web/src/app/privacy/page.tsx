import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy — MDCran",
  description: "Privacy policy for MDCran — how we collect, use, and protect your information.",
};

const lastUpdated = "February 27, 2026";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Last updated ${lastUpdated}`}
        breadcrumbs={[{ label: "Privacy Policy" }]}
      />
      <main className="content-container py-14 sm:py-16">
        <div className="max-w-3xl space-y-10 text-sm text-white/60 leading-relaxed">

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">1. Information We Collect</h2>
            <p className="mb-3">
              When you interact with MDCran (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), we may collect the following
              types of information:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                "Contact information (name, email address, phone number) when you submit the contact form or subscribe to updates.",
                "Usage data such as pages visited, time spent on pages, browser type, and device type via analytics tools.",
                "Communication data including messages you send via the contact form.",
                "Technical data including IP address, browser type, and operating system.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">2. How We Use Your Information</h2>
            <ul className="space-y-2 pl-4">
              {[
                "To respond to your inquiries and fulfill project requests.",
                "To send service-related communications, updates, and notifications you've opted into.",
                "To improve the website experience and understand how visitors interact with our content.",
                "To comply with legal obligations.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">3. Cookies & Tracking</h2>
            <p>
              This website may use cookies and similar tracking technologies to analyze traffic and improve
              user experience. You can control cookie preferences through your browser settings. We do not
              sell tracking data to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">4. Third-Party Services</h2>
            <p className="mb-3">
              We use third-party services that may collect information under their own privacy policies,
              including:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                "YouTube (embedded videos) — governed by Google's Privacy Policy.",
                "Spotify (music widget) — governed by Spotify's Privacy Policy.",
                "Twilio (SMS notifications) — governed by Twilio's Privacy Policy.",
                "Vercel (hosting) — governed by Vercel's Privacy Policy.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">5. Data Retention</h2>
            <p>
              We retain personal information only as long as necessary to fulfill the purposes for which
              it was collected, or as required by law. Contact form submissions are retained for up to
              12 months. You may request deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Access the personal data we hold about you.",
                "Request correction of inaccurate data.",
                "Request deletion of your data.",
                "Opt out of marketing communications at any time via the unsubscribe link.",
                "Lodge a complaint with a data protection authority if applicable.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">7. Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect your information
              against unauthorized access, alteration, disclosure, or destruction. However, no method
              of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">8. Children&apos;s Privacy</h2>
            <p>
              This website is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If you believe we have inadvertently collected such
              information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">9. Contact</h2>
            <p>
              For any privacy-related questions or requests, contact us at{" "}
              <a href="mailto:contact@mdcran.com" className="text-[#ef4242] hover:underline">
                contact@mdcran.com
              </a>
              .
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
