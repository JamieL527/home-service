import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { updateJobDetails } from '@/app/actions/jobs-admin'
import { VerifyButton } from './verify-button'
import { PhotoGrid } from '@/components/ui/photo-grid'
import { ArrowLeft } from 'lucide-react'

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

function fmtDate(d: Date | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-CA')
}

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">{label}</label>
      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
        {value || '—'}
      </p>
    </div>
  )
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true, address: true, phase: true,
          deals: {
            where: { status: 'won' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              quotes: { where: { status: 'accepted' }, orderBy: { version: 'desc' }, take: 1 },
            },
          },
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

  const isEditable = (job.status as string) === 'PENDING'
  const phase = job.phase ?? job.lead.phase
  const meta = STATUS_META[job.status as string] ?? STATUS_META.PENDING

  // Detect if this job was created from a Sales Deal Won
  const wonDeal = job.lead.deals[0] ?? null
  const acceptedQuote = wonDeal?.quotes[0] ?? null
  const fromDeal = !!wonDeal

  // Derive scope text from deal.notes or accepted quote line items
  let dealScope = ''
  if (wonDeal) {
    if (wonDeal.notes) {
      dealScope = wonDeal.notes
    } else if (acceptedQuote?.lineItems) {
      type LineItem = { description: string; quantity: number; unitPrice: number }
      const items = acceptedQuote.lineItems as LineItem[]
      dealScope = items.map(i => `${i.description} × ${i.quantity}`).join('\n')
    }
  }

  async function handleSave(formData: FormData) {
    'use server'
    const dealId = formData.get('dealId') as string | null
    const contractorType = formData.get('contractorType') as string

    if (dealId) {
      // Job from Sales Deal Won — derive most fields from the deal
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          quotes: { where: { status: 'accepted' }, orderBy: { version: 'desc' }, take: 1 },
        },
      })
      const quote = deal?.quotes[0]

      type LineItem = { description: string; quantity: number; unitPrice: number }
      const lineItems = quote?.lineItems as LineItem[] | null
      const scope =
        deal?.notes ||
        (lineItems ? lineItems.map(i => `${i.description} × ${i.quantity}`).join('\n') : '')

      const start = fmtDate(deal?.siteVisitDate)
      const end = fmtDate(deal?.deadline)
      const timeline = [start && `Start: ${start}`, end && `End: ${end}`].filter(Boolean).join(' / ')

      await updateJobDetails(id, {
        contractorType,
        serviceType: deal?.projectType || '',
        scope,
        priceType: 'fixed',
        priceFixed: quote?.total ?? null,
        priceMin: null,
        priceMax: null,
        timeline,
      })
    } else {
      // Manually created job — use all form fields
      const priceType = formData.get('priceType') as string
      await updateJobDetails(id, {
        serviceType: formData.get('serviceType') as string,
        contractorType,
        scope: formData.get('scope') as string,
        priceType,
        priceFixed: priceType === 'fixed' ? Number(formData.get('priceFixed')) || null : null,
        priceMin: priceType === 'range' ? Number(formData.get('priceMin')) || null : null,
        priceMax: priceType === 'range' ? Number(formData.get('priceMax')) || null : null,
        timeline: formData.get('timeline') as string,
      })
    }
    redirect('/admin/jobs')
  }

  return (
    <div className="animate-fadeIn max-w-2xl">
      {/* Back */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={13} /> Back to Jobs
        </Link>
        <Link
          href={`/admin/leads/${job.lead.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Lead Detail →
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-black text-gray-900">Job Details</h1>
          <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 ${meta.color}`}>{meta.label}</span>
          {fromDeal && (
            <span className="text-[11px] font-bold rounded-full px-2.5 py-0.5 bg-indigo-100 text-indigo-700">
              From Sales Deal
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{job.lead.address}</p>
        {phase && <p className="text-xs text-gray-400 mt-0.5">{PHASE_LABELS[phase] ?? phase}</p>}
      </div>

      <form action={handleSave} className="space-y-6">
        {/* Hidden dealId for server action to detect source */}
        {fromDeal && <input type="hidden" name="dealId" value={wonDeal!.id} />}

        {fromDeal ? (
          /* ── Deal-Won layout: read-only info + only contractorType editable ── */
          <>
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">
                From Sales Deal
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Address" value={job.lead.address} />
                <ReadField label="Phase" value={phase ? (PHASE_LABELS[phase] ?? phase) : null} />
                <ReadField label="Client Name" value={wonDeal!.clientName} />
                <ReadField label="Project Type" value={wonDeal!.projectType} />
                <ReadField
                  label="Timeline Start"
                  value={fmtDate(wonDeal!.siteVisitDate)}
                />
                <ReadField
                  label="Timeline End"
                  value={fmtDate(wonDeal!.deadline)}
                />
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Scope of Work</h2>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 whitespace-pre-wrap min-h-[72px]">
                {dealScope || '—'}
              </p>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Pricing</h2>
              <ReadField
                label="Fixed Price (from accepted quote)"
                value={acceptedQuote?.total != null ? `$${acceptedQuote.total.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : null}
              />
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Contractor Assignment</h2>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">
                  Required Contractor Type <span className="text-red-500">*</span>
                </label>
                <input
                  name="contractorType"
                  required
                  defaultValue={job.contractorType ?? ''}
                  placeholder="e.g. Plumber / Electrician / General Contractor"
                  disabled={!isEditable}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
            </section>
          </>
        ) : (
          /* ── Original manual layout ── */
          <>
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Job Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <ReadField label="Address" value={job.lead.address} />
                <ReadField label="Phase" value={phase ? (PHASE_LABELS[phase] ?? phase) : null} />
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Service Type</label>
                  <input
                    name="serviceType"
                    defaultValue={job.serviceType ?? ''}
                    placeholder="e.g. Roof Repair"
                    disabled={!isEditable}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    Required Contractor Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="contractorType"
                    required
                    defaultValue={job.contractorType ?? ''}
                    placeholder="e.g. Plumber / Electrician"
                    disabled={!isEditable}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Scope of Work</h2>
              <textarea
                name="scope"
                defaultValue={job.scope ?? ''}
                rows={4}
                placeholder="Describe the scope of work..."
                disabled={!isEditable}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
              />
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Pricing</h2>
              <div className="flex gap-3 mb-4">
                {(['fixed', 'range'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priceType"
                      value={t}
                      defaultChecked={(job.priceType ?? 'fixed') === t}
                      disabled={!isEditable}
                      className="accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">{t}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Fixed Price ($)</label>
                  <input
                    name="priceFixed"
                    type="number" min="0" step="0.01"
                    defaultValue={job.priceFixed ?? ''}
                    placeholder="0.00"
                    disabled={!isEditable}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div />
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Min Price ($)</label>
                  <input
                    name="priceMin"
                    type="number" min="0" step="0.01"
                    defaultValue={job.priceMin ?? ''}
                    placeholder="0.00"
                    disabled={!isEditable}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">Max Price ($)</label>
                  <input
                    name="priceMax"
                    type="number" min="0" step="0.01"
                    defaultValue={job.priceMax ?? ''}
                    placeholder="0.00"
                    disabled={!isEditable}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Timeline</h2>
              <input
                name="timeline"
                defaultValue={job.timeline ?? ''}
                placeholder="e.g. 2–3 weeks starting May 2026"
                disabled={!isEditable}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </section>
          </>
        )}

        {/* Assigned Contractor (read-only) */}
        {job.company && (
          <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4">Assigned Contractor</h2>
            <p className="text-sm font-bold text-gray-800">{job.company.name}</p>
            {job.company.contactName && <p className="text-xs text-gray-500 mt-1">{job.company.contactName}</p>}
            {job.company.contactPhone && <p className="text-xs text-gray-400">{job.company.contactPhone}</p>}
          </section>
        )}

        {/* Offer History */}
        {job.offers.length > 0 && (
          <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
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

        {/* Save */}
        {isEditable && (
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Save & Mark Ready
            </button>
            <Link
              href="/admin/jobs"
              className="px-6 py-2.5 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        )}
      </form>

      {/* Progress Notes + Photos */}
      {(['IN_PROGRESS', 'COMPLETED', 'VERIFIED'] as string[]).includes(job.status as string) && (
        <section className="mt-6 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Progress Notes from Contractor</h2>
            {job.progressNote ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.progressNote}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No notes submitted yet.</p>
            )}
          </div>

          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Progress Photos from Contractor</h2>
            <PhotoGrid
              photos={((job.progressPhotos as string[] | null) ?? []).map((url) => ({ url }))}
              columns={3}
              emptyText="No photos uploaded yet."
            />
          </div>
        </section>
      )}

      {/* Verify section */}
      {(job.status as string) === 'COMPLETED' && (
        <section className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <h2 className="text-sm font-black text-emerald-800 mb-1">Ready to Verify?</h2>
          <p className="text-xs text-emerald-600 mb-4">
            Review the progress notes above, then mark this job as verified to close it out.
          </p>
          <VerifyButton jobId={job.id} />
        </section>
      )}

      {(job.status as string) === 'VERIFIED' && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-sm font-bold text-emerald-700">✓ This job has been verified and closed.</p>
        </div>
      )}
    </div>
  )
}
