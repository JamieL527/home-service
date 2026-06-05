export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, MapPin } from 'lucide-react'

const ROLE_BADGE: Record<string, string> = {
  '1': 'bg-blue-50 text-blue-700 border-blue-200',
  '2': 'bg-green-50 text-green-700 border-green-200',
  '3': 'bg-orange-50 text-orange-700 border-orange-200',
}
const ROLE_LABEL: Record<string, string> = { '1': 'Demand', '2': 'Supply', '3': 'Government' }
const SUB_ROLE_LABEL: Record<string, string> = {
  '1.1': 'Builder', '1.2': 'Job-site in charge', '1.3': 'Owner', '1.4': 'Creditor',
  '2.1': 'Contractor', '2.2': 'Subcontractor', '2.3': 'Supplier', '3.1': 'City of Toronto',
}
const SIDE_BADGE: Record<string, string> = {
  '1': 'bg-blue-50 text-blue-700 border-blue-200',
  '2': 'bg-green-50 text-green-700 border-green-200',
  '3': 'bg-orange-50 text-orange-700 border-orange-200',
}
const SIDE_LABEL: Record<string, string> = { '1': 'Demand', '2': 'Supply', '3': 'Government' }

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) notFound()

  const siteRoles = await prisma.siteRole.findMany({
    where: { contactId: id },
    orderBy: { createdAt: 'desc' },
  })

  const leadIds = siteRoles.map(sr => sr.leadId)
  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, address: true, phase: true, status: true },
  })
  const leadMap = Object.fromEntries(leads.map(l => [l.id, l]))

  return (
    <div className="animate-fadeIn max-w-3xl">
      <Link href="/admin/crm" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold mb-6 transition-colors">
        <ArrowLeft size={14} className="mr-1" /> Back to CRM
      </Link>

      {/* Contact header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {contact.name && <h1 className="text-xl font-black text-gray-900">{contact.name}</h1>}
            {contact.company && <p className={contact.name ? 'text-gray-500 mt-0.5' : 'text-xl font-black text-gray-900'}>{contact.company}</p>}
            {contact.marketRole && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${ROLE_BADGE[contact.marketRole] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {ROLE_LABEL[contact.marketRole] ?? contact.marketRole}
                </span>
                {contact.subRole && (
                  <span className="text-xs text-gray-500">{SUB_ROLE_LABEL[contact.subRole] ?? contact.subRole}</span>
                )}
                {contact.trade && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{contact.trade}</span>
                )}
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium bg-gray-100 text-gray-500 rounded px-2 py-1 shrink-0">{contact.sourceTable ?? 'manual'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Mail size={14} className="text-gray-400" />{contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Phone size={14} className="text-gray-400" />{contact.phone}
            </a>
          )}
          {contact.website && (
            <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
              <Globe size={14} className="text-gray-400" />{contact.website}
            </a>
          )}
          {contact.hqAddress && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={14} className="text-gray-400" />{contact.hqAddress}
            </div>
          )}
        </div>
      </div>

      {/* Site Roles */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">
          Site Roles <span className="text-gray-400 font-normal text-sm">({siteRoles.length})</span>
        </h2>

        {siteRoles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            No site roles found for this contact.
          </div>
        ) : (
          <div className="space-y-3">
            {siteRoles.map(sr => {
              const lead = leadMap[sr.leadId]
              return (
                <div key={sr.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${SIDE_BADGE[sr.sideOnThisSite] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {SIDE_LABEL[sr.sideOnThisSite] ?? sr.sideOnThisSite}
                        </span>
                        {sr.isDealer && <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-1.5 py-0.5">Dealer</span>}
                        {sr.isGatekeeper && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">Gatekeeper</span>}
                      </div>
                      {lead ? (
                        <Link href={`/admin/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {lead.address}
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-500">{sr.leadId}</p>
                      )}
                      {lead?.phase && <p className="text-xs text-gray-400 mt-0.5">{lead.phase} · {lead.status}</p>}
                      {sr.interactionType && <p className="text-xs text-gray-500 mt-1">Interaction: {sr.interactionType}</p>}
                      {sr.notes && <p className="text-xs text-gray-500 mt-1">{sr.notes}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
