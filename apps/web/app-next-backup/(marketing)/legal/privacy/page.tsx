import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Lunchtable TCG",
  description:
    "Privacy Policy for Lunchtable TCG - Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 pt-24 max-w-4xl">
        <div className="tcg-panel rounded-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold gold-text mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Lunchtable Games (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your
                privacy and is committed to protecting your personal data. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use
                Lunchtable TCG (&quot;the Service&quot;). This policy complies with applicable data
                protection laws including GDPR, CCPA, and other relevant regulations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
                2.1 Information You Provide
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Account Information:</strong> Username, email address, password (hashed)
                </li>
                <li>
                  <strong>Profile Information:</strong> Display name, avatar, bio
                </li>
                <li>
                  <strong>Payment Information:</strong> Processed securely through third-party
                  payment processors
                </li>
                <li>
                  <strong>Communications:</strong> Messages, support requests, feedback
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">
                2.2 Information Collected Automatically
              </h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Device Information:</strong> Device type, operating system, browser type
                </li>
                <li>
                  <strong>Usage Data:</strong> Game statistics, play patterns, feature usage
                </li>
                <li>
                  <strong>Log Data:</strong> IP address, access times, pages viewed
                </li>
                <li>
                  <strong>Cookies and Tracking:</strong> Session cookies, analytics cookies (with
                  consent)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                3. Legal Basis for Processing (GDPR)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We process your personal data based on the following legal grounds:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Contract:</strong> To provide and maintain the Service
                </li>
                <li>
                  <strong>Consent:</strong> For marketing communications and optional features
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> To improve our Service, prevent fraud,
                  ensure security
                </li>
                <li>
                  <strong>Legal Obligation:</strong> To comply with applicable laws and regulations
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                4. How We Use Your Information
              </h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>To provide, maintain, and improve the Service</li>
                <li>To process transactions and send related information</li>
                <li>To send administrative messages and updates</li>
                <li>To respond to your comments, questions, and support requests</li>
                <li>To personalize your experience and provide tailored content</li>
                <li>To monitor and analyze trends, usage, and activities</li>
                <li>To detect, investigate, and prevent fraudulent transactions and abuse</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                5. Information Sharing and Disclosure
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell your personal information. We may share your information in the
                following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Service Providers:</strong> Third parties who perform services on our
                  behalf
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law or to protect rights
                </li>
                <li>
                  <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                  sale
                </li>
                <li>
                  <strong>With Your Consent:</strong> When you authorize us to share information
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data only for as long as necessary to fulfill the purposes
                outlined in this Privacy Policy, unless a longer retention period is required or
                permitted by law. When you delete your account, we will delete or anonymize your
                personal data within 30 days, except where we are required to retain certain
                information for legal or legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                7. Your Rights and Choices
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you may have the following rights regarding your
                personal data:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Access:</strong> Request a copy of your personal data
                </li>
                <li>
                  <strong>Rectification:</strong> Request correction of inaccurate data
                </li>
                <li>
                  <strong>Erasure:</strong> Request deletion of your personal data (&quot;right to
                  be forgotten&quot;)
                </li>
                <li>
                  <strong>Restriction:</strong> Request restriction of processing
                </li>
                <li>
                  <strong>Portability:</strong> Request transfer of your data in a portable format
                </li>
                <li>
                  <strong>Objection:</strong> Object to processing based on legitimate interests
                </li>
                <li>
                  <strong>Withdraw Consent:</strong> Withdraw consent at any time
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, please contact us at privacy@lunchtablegames.com.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                8. California Privacy Rights (CCPA/CPRA)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                California residents have additional rights under the California Consumer Privacy
                Act (CCPA) and California Privacy Rights Act (CPRA):
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Right to know what personal information is collected</li>
                <li>Right to know whether personal information is sold or disclosed</li>
                <li>Right to say no to the sale of personal information</li>
                <li>Right to equal service and price (non-discrimination)</li>
                <li>Right to correct inaccurate personal information</li>
                <li>Right to limit use of sensitive personal information</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not sell personal information as defined under CCPA/CPRA.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                9. International Data Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your
                own. We ensure appropriate safeguards are in place for such transfers, including
                Standard Contractual Clauses approved by relevant authorities, adequacy decisions,
                or other valid transfer mechanisms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect
                your personal data against unauthorized access, alteration, disclosure, or
                destruction. These measures include encryption, secure servers, access controls, and
                regular security assessments. However, no method of transmission over the Internet
                is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                11. Children&apos;s Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is not intended for children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If we learn that we have
                collected personal information from a child under 13, we will take steps to delete
                such information promptly. If you are a parent or guardian and believe your child
                has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                12. Cookies and Tracking Technologies
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use cookies and similar tracking technologies to collect and track information.
                You can control cookies through your browser settings and other tools. Types of
                cookies we use:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Essential Cookies:</strong> Required for the Service to function
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Help us understand how users interact with the
                  Service
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings and preferences
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">13. Third-Party Links</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service may contain links to third-party websites or services. We are not
                responsible for the privacy practices of these third parties. We encourage you to
                read the privacy policies of any third-party sites you visit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                14. Changes to This Privacy Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by posting the new Privacy Policy on this page and updating the
                &quot;Last Updated&quot; date. We encourage you to review this Privacy Policy
                periodically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">15. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or our data practices, or if you
                wish to exercise your privacy rights, please contact us at:
              </p>
              <div className="text-muted-foreground space-y-1">
                <p>
                  <strong>Email:</strong>{" "}
                  <span className="text-primary">privacy@lunchtablegames.com</span>
                </p>
                <p>
                  <strong>Data Protection Officer:</strong>{" "}
                  <span className="text-primary">dpo@lunchtablegames.com</span>
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">
                If you are in the EU/EEA, you also have the right to lodge a complaint with your
                local supervisory authority.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
