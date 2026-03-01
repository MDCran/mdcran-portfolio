import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PageHeader from "@/components/shared/PageHeader";

export const metadata: Metadata = {
  title: "Terms of Service — MDCran",
  description: "Terms of service for MDCran — guidelines for using this website and engaging our services.",
};

const lastUpdated = "March 1, 2026";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${lastUpdated}`}
        breadcrumbs={[{ label: "Terms of Service" }]}
      />
      <main className="content-container py-14 sm:py-16">
        <div className="max-w-3xl space-y-10 text-sm text-white/60 leading-relaxed">

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using mdcran.com (&quot;the Site&quot;), you accept and agree to be bound by
              these Terms of Service and our Privacy Policy. If you do not agree to these terms,
              please do not use the Site.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">2. Use of the Site</h2>
            <p className="mb-3">You agree to use the Site only for lawful purposes. You must not:</p>
            <ul className="space-y-2 pl-4">
              {[
                "Use the Site in any way that violates applicable local, national, or international laws.",
                "Reproduce, duplicate, copy, or re-sell any part of the Site without permission.",
                "Transmit any unsolicited promotional or advertising material.",
                "Attempt to gain unauthorized access to any part of the Site or its related systems.",
                "Use the Site to distribute malware or harmful code.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#ef4242] mt-1 text-xs shrink-0">◆</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">3. Intellectual Property</h2>
            <p>
              All content on this Site — including text, images, designs, code, and multimedia — is
              the intellectual property of Michael Cran (MDCran) unless otherwise stated. You may not
              reproduce, distribute, or create derivative works without express written permission.
              Client work is displayed with permission and remains the property of respective clients
              where applicable.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">4. Downloadable Content</h2>
            <p>
              Some content on this Site is available for free download. Free downloads are provided
              for personal, non-commercial use only unless otherwise specified. Commercial use, resale,
              or redistribution of downloaded content without written permission is prohibited.
              Purchased content is governed by the terms provided at the time of purchase.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">5. Services & Engagements</h2>
            <p>
              Inquiries submitted via the contact form constitute expressions of interest only and do
              not create a binding contract. All service engagements are governed by a separate written
              agreement between MDCran and the client. By submitting the contact form or subscribe form,
              you consent to MDCran using the contact details you provide to respond to your inquiry and,
              where you have expressly opted in, to send future updates, newsletters, announcements, or
              related communications. Scope, pricing, timelines, and deliverables are defined in
              individual contracts.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">6. Disclaimer of Warranties</h2>
            <p>
              The Site is provided &quot;as is&quot; without warranties of any kind, either express or implied.
              We do not warrant that the Site will be uninterrupted, error-free, or free of viruses
              or other harmful components. We reserve the right to modify, suspend, or discontinue
              the Site at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, MDCran shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of the
              Site or its content, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">8. External Links</h2>
            <p>
              This Site may contain links to third-party websites. These links are provided for
              convenience only. MDCran has no control over the content of those sites and accepts
              no responsibility for them or for any loss or damage that may arise from your use of them.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">9. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms of Service at any time. Changes will be
              posted on this page with an updated date. Your continued use of the Site after any
              changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Florida, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="font-nord text-lg text-white tracking-wider mb-4">11. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
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
