import Link from 'next/link'
import {
  MapPin, Building, Hammer, MessageCircle,
  Users, Phone, Mail, Camera, Database,
} from 'lucide-react'
import { PhotoGrid, type PhotoItem } from '@/components/ui/photo-grid'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  QUALIFIED: 'Qualified', NEEDS_FIX: 'Needs Fix', RESUBMITTED: 'Resubmitted',
  REJECTED: 'Rejected', CONVERTED: 'Converted', NEW_LEAD: 'New Lead',
  BACKED: 'Backed', URGENT: 'Urgent', PARKED: 'Parked', SCHEDULED: 'Scheduled',
  INJECTED: 'Injected', MARKETING_INBOX: 'Marketing Inbox',
  TO_CONTACT: 'To Contact', CONTACTING: 'Contacting',
  NO_RESPONSE: 'No Response', CONTACT_ESTABLISHED: 'Contact Established',
  JOB_ACTIVE: 'Job Active',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
  RESUBMITTED: 'bg-blue-100 text-blue-700',
  NEW_LEAD: 'bg-sky-100 text-sky-700',
  BACKED: 'bg-indigo-100 text-indigo-700',
  URGENT: 'bg-red-100 text-red-700',
  PARKED: 'bg-gray-100 text-gray-500',
  MARKETING_INBOX: 'bg-purple-100 text-purple-700',
  TO_CONTACT: 'bg-blue-100 text-blue-700',
  CONTACTING: 'bg-sky-100 text-sky-700',
  NO_RESPONSE: 'bg-orange-100 text-orange-700',
  CONTACT_ESTABLISHED: 'bg-green-100 text-green-700',
  JOB_ACTIVE: 'bg-purple-100 text-purple-700',
}

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0: Survey', P1: 'Phase 1: Foundation', P2: 'Phase 2: Framing',
  P3: 'Phase 3: MEC/Drywall', P4: 'Phase 4: Finishing', P5: 'Phase 5: Landscaping',
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
  return <p className="text-xs text-gray-400 italic">{text}</p>
}

type CityData = {
  permitNum?: string | null; permitType?: string | null; permitStatus?: string | null
  applicationDate?: string | null; estConstructionCost?: string | null
  description?: string | null; builderName?: string | null
  [key: string]: unknown
}

type PhotosData = {
  site?: string[]; demand?: string[]; supply?: string[]; other?: string[]
  [key: string]: unknown
}

export type LeadForDetail = {
  id: string
  address: string
  status: string
  phase: string | null
  zoneName: string | null
  lat: number | null
  lng: number | null
  businessName: string | null
  rating: string | null
  website: string | null
  officeLocation: string | null
  initialComment: string | null
  marketingNote: string | null
  cityData: unknown
  photos: unknown
  createdAt: Date
  contacts: Array<{
    id: string; name: string | null; role: string | null
    phone: string | null; email: string | null
  }>
  suppliers: Array<{
    id: string; trade: string | null; company: string | null; interaction: string | null
    contact: string | null; phone: string | null; email: string | null
    website: string | null; officeLocation: string | null
  }>
}

export function LeadDetailView({
  lead,
  backHref,
  backLabel,
  showMarketingNotes = true,
}: {
  lead: LeadForDetail
  backHref: string
  backLabel: string
  showMarketingNotes?: boolean
}) {
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
        href={backHref}
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold mb-4 transition-colors"
      >
        {backLabel}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">{lead.address}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Created {lead.createdAt.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {STATUS_LABELS[lead.status] ?? lead.status}
        </span>
      </div>

      <div className="space-y-4">

        <SectionCard Icon={MapPin} title="1. Location" colorClass="text-gray-600" bgClass="bg-gray-50" borderClass="border-gray-200">
          <dl className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <DataRow label="Address" value={lead.address} />
            </div>
            <DataRow label="Phase" value={lead.phase ? (PHASE_LABELS[lead.phase] ?? lead.phase) : null} />
            <DataRow label="Zone Name" value={lead.zoneName} />
            {lead.lat && lead.lng && (
              <>
                <DataRow label="Latitude" value={String(lead.lat.toFixed(6))} />
                <DataRow label="Longitude" value={String(lead.lng.toFixed(6))} />
              </>
            )}
          </dl>
        </SectionCard>

        <SectionCard Icon={Database} title="2. City Data" colorClass="text-purple-700" bgClass="bg-purple-50" borderClass="border-purple-100">
          {cityData ? (
            <dl className="grid grid-cols-2 gap-4">
              <DataRow label="Permit Number" value={cityData.permitNum} />
              <DataRow label="Permit Type" value={cityData.permitType} />
              <DataRow label="Permit Status" value={cityData.permitStatus} />
              <DataRow label="Application Date" value={cityData.applicationDate} />
              <div className="col-span-2"><DataRow label="Est. Construction Cost" value={cityData.estConstructionCost} /></div>
              <div className="col-span-2"><DataRow label="Description" value={cityData.description} /></div>
              <div className="col-span-2"><DataRow label="Builder Name" value={cityData.builderName} /></div>
            </dl>
          ) : (
            <EmptyState text="No city data available." />
          )}
        </SectionCard>

        <SectionCard Icon={Building} title="3. Demand Side" colorClass="text-blue-700" bgClass="bg-blue-50" borderClass="border-blue-100">
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
            <EmptyState text="No contact information recorded." />
          )}
        </SectionCard>

        <SectionCard Icon={Hammer} title="4. Supply Side" colorClass="text-amber-700" bgClass="bg-amber-50" borderClass="border-amber-100">
          {lead.suppliers.length > 0 ? (
            <div className="space-y-3">
              {lead.suppliers.map((s) => (
                <div key={s.id} className="bg-white rounded-lg border border-amber-200 p-3">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-gray-800">{s.trade ? `${s.trade}: ` : ''}{s.company || '—'}</p>
                    {s.interaction && (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide ml-2 shrink-0">{s.interaction}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {s.contact && <p className="text-xs text-gray-600 font-medium">{s.contact}</p>}
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
                    {s.website && <p className="text-xs text-gray-500 truncate">{s.website}</p>}
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

        <SectionCard Icon={Camera} title="5. Visual Evidence" colorClass="text-gray-500" bgClass="bg-gray-50" borderClass="border-gray-200">
          {(() => {
            const flat: PhotoItem[] = photoCategories.flatMap(({ key, label }) =>
              ((photosData?.[key] as string[] | undefined) ?? []).map((url) => ({ url, label }))
            )
            return <PhotoGrid photos={flat} columns={4} emptyText="No photos uploaded." />
          })()}
        </SectionCard>

        <SectionCard Icon={MessageCircle} title="6. Field Notes" colorClass="text-teal-600" bgClass="bg-teal-50" borderClass="border-teal-100">
          {lead.initialComment?.trim() ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.initialComment}</p>
          ) : (
            <EmptyState text="No field notes recorded." />
          )}
        </SectionCard>

        {showMarketingNotes && (
          <SectionCard Icon={MessageCircle} title="7. Marketing Notes" colorClass="text-blue-600" bgClass="bg-blue-50" borderClass="border-blue-100">
            {lead.marketingNote?.trim() ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{lead.marketingNote}</p>
            ) : (
              <EmptyState text="No marketing notes recorded." />
            )}
          </SectionCard>
        )}

      </div>
    </div>
  )
}
