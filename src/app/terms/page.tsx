import Link from 'next/link'
import { PublicHeader } from '@/components/landing/public-header'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* In-page nav */}
        <nav className="flex gap-8 mb-16 border-b border-white/10 pb-6 flex-wrap">
          <a href="#terms" className="text-gray-300 hover:text-[#00FFFF] transition-colors font-semibold text-sm">
            Terms of Use
          </a>
          <a href="#privacy" className="text-gray-300 hover:text-[#00FFFF] transition-colors font-semibold text-sm">
            Privacy Policy
          </a>
          <a href="#service-agreement" className="text-gray-300 hover:text-[#00FFFF] transition-colors font-semibold text-sm">
            Service Agreement
          </a>
        </nav>

        {/* Terms of Use */}
        <section id="terms" className="mb-24 max-w-[700px] scroll-mt-24">
          <h2 className="font-[family-name:var(--font-teko)] text-5xl mb-2 text-[#00FFFF] uppercase tracking-wider">
            Terms of Use
          </h2>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed">Effective June 1, 2026</p>

          <div className="space-y-10">
            <Section title="Welcome">
              <p>Welcome to Construction Market. These Terms of Use ("Terms") explain the rules for using our website at constructionmarket.ca and its subdomains (the "Site"). The Site is operated by Construction Market ("Construction Market", "we", "us", "our"), a business based in Toronto, Ontario, Canada.</p>
              <p>By using the Site you agree to these Terms. If you join our network as a contractor, referrer, or other customer, additional terms in your Service Agreement and the applicable Service Schedule will also apply. Your use of the Site is also governed by our Privacy Policy.</p>
            </Section>

            <Section title="1. Using the Site">
              <p>You are welcome to use the Site to learn about our services, get in touch with us, apply to join the network, and — if you are a registered customer — manage your account. We just ask that you use it lawfully and respectfully.</p>
            </Section>

            <Section title="2. Things to Avoid">
              <p>To keep the Site working well for everyone, please do not:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>copy, scrape, or harvest information from the Site for use outside of your normal interaction with us;</li>
                <li>try to reverse engineer or interfere with how the Site works;</li>
                <li>introduce viruses or malicious code;</li>
                <li>try to access accounts or data that aren't yours;</li>
                <li>use the Site to send spam or any messages that don't comply with applicable anti-spam laws;</li>
                <li>impersonate anyone, or misrepresent who you are or who you work for;</li>
                <li>use information from the Site to build a competing product or service.</li>
              </ul>
            </Section>

            <Section title="3. Our Content">
              <p>The Site, including its text, design, logos, and arrangement of content, belongs to Construction Market (or to others who have licensed it to us). You may view and use the Site as we've described above, but otherwise the content remains ours. The "Construction Market" name and logo are our trademarks. Please don't use them without our written permission.</p>
            </Section>

            <Section title="4. Information You Submit">
              <p>If you submit information through a form or other interactive feature on the Site, please make sure it's accurate and that you have the right to share it. You give us permission to use that information for the purposes of providing our services, as described in our Privacy Policy.</p>
            </Section>

            <Section title="5. Links to Other Sites">
              <p>Our Site may include links to third-party websites or services. We don't control them and we're not responsible for their content or practices. A link isn't an endorsement.</p>
            </Section>

            <Section title="6. No Guarantees">
              <p>We do our best to keep the Site available and accurate, but we provide it on an "as is" basis. We can't promise that the Site will always be available or error-free. Nothing on the Site is intended as legal, financial, tax, or professional advice.</p>
            </Section>

            <Section title="7. Limitation of Liability">
              <p>To the extent permitted by law, we won't be responsible for indirect or consequential losses arising from your use of the Site. Our total responsibility for any claim related to your use of the Site is limited to CAD $100. This limit doesn't apply where the law doesn't allow such limits.</p>
            </Section>

            <Section title="8. Changes">
              <p>We may update these Terms from time to time. When we do, we'll update the date at the top. By continuing to use the Site after changes, you're accepting the updated Terms.</p>
            </Section>

            <Section title="9. Governing Law">
              <p>These Terms are governed by the laws of Ontario and the federal laws of Canada that apply there. Any dispute will be heard in the courts of Ontario.</p>
            </Section>

            <Section title="10. Contact">
              <p>Construction Market</p>
              <p>Email: <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:underline">build@constructionmarket.ca</a></p>
              <p>Phone: <a href="tel:4374503116" className="text-[#00FFFF] hover:underline">437-450-3116</a></p>
            </Section>
          </div>
        </section>

        {/* Privacy Policy */}
        <section id="privacy" className="mb-24 max-w-[700px] scroll-mt-24">
          <h2 className="font-[family-name:var(--font-teko)] text-5xl mb-2 text-[#00FFFF] uppercase tracking-wider">
            Privacy Policy
          </h2>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed">Effective June 1, 2026</p>

          <div className="space-y-10">
            <Section title="Overview">
              <p>Construction Market ("we", "us", "our") respects your privacy. This Privacy Policy explains what personal information we collect, how we use it, who we share it with, how we protect it, and the choices you have. It applies to people who visit our website, register for our services, and individuals whose information we collect in connection with our operations.</p>
              <p>This Policy is intended to comply with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). If you have a privacy concern, you may contact us or, if needed, the Office of the Privacy Commissioner of Canada.</p>
              <p><strong className="text-white">Privacy Contact:</strong> <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:underline">build@constructionmarket.ca</a> · <a href="tel:4374503116" className="text-[#00FFFF] hover:underline">437-450-3116</a></p>
            </Section>

            <Section title="Information We Collect">
              <p><strong className="text-white">From visitors to our website:</strong> When you visit the Site, we collect basic technical information such as your IP address, browser type, device information, the pages you view, and how you reached us. If you submit a contact form or inquiry, we collect the information you provide.</p>
              <p><strong className="text-white">From applicants and registered customers:</strong> When you apply to join our network or register as a customer, we collect:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Business details: your business name, registration details, address, trade and service area;</li>
                <li>Contact details: name, title, email, phone number;</li>
                <li>Compliance information: WSIB clearance, insurance details, trade licences and registrations;</li>
                <li>Payment information, which is processed through our payment provider;</li>
                <li>Records of our communications with you;</li>
                <li>Records of the agreements you have accepted, including the version, date, and basic technical details of acceptance.</li>
              </ul>
              <p><strong className="text-white">From our operations:</strong> In the course of running our construction intelligence platform, we collect information about construction sites and the businesses and people working at or associated with them. This includes business names and contact details, names and titles of personnel, photographs of sites, audio notes, and information from public sources such as municipal records and corporate registries.</p>
              <p><strong className="text-white">From automated tools:</strong> We use automated tools and technology to support our operations. Meaningful decisions about your information are reviewed by people, not made solely by automated tools.</p>
            </Section>

            <Section title="How We Use Information">
              <p>We use the information we collect to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>provide and improve our services;</li>
                <li>process applications and verify credentials;</li>
                <li>introduce contractors to potential customers and manage referrals;</li>
                <li>calculate, invoice, and collect fees and commissions;</li>
                <li>communicate with you about your account, referrals, payments, and updates;</li>
                <li>send marketing communications, where you have given consent and have not withdrawn it;</li>
                <li>meet our legal, tax, and regulatory obligations;</li>
                <li>protect against fraud or misuse.</li>
              </ul>
            </Section>

            <Section title="How We Share Information">
              <p>We do not sell your personal information. We may share it with:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong className="text-white">Other parties in our network</strong> when sharing is needed to provide the service;</li>
                <li><strong className="text-white">Service providers</strong> who help us run our business, including payment processing, cloud hosting, email and communications, and technology tools;</li>
                <li><strong className="text-white">Professional advisors</strong>, including accountants and lawyers;</li>
                <li><strong className="text-white">Authorities</strong>, where required by law or to protect our legal rights;</li>
                <li><strong className="text-white">A successor business</strong>, in connection with any merger, financing, or sale, subject to appropriate protections.</li>
              </ul>
            </Section>

            <Section title="Where Your Information Is Processed">
              <p>Some of our service providers store and process information outside of Canada, including in the United States. When information is processed outside Canada, it may be subject to the laws of those countries. We choose reputable providers and take reasonable steps to ensure your information is protected.</p>
            </Section>

            <Section title="How Long We Keep It">
              <ul className="list-disc ml-6 space-y-2">
                <li>Customer account records: while you are with us, and up to seven (7) years after;</li>
                <li>Marketing consent and unsubscribe records: at least three (3) years from your last interaction;</li>
                <li>Communication records: at least three (3) years;</li>
                <li>Website analytics and log data: typically up to twelve (12) months.</li>
              </ul>
            </Section>

            <Section title="Security">
              <p>We use reasonable steps to protect your information from loss, misuse, and unauthorized access. These include access controls, encryption when information is in transit, secured cloud infrastructure, and staff training. No system is perfectly secure, so we can't promise absolute security — but we do take protection seriously.</p>
            </Section>

            <Section title="Your Choices and Rights">
              <p>You have the right to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>ask what personal information we hold about you;</li>
                <li>ask us to correct information that is inaccurate;</li>
                <li>ask us to delete your personal information, subject to records we're legally required to keep;</li>
                <li>withdraw consent to marketing emails at any time;</li>
                <li>make a complaint to us, or to the Office of the Privacy Commissioner of Canada.</li>
              </ul>
            </Section>

            <Section title="Cookies">
              <p>Our website uses cookies and similar technologies to help the Site work properly, remember your preferences, and understand how visitors use the Site. You can manage cookies in your browser settings; some Site features may not work properly if cookies are disabled.</p>
            </Section>

            <Section title="Changes to this Policy">
              <p>We may update this Privacy Policy from time to time. When we do, we will update the Effective Date at the top. For material changes, we'll let you know through the Site or by email.</p>
            </Section>

            <Section title="Contact Us">
              <p>Construction Market</p>
              <p>Email: <a href="mailto:build@constructionmarket.ca" className="text-[#00FFFF] hover:underline">build@constructionmarket.ca</a></p>
              <p>Phone: <a href="tel:4374503116" className="text-[#00FFFF] hover:underline">437-450-3116</a></p>
            </Section>
          </div>
        </section>

        {/* Service Agreement */}
        <section id="service-agreement" className="mb-24 max-w-[700px] scroll-mt-24">
          <h2 className="font-[family-name:var(--font-teko)] text-5xl mb-2 text-[#00FFFF] uppercase tracking-wider">
            Service Agreement
          </h2>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed">Effective June 1, 2026</p>

          <div className="space-y-10">
            <Section title="Welcome">
              <p>Welcome to Construction Market. This Service Agreement (the "Agreement") is between Construction Market ("Construction Market", "we", "us", "our"), a business operating in Toronto, Ontario, Canada, and you, the business identified in your registration ("Customer", "you", "your"). This Agreement begins on the date you accept it as part of registration (the "Effective Date") and continues until ended in line with Section 5.</p>
            </Section>

            <Section title="1. How this Agreement is Structured">
              <p>This Agreement sets out the terms that apply to all the services you buy from us. The details of each individual service — such as the Referral Network or Direct Outreach — are set out in a separate Service Schedule, which forms part of this Agreement. If anything in a Service Schedule differs from this Agreement, the Service Schedule controls for that service.</p>
            </Section>

            <Section title="2. Definitions">
              <p><strong className="text-white">"Confidential Information"</strong> means non-public information shared between us, in any form, that is marked as confidential or that a reasonable person would understand to be confidential.</p>
              <p><strong className="text-white">"Customer Data"</strong> means information you submit, or that we collect on your behalf in providing the Services.</p>
              <p><strong className="text-white">"Fees"</strong> means the amounts you pay under this Agreement and the Service Schedules.</p>
              <p><strong className="text-white">"Services"</strong> means the services we provide to you under the Service Schedules you have selected.</p>
              <p><strong className="text-white">"Service Schedule"</strong> means a document describing a specific service, which forms part of this Agreement.</p>
            </Section>

            <Section title="3. The Services">
              <p>We will provide the Services described in the Service Schedules you have selected. You can add Services any time by accepting an additional Service Schedule. We may improve, modify, or retire features of the Services from time to time, and we'll give reasonable notice for material changes that affect you.</p>
            </Section>

            <Section title="4. Fees, Taxes, and Payment">
              <p>Our Fees are set out in the applicable Service Schedule. All Fees are in Canadian dollars and don't include HST or other applicable taxes, which we'll add to your invoice where applicable. Fees are paid through our payment provider (currently Stripe), unless we've agreed another method in writing.</p>
              <p>If a payment is late, interest accrues at 1.5% per month (19.56% per year) from the due date until paid, or the maximum rate permitted by law if lower.</p>
            </Section>

            <Section title="5. Length of the Agreement and Ending It">
              <p>This Agreement starts on the Effective Date and continues until either of us ends it. Either of us can end this Agreement, or any Service Schedule, for any reason with thirty (30) days' written notice.</p>
              <p>Either of us can end this Agreement right away with written notice if the other side significantly breaks this Agreement and doesn't fix it within fifteen (15) business days of being asked to, or if the other side becomes insolvent, files for bankruptcy, or stops doing business.</p>
              <p>When this Agreement ends, your access to the Services stops, any Fees and Commissions you already owe remain payable, and the parts of this Agreement that should naturally continue (such as confidentiality, intellectual property, liability, and indemnity) continue.</p>
            </Section>

            <Section title="6. Your Responsibilities">
              <p>By using our Services, you confirm that you have the authority to enter into and follow through on this Agreement, the information you give us is accurate and complete, you hold and will maintain all required WSIB coverage, liability insurance, and trade licences, and you follow applicable laws and regulations in carrying out your work.</p>
            </Section>

            <Section title="7. Our Responsibilities">
              <p>We'll provide the Services with reasonable care and skill and in line with applicable laws. We don't guarantee specific outcomes such as a particular number of referrals, results of marketing activities, or revenue — these depend on many factors outside our control.</p>
            </Section>

            <Section title="8. Confidentiality">
              <p>Each of us will treat the other's Confidential Information with care: using it only for the purposes of this Agreement, protecting it at least as carefully as our own confidential information, and only sharing it with people who need it and are bound by confidentiality. These confidentiality commitments continue for three (3) years after this Agreement ends, and indefinitely for trade secrets.</p>
            </Section>

            <Section title="9. Intellectual Property">
              <p>Each of us keeps what we already own. We own the Services, the platform, and related intellectual property, including improvements we make. You give us permission to use Customer Data and materials you provide so we can deliver the Services.</p>
            </Section>

            <Section title="10. Limitation of Liability">
              <p>To the extent permitted by law, neither of us will be responsible for indirect, incidental, consequential, special, or punitive damages, or for lost profits, revenue, business, goodwill, or data arising from this Agreement. Our total responsibility under this Agreement is limited to the greater of (a) the Fees you paid us in the six (6) months before the event giving rise to the claim, or (b) CAD $1,000.</p>
            </Section>

            <Section title="11. Indemnification">
              <p>You agree to defend and protect us against any third-party claim arising from your work, your conduct, or your dealings with your customers, your breach of this Agreement or applicable law, or any misrepresentation you make to us.</p>
            </Section>

            <Section title="12. Insurance">
              <p>You'll keep, at your own expense, commercial general liability insurance with a minimum of CAD $2,000,000 per occurrence, and WSIB coverage where required by law.</p>
            </Section>

            <Section title="13. General">
              <p>This Agreement, together with the applicable Service Schedules and our Privacy Policy, is the full agreement between us on its subject matter. This Agreement may be accepted electronically, and electronic acceptance has the same effect as a signed agreement.</p>
            </Section>

            <Section title="14. Governing Law">
              <p>This Agreement is governed by the laws of Ontario and the federal laws of Canada that apply there. We'll try in good faith to resolve any dispute by talking. If it can't be resolved within thirty (30) days, either of us can take it to the courts of Ontario.</p>
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
