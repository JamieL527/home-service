import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LeadActionButtons } from '@/components/admin/lead-action-buttons'
import {
  MapPin, Building, Hammer, MessageCircle,
  Users, Phone, Mail, Camera, Database, FileText,
} from 'lucide-react'
import { PhotoGrid, type PhotoItem } from '@/components/ui/photo-grid'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  QUALIFIED: 'Qualified',
  NEEDS_FIX: 'Needs Fix',
  RESUBMITTED: 'Resubmitted',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted',
  NEW_LEAD: 'New Lead',
  BACKED: 'Backed',
  URGENT: 'Urgent',
  PARKED: 'Parked',
  SCHEDULED: 'Scheduled',
  INJECTED: 'Injected',
  JOB_ACTIVE: 'Job Active',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
  RESUBMITTED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
  NEW_LEAD: 'bg-sky-100 text-sky-700',
  BACKED: 'bg-indigo-100 text-indigo-700',
  URGENT: 'bg-red-100 text-red-700',
  PARKED: 'bg-gray-100 text-gray-500',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  INJECTED: 'bg-green-100 text-green-700',
  JOB_ACTIVE: 'bg-purple-100 text-purple-700',
}

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0: Survey',
  P1: 'Phase 1: Foundation',
  P2: 'Phase 2: Framing',
  P3: 'Phase 3: MEC/Drywall',
  P4: 'Phase 4: Finishing',
  P5: 'Phase 5: Landscaping',
  MLS: 'MLS: Renovation',
}

function SectionCard({
  Icon, title, colorClass, bgClass, borderClass, children,
}: {
  Icon: React.ElementType; title: string; colorClass: string
  bgClass: string; borderClass: string; children: React.ReactNode
}) {
  return (
    <div className={`${bgClass} p-4 rounded-xl border ${borderClass} shadow-sm`}>
      <div className="flex items-center gap-1.5 mb-4">
        <Icon size={14} className={colorClass} />
        <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-800 font-medium">
        {value?.trim() ? value : <span className="text-gray-300 font-normal">—</span>}
      </dd>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-xs text-gray-400 italic">{text}</p>
  )
}

function getActionVariant(status: string): 'evaluation-new' | 'evaluation-backed' | 'evaluation-urgent' | 'parking' | null {
  if (status === 'URGENT') return 'evaluation-urgent'
  if (status === 'BACKED') return 'evaluation-backed'
  if (status === 'NEW_LEAD') return 'evaluation-new'
  if (status === 'PARKED') return 'parking'
  return null
}

type CityData = {
  permitNum?: string | null
  permitType?: string | null
  permitStatus?: string | null
  applicationDate?: string | null
  estConstructionCost?: string | null
  description?: string | null
  builderName?: string | null
  [key: string]: unknown
}

