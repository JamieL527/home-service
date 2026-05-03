import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import {
  MapPin, Building, Hammer, MessageCircle,
  Camera, Users, Phone, Mail, AlertTriangle, CheckCircle, Database,
} from 'lucide-react'
import { PhotoGrid, type PhotoItem } from '@/components/ui/photo-grid'
import { ResubmitButton } from './resubmit-button'
import { NotesForm } from './notes-form'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  QUALIFIED: 'Qualified',
  NEEDS_FIX: 'Needs Fix',
  RESUBMITTED: 'Resubmitted',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  NEEDS_FIX: 'bg-red-100 text-red-700',
  RESUBMITTED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
}

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0: Survey', P1: 'Phase 1: Foundation', P2: 'Phase 2: Framing',
  P3: 'Phase 3: MEC/Drywall', P4: 'Phase 4: Finishing', P5: 'Phase 5: Landscaping',
  MLS: 'MLS: Renovation',
}

function SectionCard({
  Icon, title, colorClass, bgClass, borderClass, action, children,
}: {
  Icon: React.ElementType; title: string; colorClass: string
  bgClass: string; borderClass: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className={`${bgClass} p-4 rounded-xl border ${borderClass} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={colorClass} />
          <span className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>{title}</span>
        </div>
        {action}
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

export default async function LeadDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ resubmitted?: string }>
}) {
  const { id } = await params
  const { resubmitted } = await searchParams
  const { user } = await requireCollectorUser()

  const lead = await prisma.lead.findFirst({
    where: { id, createdById: user.id },
    include: { contacts: true, suppliers: true },
  })

  if (!lead) notFound()

  const status = lead.status as string
  const isNeedsFix = status === 'NEEDS_FIX'

  type CityData = {
    permitNum?: string | null
    permitType?: string | null
    permitStatus?: string | null
    applicationDate?: string | null
    estConstructionCost?: string | null
    description?: string | null
    builderName?: string | null
  }
  const cityData = lead.cityData as CityData | null

  // Compute missing fields for completeness strip
  const missing: Array<{ label: string; section: string }> = []
  if (!lead.businessName?.trim())       missing.push({ label: 'Business name',       section: 'demand' })
  if (lead.contacts.length === 0)       missing.push({ label: 'Contact information', section: 'demand' })
  if (!lead.initialComment?.trim())     missing.push({ label: 'Field notes',         section: 'notes' })

  const completeness = missing.length === 0

  return (
    <div className="max-w-2xl animate-fadeIn">
      {/* Back nav */}
      <Link
        href="/collector/leads"
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold mb-4 transition-colors"
      >
        ← My Leads
      </Link>

      {/* Resubmitted success banner */}
      {resubmitted === '1' && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <CheckCircle size={15} className="text-green-500" />
          <span className="text-green-700 font-bold text-sm">Resubmitted successfully</span>
        </div>
      )}

      {/* Needs Fix banner */}
      {isNeedsFix && (
        <div className="mb-5 bg-red-50 border border-red-300 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-red-800 mb-2">This lead needs your attention</p>
              {lead.reviewComment && (
                <>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Issues to fix:</p>
                  <p className="text-sm text-red-700 leading-relaxed bg-red-100 rounded-lg px-3 py-2">
                    {lead.reviewComment}
                  </p>
                </>
              )}
            </div>
          </div>
          <ResubmitButton leadId={lead.id} />
        </div>
      )}

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">{lead.address}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Created {lead.createdAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      {/* Data completeness strip */}
      {completeness ? (
        <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <CheckCircle size={14} className="text-green-500" />
          <span className="text-xs font-bold text-green-700">All key fields complete</span>
        </div>
      ) : (
        <div className="mb-5 bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          <p className="text-[11px] font-black text-orange-700 uppercase tracking-wider px-1">Missing information</p>
          {missing.map((m) => (
            <div key={m.label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-orange-400" />
                <span className="text-xs text-orange-800 font-medium">Missing: {m.label}</span>
              </div>
              <a
                href={`#section-${m.section}`}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-800 whitespace-nowrap"
              >
                Fill Now ↓
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">

        {/* Location */}
        <SectionCard
          Icon={MapPin} title="1. Location"
          colorClass="text-gray-600" bgClass="bg-gray-50" borderClass="border-gray-200"
        >
          <dl className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <DataRow label="Address" value={lead.address} />
            </div>
            <DataRow label="Phase" value={lead.phase ? (PHASE_LABELS[lead.phase] ?? lead.phase) : null} />
            <DataRow label="Zone" value={lead.zoneName} />
            {lead.lat && lead.lng && (
              <>
                <DataRow label="Latitude" value={String(lead.lat.toFixed(6))} />
                <DataRow label="Longitude" value={String(lead.lng.toFixed(6))} />
              </>
            )}
          </dl>
        </SectionCard>

        {/* City Data */}
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
            <p className="text-xs text-gray-400">No city data available.</p>
          )}
        </SectionCard>

        {/* Photos */}
        <SectionCard
          Icon={Camera} title="3. Visual Evidence"
          colorClass="text-gray-500" bgClass="bg-gray-50" borderClass="border-gray-200"
        >
          {(() => {
            type PhotosData = { site?: string[]; demand?: string[]; supply?: string[]; other?: string[] }
            const pd = lead.photos as PhotosData | null
            const flat: PhotoItem[] = [
              ...(pd?.site ?? []).map((url) => ({ url, label: 'Site' })),
              ...(pd?.demand ?? []).map((url) => ({ url, label: 'Demand' })),
              ...(pd?.supply ?? []).map((url) => ({ url, label: 'Supply' })),
              ...(pd?.other ?? []).map((url) => ({ url, label: 'Other' })),
            ]
            return <PhotoGrid photos={flat} columns={4} emptyText="No photos uploaded." />
          })()}
        </SectionCard>

        {/* Demand Side */}
        <div id="section-demand">
          <SectionCard
            Icon={Building} title="4. Demand Side"
            colorClass="text-blue-700" bgClass="bg-blue-50" borderClass="border-blue-100"
            action={
              <Link
                href={`/collector/leads/${lead.id}/edit`}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Edit
              </Link>
            }
          >
            <dl className="grid grid-cols-2 gap-4 mb-4">
              <DataRow label="Business Name" value={lead.businessName} />
              <DataRow label="Rating" value={lead.rating} />
              <DataRow label="Website" value={lead.website} />
              <DataRow label="Office Location" value={lead.officeLocation} />
            </dl>

            {lead.contacts.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-blue-500" />
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Personnel In Charge</span>
                </div>
                {lead.contacts.map((contact, i) => (
                  <div key={contact.id} className="bg-white rounded-lg border border-blue-200 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{contact.name || '—'}</p>
                        {contact.role && <p className="text-xs text-blue-600 font-semibold">{contact.role}</p>}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Contact {i + 1}</span>
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
              <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5 flex items-center justify-between">
                <p className="text-xs text-orange-700">No contact information added.</p>
                <Link
                  href={`/collector/leads/${lead.id}/edit#contacts`}
                  className="text-[11px] font-bold text-orange-600 hover:text-orange-800 whitespace-nowrap"
                >
                  Add Contact
                </Link>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Supply */}
        <SectionCard
          Icon={Hammer} title="5. Supply Side"
          colorClass="text-amber-700" bgClass="bg-amber-50" borderClass="border-amber-100"
          action={
            <Link
              href={`/collector/leads/${lead.id}/edit`}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 transition-colors"
            >
              Edit
            </Link>
          }
        >
          {lead.suppliers.length > 0 ? (
            <div className="space-y-3">
              {lead.suppliers.map((s, i) => (
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
            <div className="bg-white/60 border border-amber-100 rounded-lg px-3 py-2.5 flex items-center justify-between">
              <p className="text-xs text-amber-700">No supply-side contractors recorded.</p>
              <Link
                href={`/collector/leads/${lead.id}/edit`}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-800 whitespace-nowrap"
              >
                Add Now
              </Link>
            </div>
          )}
        </SectionCard>

        {/* Field Notes */}
        <div id="section-notes">
          <SectionCard
            Icon={MessageCircle} title="Field Notes"
            colorClass="text-teal-600" bgClass="bg-teal-50" borderClass="border-teal-100"
            action={<NotesForm leadId={lead.id} existing={lead.initialComment} />}
          >
            {lead.initialComment ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.initialComment}</p>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <p className="text-xs text-amber-700">
                  No field notes added.{' '}
                  <span className="text-amber-600">Please add notes to improve lead quality.</span>
                </p>
              </div>
            )}
          </SectionCard>
        </div>

      </div>
    </div>
  )
}
