import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'
import { StatusActions } from './status-actions'
import { NoteForm } from './note-form'
import { ProgressPhotos } from './progress-photos'
import { ArrowLeft } from 'lucide-react'

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0: Survey', P1: 'Phase 1: Foundation', P2: 'Phase 2: Framing',
  P3: 'Phase 3: MEC/Drywall', P4: 'Phase 4: Finishing', P5: 'Phase 5: Landscaping',
  MLS: 'MLS: Renovation',
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ASSIGNED:    { label: 'Assigned',    color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  VERIFIED:    { label: 'Verified',    color: 'bg-emerald-100 text-emerald-700' },
}

function formatPrice(job: {
  priceType: string | null; priceFixed: number | null
  priceMin: number | null; priceMax: number | null
}) {
  if (!job.priceType) return 'TBD'
  if (job.priceType === 'fixed' && job.priceFixed != null)
    return `$${job.priceFixed.toLocaleString()}`
  if (job.priceType === 'range' && job.priceMin != null && job.priceMax != null)
    return `$${job.priceMin.toLocaleString()} – $${job.priceMax.toLocaleString()}`
  return 'TBD'
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  )
}

export default async function ContractorJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { company } = await requireContractorUser()

  const job = await prisma.job.findFirst({
    where: { id, companyId: company.id },
    include: { lead: { select: { address: true } } },
  })

  if (!job) notFound()

  const status = job.status as string
  const meta = STATUS_META[status]
  const phase = job.phase
  const price = formatPrice(job)
  const isActive = status === 'ASSIGNED' || status === 'IN_PROGRESS'
  const isDone = status === 'COMPLETED' || status === 'VERIFIED'

  return (
    <div className="max-w-2xl animate-fadeIn">
      <Link
        href="/contractor/jobs?tab=active"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground leading-snug">{job.lead.address}</h1>
          {phase && (
            <p className="text-sm text-muted-foreground mt-0.5">{PHASE_LABELS[phase] ?? phase}</p>
          )}
        </div>
        {meta && (
          <span className={`shrink-0 text-xs font-bold rounded-full px-3 py-1 ${meta.color}`}>
            {meta.label}
          </span>
        )}
      </div>

      <div className="space-y-4">

        {/* Job Details */}
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Job Details</p>
          <div className="space-y-2">
            <Row label="Service Type" value={job.serviceType} />
            <Row label="Contractor Type" value={job.contractorType} />
            <Row label="Price" value={price} />
            <Row label="Timeline" value={job.timeline} />
          </div>
        </section>

        {/* Scope of Work */}
        {job.scope && (
          <section className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Scope of Work</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{job.scope}</p>
          </section>
        )}

        {/* Status Actions */}
        {(isActive) && (
          <section className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Update Status</p>
            <StatusActions jobId={job.id} status={status} />
          </section>
        )}

        {/* Progress Notes */}
        {(isActive || isDone) && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress Notes</p>
              {isActive && <NoteForm jobId={job.id} existing={job.progressNote} />}
            </div>
            {job.progressNote ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{job.progressNote}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No notes yet.</p>
            )}
          </section>
        )}

        {/* Progress Photos */}
        {(isActive || isDone) && (
          <section className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Progress Photos</p>
            <ProgressPhotos
              jobId={job.id}
              initialUrls={(job.progressPhotos as string[] | null) ?? []}
              canEdit={isActive}
            />
          </section>
        )}

        {/* Completed notice */}
        {isDone && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
            <p className="text-sm font-bold text-green-700">
              {status === 'VERIFIED' ? 'This job has been verified. ✓' : 'Job marked as completed. Awaiting admin verification.'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
