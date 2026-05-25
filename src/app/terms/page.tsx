import Link from 'next/link'
import { PublicHeader } from '@/components/landing/public-header'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* In-page nav */}
        <nav className="flex gap-8 mb-16 border-b border-white/10 pb-6">
          <a href="#terms" className="text-gray-300 hover:text-[#00FFFF] transition-colors font-semibold text-sm">
            Terms & Conditions
          </a>
          <a href="#privacy" className="text-gray-300 hover:text-[#00FFFF] transition-colors font-semibold text-sm">
            Privacy Policy
          </a>
        </nav>

        {/* Terms & Conditions */}
        <section id="terms" className="mb-24 max-w-[700px] scroll-mt-24">
          <h2 className="font-[family-name:var(--font-teko)] text-5xl mb-2 text-[#00FFFF] uppercase tracking-wider">
            Terms & Conditions
          </h2>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed">
            Construction Market — Referral Network
          </p>

          <div className="space-y-10">
            <Section title="1. About these Terms">
              <p>These Terms & Conditions ("Terms") govern participation in the Construction Market Referral Network ("Referral Network"). They form an agreement between Construction Market ("Construction Market," "we," "us") and the contractor or contracting business that applies to and joins the Referral Network ("you," "the Contractor").</p>
              <p>By submitting an application to the Referral Network and indicating your acceptance, you agree to be bound by these Terms.</p>
              <p className="text-sm text-gray-500 italic">[CONFIRM: the contracting party must be named as the registered legal entity — e.g. "Construction Market Inc." once federal incorporation is complete. Until then, confirm the correct current legal name with counsel.]</p>
            </Section>

            <Section title="2. Definitions">
              <p><strong className="text-white">Referred Customer</strong> — a property owner, builder, business, or other party that Construction Market identifies and introduces to you through the Referral Network.</p>
              <p><strong className="text-white">Referred Job</strong> — any contract for construction work entered into between you and a Referred Customer.</p>
              <p><strong className="text-white">Contract Value</strong> — the total price payable by the Referred Customer to you for the Referred Job, including labour and materials, and excluding HST and other sales taxes.</p>
              <p><strong className="text-white">Commission</strong> — the fee payable to Construction Market under Section 5.</p>
            </Section>

            <Section title="3. The Referral Service">
              <p>Construction Market operates a referral service. We identify potential construction customers and introduce them to contractors in the Referral Network.</p>
              <p>There is no monthly fee to participate in the Referral Network. Construction Market is compensated only through Commission, as set out in Section 5.</p>
              <p>Construction Market does not guarantee any particular number of referrals, the quality or readiness of any Referred Customer, or that any referral will result in a contract or in any revenue to you.</p>
            </Section>

            <Section title="4. How a Referral Is Made and Recorded">
              <p>When Construction Market introduces a Referred Customer to you, we will notify you of the referral and record the date of introduction.</p>
              <p>A Referred Job is any construction contract you enter into with that Referred Customer.</p>
              <p><strong className="text-white">Pre-existing relationships.</strong> If, at the time of introduction, you were already in active discussions or had an existing business relationship with that customer, the customer is not a Referred Customer. You must tell Construction Market promptly and provide reasonable evidence of the prior relationship. If you do not raise this within 5 business days of the introduction, the customer will be treated as a Referred Customer.</p>
            </Section>

            <Section title="5. Commission">
              <p>For each Referred Job, you agree to pay Construction Market a Commission of 10% of the Contract Value.</p>
              <p><strong className="text-white">When Commission is payable.</strong> Commission becomes payable as and when you receive payment from the Referred Customer for a Referred Job. If the Referred Customer pays in installments or progress payments, Commission is payable on each payment as you receive it, in proportion to the amount received.</p>
              <p><strong className="text-white">Exclusivity.</strong> All business dealings with a Referred Customer must be conducted through Construction Market. You may not enter into any contract or arrangement with a Referred Customer directly or outside of the Referral Network. This obligation applies for as long as you remain in the Referral Network and continues after these Terms end.</p>
            </Section>

            <Section title="6. Your Obligations">
              <p>You agree to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>respond to referrals in good faith and within a reasonable time;</li>
                <li>deal with Referred Customers honestly and professionally;</li>
                <li>notify Construction Market when you enter into a Referred Job, and provide the Contract Value;</li>
                <li>notify Construction Market when you receive payment from a Referred Customer for a Referred Job;</li>
                <li>pay Commission when due, in accordance with Section 7;</li>
                <li>not avoid, reduce, or delay Commission by misreporting the Contract Value or payment, by delaying a contract, or by routing a Referred Job through another person or business.</li>
              </ul>
            </Section>

            <Section title="7. Payment Terms">
              <p>You agree to pay Commission within 7 days of receiving payment from a Referred Customer for a Referred Job.</p>
              <p className="text-sm text-gray-500 italic">[CONFIRM with counsel: whether to apply interest or a fee to late payments, and at what rate.]</p>
            </Section>

            <Section title="8. Construction Market's Role">
              <p>Construction Market provides referrals only. We are not a party to any contract between you and a Referred Customer.</p>
              <p>Construction Market does not supervise, direct, or take responsibility for your work, your pricing, the quality or safety of your work, or your dealings with any customer.</p>
              <p>You participate in the Referral Network as an independent business. Nothing in these Terms creates an employment, agency, partnership, or joint-venture relationship between you and Construction Market.</p>
            </Section>

            <Section title="9. Your Representations">
              <p>You confirm that you hold, and will maintain, the WSIB coverage, liability insurance, and the licences and registrations required to carry out your trade lawfully in your area of operation.</p>
            </Section>

            <Section title="10. Confidentiality">
              <p>Information that Construction Market provides to you about a Referred Customer is confidential. You may use it only to pursue the referral. You may not sell, share, or disclose it to any other party.</p>
            </Section>

            <Section title="11. Liability">
              <p>To the fullest extent permitted by law, Construction Market is not liable for any indirect, incidental, or consequential loss, or for any loss of profit or business, arising from your participation in the Referral Network.</p>
              <p>Construction Market's total liability under these Terms is limited to the total Commission you have paid to Construction Market in the 6 months before the event giving rise to the claim.</p>
              <p>You agree to indemnify Construction Market against any claim, loss, or cost arising from your work, your conduct, or your dealings with any customer.</p>
            </Section>

            <Section title="12. Electronic Communications (CASL)">
              <p>By joining the Referral Network, you consent to receive electronic communications from Construction Market, including referral notifications, account and service messages, and occasional updates and offers.</p>
              <p>You may withdraw your consent to marketing and promotional messages at any time by contacting <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:underline">build@constructionmarket.ca</a>. Account, referral, and transactional messages will continue while these Terms are in effect.</p>
            </Section>

            <Section title="13. Term and Termination">
              <p>These Terms take effect when you join the Referral Network and continue on a month-to-month basis.</p>
              <p>Either you or Construction Market may end this agreement at any time by giving 14 days' written notice.</p>
              <p>Termination does not affect Commission already owed: if a Referred Job was contracted before termination, Commission remains payable under Sections 5 and 7. Sections 5, 7, 10, 11, and this Section 13 survive termination.</p>
              <p className="text-sm text-gray-500 italic">[CONFIRM: 14-day notice period — adjust if you prefer 7 or 30 days.]</p>
              <p className="text-sm text-gray-500 italic">[CONFIRM: whether the exclusivity obligation in Section 5 survives termination. As currently written, it does — consider whether this should expire on termination or after a specified period.]</p>
            </Section>

            <Section title="14. Changes to These Terms">
              <p>Construction Market may update these Terms from time to time. We will notify you of material changes. Continuing to participate in the Referral Network after a change means you accept the updated Terms.</p>
            </Section>

            <Section title="15. Governing Law">
              <p>These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there. The parties will attempt to resolve any dispute in good faith before starting legal proceedings, which will be brought in the courts of Ontario.</p>
            </Section>

            <Section title="16. Contact">
              <p>Construction Market</p>
              <p>Email: <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:underline">build@constructionmarket.ca</a></p>
              <p>Phone: <a href="tel:4374503116" className="text-[#00FFFF] hover:underline">437-450-3116</a></p>
            </Section>
          </div>
        </section>

        {/* Privacy Policy */}
        <section id="privacy" className="mb-24 max-w-[700px] scroll-mt-24">
          <h2 className="font-[family-name:var(--font-teko)] text-5xl mb-10 text-[#00FFFF] uppercase tracking-wider">
            Privacy Policy
          </h2>

          <div className="space-y-10">
            <Section title="Overview">
              <p>Construction Market ("we," "us," "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you participate in the Construction Market Referral Network or otherwise interact with our services.</p>
            </Section>

            <Section title="Information We Collect">
              <p>We collect the following types of information:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong className="text-white">Business Information:</strong> Company name, business registration details, trade licences, and WSIB coverage information.</li>
                <li><strong className="text-white">Contact Information:</strong> Name, email address, phone number, and business address.</li>
                <li><strong className="text-white">Transaction Information:</strong> Details about referrals, contracts, payments, and commissions related to the Referral Network.</li>
                <li><strong className="text-white">Communications:</strong> Records of your communications with us, including emails and phone calls.</li>
              </ul>
            </Section>

            <Section title="How We Use Your Information">
              <p>We use your information to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Operate the Referral Network and provide referral services</li>
                <li>Process applications and verify qualifications</li>
                <li>Match you with potential customers and facilitate introductions</li>
                <li>Calculate, invoice, and collect commission payments</li>
                <li>Communicate with you about referrals, account matters, and service updates</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
              </ul>
            </Section>

            <Section title="Disclosure of Information">
              <p>We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong className="text-white">Referred Customers:</strong> When making a referral, we share your business name, contact information, and relevant trade credentials with the customer.</li>
                <li><strong className="text-white">Service Providers:</strong> Third-party vendors who help us operate our business, such as payment processors and communication platforms.</li>
                <li><strong className="text-white">Legal Compliance:</strong> When required by law, court order, or regulatory authority.</li>
              </ul>
            </Section>

            <Section title="Data Security">
              <p>We implement reasonable security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security.</p>
            </Section>

            <Section title="Your Rights">
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your information, subject to legal and contractual obligations</li>
                <li>Withdraw consent for marketing communications</li>
                <li>Lodge a complaint with the Privacy Commissioner of Canada</li>
              </ul>
            </Section>

            <Section title="Retention">
              <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements.</p>
            </Section>

            <Section title="Changes to This Policy">
              <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or through our website. Your continued use of our services after such changes constitutes acceptance of the updated policy.</p>
            </Section>

            <Section title="Contact Us">
              <p>If you have questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:</p>
              <p className="mt-3">Construction Market</p>
              <p>Email: <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:underline">build@constructionmarket.ca</a></p>
              <p>Phone: <a href="tel:4374503116" className="text-[#00FFFF] hover:underline">437-450-3116</a></p>
            </Section>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0A0A12]">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-4 text-gray-400 text-sm">
          <a href="mailto:build@constructionmarket.ca" className="hover:text-[#00FFFF] transition-colors">build@constructionmarket.ca</a>
          <span className="text-gray-600">·</span>
          <a href="tel:4374503116" className="hover:text-[#00FFFF] transition-colors">437-450-3116</a>
          <span className="text-gray-600">·</span>
          <Link href="/" className="hover:text-[#00FFFF] transition-colors">constructionmarket.ca</Link>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-teko)] text-3xl mb-3 text-white uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-4 text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  )
}
