export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { updateReferralJobDetails } from '@/app/actions/jobs-admin'

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0: Survey', P1: 'Phase 1: Foundation', P2: 'Phase 2: Framing',
  P3: 'Phase 3: Mechanical', P4: 'Phase 4: Drywall', P5: 'Phase 5: Finish', MLS: 'MLS: Renovation',
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600' },
  READY:       { label: 'Ready',       color: 'bg-blue-100 text-blue-700' },
  OFFER_SENT:  { label: 'Offer Sent',  color: 'bg-purple-100 text-purple-700' },
  ASSIGNED:    { label: 'Assigned',    color: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  COMPLETED:   { label: 'Completed',   color: 'bg-teal-100 text-teal-700' },
  VERIFIED:    { label: 'Verified',    color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-100 text-red-600' },
}

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">{label}</label>
      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{value || '—'}</p>
    </div>
  )
}

export default async function SalesJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true, address: true, phase: true, source: true, businessName: true,
          contacts: { take: 1 },
          deals: { take: 1, select: { id: true } },
        },
      },
      company: { select: { name: true, contactName: true, contactPhone: true } },
      offers: {
        include: { company: { select: { name: true } } },
        orderBy: { sentAt: 'desc' },
      },
    },
  })

  if (!job) notFound()

  // Repair stale pending offers when job is already assigned — legacy data fix
  const ASSIGNED_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']
  if (ASSIGNED_STATUSES.includes(job.status as string)) {
    await prisma.jobOffer.updateMany({
      where: { jobId: job.id, status: 'pending' },
      data: { status: 'accepted', respondedAt: new Date() },
    })
    // Refresh offers to reflect updated status
    job.offers = await prisma.jobOffer.findMany({
      where: { jobId: job.id },
      include: { company: { select: { name: true } } },
      orderBy: { sentAt: 'desc' },
    }) as typeof job.offers
  }

  const isReferral = job.lead.source === 'referral'
  const isEditable = isReferral && (job.status as string) === 'READY'
  const phase = job.phase ?? job.lead.phase
  const meta = STATUS_META[job.status as string] ?? STATUS_META.PENDING
  const timelineStart = job.timeline?.match(/Start: (\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
  const timelineEnd = job.timeline?.match(/End: (\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
  const leadContact = job.lead.contacts[0] ?? null
  const dealId = job.lead.deals[0]?.id

  async function handleReferralSave(formData: FormData) {
    'use server'
    await updateReferralJobDetails(id, {
      businessName: formData.get('businessName') as string || undefined,
      phase: formData.get('phase') as string || undefined,
      contactId: leadContact?.id,
      contactName: formData.get('contactName') as string || undefined,
      contactPhone: formData.get('contactPhone') as string || undefined,
      contactEmail: formData.get('contactEmail') as string || undefined,
      serviceType: formData.get('serviceType') as string,
      contractorType: formData.get('contractorType') as string,
      scope: formData.get('scope') as string,
      timelineStart: formData.get('timelineStart') as string || undefined,
      timelineEnd: formData.get('timelineEnd') as string || undefined,
    })
    redirect('/sales/jobs')
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'

  return (
    <div className="animate-fadeIn max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <Link href="/sales/jobs" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold transition-colors">
          ← Jobs
        </Link>
        {isReferral && dealId && (
          <Link
            href={`/sales/deals/${dealId}/estimation`}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Plans & Quote →
          </Link>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-black text-gray-900">Job Details</h1>
          <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${meta.color}`}>{meta.label}</span>
          {isReferral && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5 bg-indigo-100 text-indigo-700">Referral</span>
          )}
        </div>
        <p className="text-sm text-gray-500">{job.lead.address}</p>
        {phase && <p className="text-xs text-gray-400 mt-0.5">{PHASE_LABELS[phase] ?? phase}</p>}
      </div>

      <form action={handleReferralSave} className="space-y-6">
        {isEditable ? (
          <>
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Project Info</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><ReadField label="Address" value={job.lead.address} /></div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Client Name</label>
                  <input name="businessName" defaultValue={job.lead.businessName ?? ''} placeholder="e.g. John Smith" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Phase</label>
                  <select name="phase" defaultValue={phase ?? ''} className={inputCls}>
                    <option value="">— Select Phase —</option>
                    {['P0','P1','P2','P3','P4','P5','MLS'].map(p => (
                      <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Contact Info</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Contact Name</label>
                  <input name="contactName" defaultValue={leadContact?.name ?? ''} placeholder="Name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Phone</label>
                  <input name="contactPhone" defaultValue={leadContact?.phone ?? ''} placeholder="416-xxx-xxxx" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Email</label>
                  <input name="contactEmail" type="email" defaultValue={leadContact?.email ?? ''} placeholder="email@example.com" className={inputCls} />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Job Details</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Project Type <span className="text-red-500">*</span></label>
                  <input name="serviceType" required defaultValue={job.serviceType ?? ''} placeholder="e.g. Basement Waterproofing" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Contractor Type <span className="text-red-500">*</span></label>
                  <input name="contractorType" required defaultValue={job.contractorType ?? ''} placeholder="e.g. Plumber / Electrician" className={inputCls} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Scope of Work <span className="text-red-500">*</span></label>
                <textarea name="scope" required rows={3} defaultValue={job.scope ?? ''} placeholder="Describe the scope of work..." className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Timeline Start</label>
                  <input name="timelineStart" type="date" defaultValue={timelineStart} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Timeline End</label>
                  <input name="timelineEnd" type="date" defaultValue={timelineEnd} className={inputCls} />
                </div>
              </div>
            </section>

            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">
                Save Changes
              </button>
              <Link href="/sales/jobs" className="px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </Link>
            </div>
          </>
        ) : (
          <>
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Job Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Address" value={job.lead.address} />
                <ReadField label="Phase" value={phase ? (PHASE_LABELS[phase] ?? phase) : null} />
                <ReadField label="Client Name" value={job.lead.businessName} />
                <ReadField label="Project Type" value={job.serviceType} />
                <ReadField label="Contractor Type" value={job.contractorType} />
                <ReadField label="Timeline" value={job.timeline} />
              </div>
            </section>
            {job.scope && (
              <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Scope of Work</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.scope}</p>
              </section>
            )}
            {job.priceFixed != null && (
              <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
                  Agreed Price {isReferral && <span className="text-indigo-500 font-medium normal-case">(from accepted quote)</span>}
                </h2>
                <ReadField label="Fixed Price" value={`$${job.priceFixed.toLocaleString()}`} />
              </section>
            )}
          </>
        )}
      </form>

      {job.company && (
        <section className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Assigned Contractor</h2>
          <p className="text-sm font-bold text-gray-800">{job.company.name}</p>
          {job.company.contactName && <p className="text-xs text-gray-500 mt-1">{job.company.contactName}</p>}
          {job.company.contactPhone && <p className="text-xs text-gray-400">{job.company.contactPhone}</p>}
        </section>
      )}

      {job.offers.length > 0 && (
        <section className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Offer History</h2>
          <div className="space-y-2">
            {job.offers.map((offer) => (
              <div key={offer.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium">{offer.company.name}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${
                  offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  offer.status === 'rejected' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-500'
                }`}>{offer.status}</span>
                <span className="text-gray-400">{offer.sentAt.toLocaleDateString('en-CA')}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
