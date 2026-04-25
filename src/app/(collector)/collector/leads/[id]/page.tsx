import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import {
  MapPin, Layers, Building, Hammer, MessageCircle,
  Camera, Globe, Star, Users, Phone, Mail,
} from 'lucide-react'

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
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
  RESUBMITTED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
}

function SectionCard({
  Icon,
  title,
  colorClass,
  bgClass,
  borderClass,
  children,
}: {
  Icon: React.ElementType
  title: string
  colorClass: string
  bgClass: string
  borderClass: string
  children: React.ReactNode
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
        {value?.trim() || <span className="text-gray-300 font-normal">—</span>}
      </dd>
    </div>
  )
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireCollectorUser()

  const lead = await prisma.lead.findFirst({
    where: { id, createdById: user.id },
    include: { contacts: true },
  })

  if (!lead) notFound()

  return (
    <div className="max-w-2xl animate-fadeIn">
      {/* Back nav */}
      <Link
        href="/collector/leads"
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold mb-4 transition-colors"
      >
        ← My Leads
      </Link>

      {/* Title + status */}
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

      <div className="space-y-4">
        {/* Photos */}
        <SectionCard
          Icon={Camera}
          title="2. Visual Evidence"
          colorClass="text-gray-500"
          bgClass="bg-gray-50"
          borderClass="border-gray-200"
        >
          <div className="grid grid-cols-4 gap-2">
            {['Site', 'Demand', 'Supply', 'Other'].map((label) => (
              <div
                key={label}
                className="h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold text-gray-300"
              >
                <Camera size={14} className="mb-1 text-gray-200" />
                {label}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Photo upload coming soon.</p>
        </SectionCard>

        {/* Phase */}
        <SectionCard
          Icon={Layers}
          title="Phase Details"
          colorClass="text-indigo-600"
          bgClass="bg-indigo-50"
          borderClass="border-indigo-100"
        >
          <p className="text-sm font-semibold text-gray-800">{lead.phase || <span className="text-gray-300 font-normal">—</span>}</p>
        </SectionCard>

        {/* Demand */}
        <SectionCard
          Icon={Building}
          title="3. Demand Side"
          colorClass="text-blue-700"
          bgClass="bg-blue-50"
          borderClass="border-blue-100"
        >
          <dl className="grid grid-cols-2 gap-4">
            <DataRow label="Business Name" value={lead.businessName} />
            <DataRow label="Rating" value={lead.rating} />
            <DataRow label="Website" value={lead.website} />
            <DataRow label="Office Location" value={lead.officeLocation} />
          </dl>

          {/* Contacts */}
          {lead.contacts.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-blue-500" />
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Personnel In Charge
                </span>
              </div>
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
                        <Phone size={11} className="text-gray-400" />
                        {contact.phone}
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail size={11} className="text-gray-400" />
                        {contact.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Supply / Zone */}
        <SectionCard
          Icon={Hammer}
          title="4. Supply Information"
          colorClass="text-amber-700"
          bgClass="bg-amber-50"
          borderClass="border-amber-100"
        >
          <DataRow label="Zone Name" value={lead.zoneName} />
        </SectionCard>

        {/* Field Notes */}
        {lead.initialComment && (
          <SectionCard
            Icon={MessageCircle}
            title="Field Notes"
            colorClass="text-teal-600"
            bgClass="bg-teal-50"
            borderClass="border-teal-100"
          >
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {lead.initialComment}
            </p>
          </SectionCard>
        )}

        

      </div>
    </div>
  )
}
