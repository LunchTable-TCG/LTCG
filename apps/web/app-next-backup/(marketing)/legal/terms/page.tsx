import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Lunchtable TCG",
  description:
    "Terms of Service for Lunchtable TCG - Read our terms and conditions for using our trading card game platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 pt-24 max-w-4xl">
        <div className="tcg-panel rounded-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold gold-text mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last Updated: January 2026</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Lunchtable TCG (&quot;the Service&quot;), you agree to be
                bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these
                Terms, you may not access or use the Service. These Terms constitute a legally
                binding agreement between you and Lunchtable Games (&quot;we,&quot; &quot;us,&quot;
                or &quot;our&quot;).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You must be at least 13 years of age to use the Service. If you are under 18, you
                must have parental or guardian consent to use the Service. By using the Service, you
                represent and warrant that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>You meet the minimum age requirement</li>
                <li>You have the legal capacity to enter into these Terms</li>
                <li>You are not prohibited from using the Service under applicable law</li>
                <li>If under 18, you have obtained parental/guardian consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">3. Account Registration</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To access certain features of the Service, you must create an account. When creating
                an account, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                4. Virtual Items and In-Game Currency
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Service may include virtual items, cards, currency, or other digital content
                (&quot;Virtual Items&quot;). You acknowledge that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Virtual Items have no real-world monetary value</li>
                <li>Virtual Items cannot be exchanged for real currency or physical goods</li>
                <li>We grant you a limited, non-transferable license to use Virtual Items</li>
                <li>Virtual Items may be modified, removed, or reset at our discretion</li>
                <li>
                  Purchases of Virtual Items are final and non-refundable, except as required by law
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">5. User Conduct</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to engage in any of the following prohibited activities:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Cheating, exploiting bugs, or using unauthorized third-party software</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Impersonating any person or entity</li>
                <li>Sharing accounts or selling/trading accounts</li>
                <li>Attempting to gain unauthorized access to the Service</li>
                <li>Using the Service for any illegal purpose</li>
                <li>Interfering with the proper functioning of the Service</li>
                <li>Engaging in any activity that violates these Terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content, features, and functionality of the Service, including but not limited
                to text, graphics, logos, icons, images, audio clips, digital downloads, data
                compilations, and software, are the exclusive property of Lunchtable Games or its
                licensors and are protected by international copyright, trademark, patent, trade
                secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">7. User-Generated Content</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you submit, upload, or share any content through the Service (&quot;User
                Content&quot;), you grant us a worldwide, non-exclusive, royalty-free, perpetual,
                irrevocable license to use, reproduce, modify, adapt, publish, translate,
                distribute, and display such User Content. You represent that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>You own or have rights to the User Content</li>
                <li>User Content does not infringe any third-party rights</li>
                <li>User Content complies with these Terms and applicable laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account and access to the Service
                at any time, with or without cause, and with or without notice. Upon termination,
                your right to use the Service will immediately cease, and any Virtual Items
                associated with your account may be forfeited.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                9. Disclaimer of Warranties
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                NON-INFRINGEMENT, OR COURSE OF PERFORMANCE. WE DO NOT WARRANT THAT THE SERVICE WILL
                BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                10. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, LUNCHTABLE GAMES SHALL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
                PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA,
                USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">11. Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Any dispute arising from these Terms or your use of the Service shall be resolved
                through binding arbitration in accordance with applicable arbitration rules. You
                agree to waive any right to a jury trial or to participate in a class action
                lawsuit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">12. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the
                jurisdiction in which Lunchtable Games is incorporated, without regard to its
                conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">13. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of any
                material changes by posting the updated Terms on the Service and updating the
                &quot;Last Updated&quot; date. Your continued use of the Service after such changes
                constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="text-primary mt-2">legal@lunchtablegames.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
