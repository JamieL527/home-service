import Link from 'next/link'
import { PublicHeader } from '@/components/landing/public-header'

export default function ScheduleBPage() {
  return (
    <div className="min-h-screen bg-[#05050A] text-white font-medium">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-8">
          <Link href="/terms#service-agreement" className="text-sm text-gray-400 hover:text-[#00FFFF] transition-colors">
            ← Service Agreement
          </Link>
        </div>

        <section className="max-w-[700px]">
          <h1 className="font-[family-name:var(--font-teko)] text-5xl mb-2 text-[#00FFFF] uppercase tracking-wider">
            Schedule B — Direct Outreach & QC Retainer
          </h1>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed">Effective June 1, 2026</p>
          <p className="text-gray-400 mb-10 text-sm">This Service Schedule B ("Schedule B") is part of and governed by the Construction Market Service Agreement (the "Master Agreement"). Terms defined in the Master Agreement have the same meaning here. This Schedule applies only if you subscribe to Direct Outreach.</p>

          <div className="space-y-10">
            <Section title="1. The Direct Outreach Service">
              <p>Direct Outreach is a managed lead-generation and outreach service. Under this Schedule, we will:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>generate construction leads relevant to your trade and service area;</li>
                <li>conduct telemarketing on your behalf using your authorized identity (see Section 3);</li>
                <li>coordinate and attend site meetings as your representative;</li>
                <li>support the agreement and onboarding process with builders;</li>
                <li>support payment coordination through our platform;</li>
                <li>carry out post-job quality control inspections.</li>
              </ul>
            </Section>

            <Section title="2. Fees and Commission">
              <p>Direct Outreach is offered for a retainer of <strong className="text-white">$2,000 per month</strong>, billed monthly in advance, plus a Commission of <strong className="text-white">five percent (5%)</strong> of the Contract Value of each Closed Job sourced through Direct Outreach.</p>
              <p>The full Commission for each Closed Job becomes payable as a single payment once you receive your first payment from the customer for that job. You'll pay the full Commission to us within seven (7) days of receiving your first payment from the customer.</p>
              <p>If your first payment from the customer is in cash, please log the receipt in the Construction Market platform within five (5) business days, including the amount, the date, and the customer.</p>
              <p>If the Contract Value changes materially after Commission has been paid (for example, due to scope changes or change orders), please let us know within five (5) business days of the change, and any difference will be reconciled within fourteen (14) days — either way.</p>
              <p>Verification, working-through-the-network commitments, and other commercial mechanics work the same way as in Schedule A (Referral Network).</p>
            </Section>

            <Section title="3. Multi-Tenant Identity Authorization">
              <p>To run Direct Outreach on your behalf, we need permission to act in your name in a defined way:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>You authorize us to display your authorized telephone number(s) as outbound caller ID for calls made in connection with this Schedule.</li>
                <li>You authorize us to send commercial electronic messages from your authorized email domain in connection with this Schedule.</li>
                <li>You authorize us to publish DNS records (SPF, DKIM, DMARC) for the authorized domain so emails can be properly authenticated. We'll provide the records; please add them within seven (7) days.</li>
              </ul>
              <p>You can revoke any of these authorizations at any time on twenty-four (24) hours' written notice. Revocation ends Direct Outreach.</p>
            </Section>

            <Section title="4. Your Confirmations">
              <p>By subscribing to Direct Outreach, you confirm that:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>you have full authority over the authorized phone number(s) and email domain;</li>
                <li>any contact lists you give us contain only recipients with whom you have a pre-existing business relationship under Canada's anti-spam legislation (CASL), or who have given express consent;</li>
                <li>you are registered for the National Do Not Call List if your outbound calling activity requires it;</li>
                <li>you are not subject to any unresolved complaint, order, or investigation under CASL, CRTC rules, or the National Do Not Call List that would affect this service;</li>
                <li>your representations to your own customers comply with applicable laws.</li>
              </ul>
            </Section>

            <Section title="5. Anti-Spam Cooperation">
              <p>For commercial messages sent under this Schedule, both of us are senders under CASL. We operate a centralized unsubscribe and consent-tracking system, and we ask that you cooperate with it — for example, by not separately messaging anyone who has unsubscribed through our system.</p>
              <p>You agree to protect us from any CASL-related issue arising from contact lists you have provided that don't meet the confirmations in Section 4.</p>
            </Section>

            <Section title="6. Telemarketing Compliance">
              <p>For outbound calling under this Schedule, we will:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>scrub outbound lists against the National Do Not Call List;</li>
                <li>respect required calling hours;</li>
                <li>make required identification disclosures at the start of each call;</li>
                <li>keep records as required.</li>
              </ul>
            </Section>

            <Section title="7. Acting on Your Behalf">
              <p>We act as your representative within an agreed scope. We won't commit you to anything beyond that scope without your written approval. You can direct our conduct in writing, and we will follow your directions provided they are lawful and consistent with this Schedule.</p>
            </Section>

            <Section title="8. Site Visits">
              <p>Our team may attend job sites on your behalf for measurement and coordination. We'll follow site rules and conduct ourselves professionally.</p>
            </Section>

            <Section title="9. Quality Control Inspections">
              <p>As part of Direct Outreach, we may conduct a post-job inspection. We'll share findings with you in writing. If we identify a deficiency, we'll let you know promptly so it can be addressed. You're welcome to dispute findings; if so, we'll discuss in good faith and adjust where appropriate.</p>
            </Section>

            <Section title="10. Onboarding and Going Live">
              <p>Before we begin live activity on your behalf, we'll verify your DNS records, test the caller ID display, and confirm everything is ready. We'll let you know when we go live.</p>
            </Section>

            <Section title="11. Ending this Schedule">
              <p>Within twenty-four (24) hours of revocation or termination, outbound communications using your identifiers will stop. DNS records you added for this service can then be reverted on your side. Customer-provided lists in our possession will be returned or securely destroyed, except where retention is required by law.</p>
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