type PhotosData = {
  site?: string[]
  demand?: string[]
  supply?: string[]
  other?: string[]
  [key: string]: unknown
}

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { contacts: true, jobs: true, suppliers: true },
  })

  if (!lead) notFound()

  const actionVariant = getActionVariant(lead.status)

  const cityData = lead.cityData as CityData | null
  const photosData = lead.photos as PhotosData | null

  const photoCategories: { key: keyof PhotosData; label: string }[] = [
    { key: 'site', label: 'Site' },
    { key: 'demand', label: 'Demand' },
    { key: 'supply', label: 'Supply' },
    { key: 'other', label: 'Other' },
  ]

  return (
    <div className="max-w-2xl animate-fadeIn">
      <Link
        href="/admin/evaluation"
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold mb-4 transition-colors"
      >
        ← Evaluation
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">{lead.address}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Created {lead.createdAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
            STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
      </div>

      {/* Actions panel */}
      {actionVariant && (
        <div className="mb-5 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Actions</p>
          <LeadActionButtons leadId={lead.id} variant={actionVariant} leadPhase={lead.phase} />
        </div>
      )}

      <div className="space-y-4">

        {/* 1. Location */}
        <SectionCard
          Icon={MapPin} title="1. Location"
          colorClass="text-gray-600" bgClass="bg-gray-50" borderClass="border-gray-200"
        >
          <dl className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <DataRow label="Address" value={lead.address} />
            </div>
            <DataRow
              label="Phase"
              value={lead.phase ? (PHASE_LABELS[lead.phase] ?? lead.phase) : null}
            />
            <DataRow label="Zone Name" value={lead.zoneName} />
            {lead.lat && lead.lng && (
              <>
                <DataRow label="Latitude" value={String(lead.lat.toFixed(6))} />
                <DataRow label="Longitude" value={String(lead.lng.toFixed(6))} />
              </>
            )}
          </dl>
        </SectionCard>

        {/* 2. City Data */}
        <SectionCard
          Icon={Database} title="2. City Data"
          colorClass="text-purple-700" bgClass="bg-purple-50" borderClass="border-purple-100"
        >
          {cityData ? (
            <dl className="grid grid-cols-2 gap-4">
              <DataRow label="Permit Number" value={cityData.permitNum} />
              <DataRow label="Permit Type" value={cityData.permitType} />
              <DataRow label="Permit Status" value={cityData.permitStatus} />
              <DataRow label="Application Date" value={cityData.applicationDate} />
              <div className="col-span-2">
                <DataRow label="Est. Construction Cost" value={cityData.estConstructionCost} />
              </div>
              <div className="col-span-2">
                <DataRow label="Description" value={cityData.description} />
              </div>
              <div className="col-span-2">
                <DataRow label="Builder Name" value={cityData.builderName} />
              </div>
            </dl>
          ) : (
            <EmptyState text="No city data available." />
          )}
        </SectionCard>

        {/* 3. Demand Side */}
        <SectionCard
          Icon={Building} title="3. Demand Side"
          colorClass="text-blue-700" bgClass="bg-blue-50" borderClass="border-blue-100"
        >
          <dl className="grid grid-cols-2 gap-4 mb-4">
            <DataRow label="Business Name" value={lead.businessName} />
            <DataRow label="Rating" value={lead.rating} />
            <DataRow label="Website" value={lead.website} />
            <DataRow label="Office Location" value={lead.officeLocation} />
          </dl>

          <div className="flex items-center gap-1.5 mb-3">
            <Users size={13} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Personnel In Charge</span>
          </div>
          {lead.contacts.length > 0 ? (
            <div className="space-y-3">
              {lead.contacts.map((contact, i) => (
                <div key={contact.id} className="bg-white rounded-lg border border-blue-200 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{contact.name || '—'}</p>
                      {contact.role && (
                        <p className="text-xs text-blue-600 font-semibold">{contact.role}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                      Contact {i + 1}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {contact.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone size={11} className="text-gray-400" />{contact.phone}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail size={11} className="text-gray-400" />{contact.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No contact information recorded." />
          )}
        </SectionCard>

        {/* 4. Supply Side */}
        <SectionCard
          Icon={Hammer} title="4. Supply Side"
          colorClass="text-amber-700" bgClass="bg-amber-50" borderClass="border-amber-100"
        >
          {lead.suppliers.length > 0 ? (
            <div className="space-y-3">
              {lead.suppliers.map((s) => (
                <div key={s.id} className="bg-white rounded-lg border border-amber-200 p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-gray-800">
                      {s.trade ? `${s.trade}: ` : ''}{s.company || '—'}
                    </p>
                    {s.interaction && (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide ml-2 shrink-0">
                        {s.interaction}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {s.contact && (
                      <p className="text-xs text-gray-600 font-medium">{s.contact}</p>
                    )}
                    {s.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone size={11} className="text-gray-400" />{s.phone}
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail size={11} className="text-gray-400" />{s.email}
                      </div>
                    )}
                    {s.website && (
                      <p className="text-xs text-gray-500 truncate">{s.website}</p>
                    )}
                    {s.officeLocation && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={11} className="text-gray-400" />{s.officeLocation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No supply-side contractors recorded." />
          )}
        </SectionCard>

        {/* 5. Photos */}
        <SectionCard
          Icon={Camera} title="5. Visual Evidence"
          colorClass="text-gray-500" bgClass="bg-gray-50" borderClass="border-gray-200"
        >
          {(() => {
            const flat: PhotoItem[] = photoCategories.flatMap(({ key, label }) =>
              ((photosData?.[key] as string[] | undefined) ?? []).map((url) => ({ url, label }))
            )
            return <PhotoGrid photos={flat} columns={4} emptyText="No photos uploaded." />
          })()}
        </SectionCard>

        {/* 6. Field Notes */}
        <SectionCard
          Icon={MessageCircle} title="6. Field Notes"
          colorClass="text-teal-600" bgClass="bg-teal-50" borderClass="border-teal-100"
        >
          {lead.initialComment?.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {lead.initialComment}
            </p>
          ) : (
            <EmptyState text="No field notes recorded." />
          )}
        </SectionCard>

        {/* Linked Jobs */}
        {lead.jobs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <FileText size={14} className="text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Linked Jobs</p>
            </div>
            {lead.jobs.map((job) => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-gray-700">Job #{job.id.slice(0, 8)}</p>
                  <p className="text-[11px] text-gray-400">{job.phase ?? '—'} · {job.status}</p>
                </div>
                <span className="text-[11px] text-gray-500">{job.createdAt.toLocaleDateString('en-CA')}</span>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
