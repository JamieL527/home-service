import Link from 'next/link'
import { PublicHeader } from '@/components/landing/public-header'

export default function ScheduleAPage() {
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
            Schedule A — Referral Network
          </h1>
          <p className="text-sm text-gray-400 mb-10 leading-relaxed">Effective June 1, 2026</p>
          <p className="text-gray-400 mb-10 text-sm">This Service Schedule A ("Schedule A") is part of and governed by the Construction Market Service Agreement (the "Master Agreement"). Terms defined in the Master Agreement have the same meaning here.</p>

          <div className="space-y-10">
            <Section title="1. The Referral Network">
              <p>We operate a referral service (the "Referral Network") where we identify potential construction customers and introduce them to participating contractors, including you. There is no monthly fee to participate in the Referral Network. We earn only through Commission under Section 4.</p>
              <p>We don't guarantee any particular number of referrals, the quality or readiness of any introduced customer, or that any referral will turn into a contract or revenue for you. We do, however, do our best to send you good fits.</p>
            </Section>

            <Section title="2. Definitions">
              <p><strong className="text-white">"Referred Customer"</strong> means a property owner, builder, business, or other party that we identify and introduce to you through the Referral Network.</p>
              <p><strong className="text-white">"Referred Job"</strong> means any construction contract you enter into with a Referred Customer.</p>
              <p><strong className="text-white">"Contract Value"</strong> means the total price the Referred Customer pays you for a Referred Job, including labour and materials, and excluding HST and other sales taxes.</p>
              <p><strong className="text-white">"Commission"</strong> means the fee you pay us under Section 4.</p>
              <p><strong className="text-white">"Introduction Date"</strong> means the date we let you know about a Referred Customer.</p>
            </Section>

            <Section title="3. How Referrals Work">
              <p>When we introduce a Referred Customer to you, we'll let you know in writing (by email or through the Construction Market platform) and record the Introduction Date.</p>
              <p>If you were already in active discussions with that customer, or already had an existing business relationship with them, that customer is not a Referred Customer. Just let us know promptly — within five (5) business days of the Introduction Date — and share some basic evidence of the prior relationship. If we don't hear from you in that window, the customer will be treated as a Referred Customer under this Schedule.</p>
            </Section>

            <Section title="4. Commission">
              <p>For each Referred Job, you agree to pay us a Commission of <strong className="text-white">ten percent (10%)</strong> of the Contract Value.</p>
              <p>The full Commission for each Referred Job becomes payable as a single payment once you receive your first payment from the Referred Customer for that Referred Job. You'll pay the full Commission to us within seven (7) days of receiving your first payment from the Referred Customer.</p>
              <p>If your first payment from the Referred Customer is in cash, please log the receipt in the Construction Market platform within five (5) business days, including the amount, the date, and the Referred Customer.</p>
              <p>If the Contract Value changes materially after Commission has been paid (for example, due to scope changes or change orders), please let us know within five (5) business days of the change, and any difference will be reconciled within fourteen (14) days — either way.</p>
            </Section>

            <Section title="5. Verification">
              <p>To keep things fair and accurate, we may, with fourteen (14) days' written notice, ask for copies of contracts, invoices, payment records, or bank statements relating to a Referred Job, so we can confirm the Contract Value and Commission. You're welcome to redact information unrelated to the Referred Job.</p>
              <p>If a review shows an under-reported Contract Value of more than five percent (5%), the difference is payable, along with interest under the Master Agreement and the reasonable cost of the review.</p>
            </Section>

            <Section title="6. Working Through the Network">
              <p>For a period of twenty-four (24) months from each Referred Customer's Introduction Date (the "Exclusivity Period"), please conduct all business with that Referred Customer through the Referral Network. That means not (a) entering into a Referred Job with that Referred Customer directly outside the Referral Network, or (b) routing a Referred Job through another person or business to avoid Commission.</p>
              <p>Commission applies to all Referred Jobs entered into with a Referred Customer during the Exclusivity Period, even if this Schedule has ended. Once the Exclusivity Period for a particular customer is over, you're free to deal with that customer directly for new jobs, with no Commission obligation to us for those new jobs.</p>
            </Section>

            <Section title="7. What You Agree To">
              <p>In short, you agree to:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>respond to referrals in good faith and within a reasonable time;</li>
                <li>deal with Referred Customers honestly and professionally;</li>
                <li>let us know when you've entered into a Referred Job, and share the Contract Value;</li>
                <li>let us know when you've received your first payment for a Referred Job;</li>
                <li>pay the full Commission when it's due;</li>
                <li>not avoid, reduce, or delay Commission by misreporting figures, delaying a contract, routing work through another person or business, or otherwise.</li>
              </ul>
            </Section>

            <Section title="8. Our Role">
              <p>We provide referrals only. We are not a party to any contract between you and a Referred Customer. We don't supervise or direct your work, pricing, scheduling, quality, or safety, and we don't take responsibility for your dealings with any customer. You participate in the Referral Network as an independent business. Nothing in this Schedule creates an employment, agency, partnership, or joint-venture relationship between us.</p>
            </Section>

            <Section title="9. Customer Information">
              <p>Information we share with you about a Referred Customer is Confidential Information under the Master Agreement. Please use it only to pursue the referral, and don't sell, share, or disclose it to anyone else.</p>
            </Section>

            <Section title="10. Ending this Schedule">
              <p>Either of us can end this Schedule with fourteen (14) days' written notice. Ending this Schedule doesn't affect Commission already owed on Referred Jobs in progress, or Commission and the working-through-the-network commitment for Referred Customers introduced before the Schedule ended during their Exclusivity Period.</p>
              <p>Sections 4 (Commission), 5 (Verification), 6 (Working Through the Network), and 9 (Customer Information) continue after this Schedule ends.</p>
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
