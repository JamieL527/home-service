export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { CrmContacts } from './crm-contacts'
import { CrmSiteRoles } from './crm-site-roles'

const PAGE_SIZE = 50

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; role?: string; page?: string; sort?: string; dir?: string }>
}) {
  const { tab = 'contacts', search = '', role = '', page = '1', sort = 'createdAt', dir = 'desc' } = await searchParams
  const pageNum = Math.max(1, parseInt(page))
  const skip = (pageNum - 1) * PAGE_SIZE
  const orderDir = dir === 'asc' ? 'asc' : 'desc'

  const validSortFields = ['name', 'company', 'email', 'createdAt']
  const sortField = validSortFields.includes(sort) ? sort : 'createdAt'

  const where = {
    AND: [
      role ? { marketRole: role } : {},
      search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search } },
        ],
      } : {},
    ],
  }

  const [contacts, totalContacts, siteRoles, leads, allContacts] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { [sortField]: orderDir },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
    prisma.siteRole.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.lead.findMany({ select: { id: true, address: true }, orderBy: { createdAt: 'desc' } }),
    prisma.contact.findMany({ select: { id: true, name: true, company: true }, orderBy: { createdAt: 'desc' } }),
  ])

  const contactMap = Object.fromEntries(allContacts.map(c => [c.id, c.name || c.company || c.id]))
  const leadMap = Object.fromEntries(leads.map(l => [l.id, l.address]))
  const siteRolesWithNames = siteRoles.map(sr => ({
    ...sr,
    contactName: contactMap[sr.contactId] ?? sr.contactId,
    leadAddress: leadMap[sr.leadId] ?? sr.leadId,
  }))

  const totalPages = Math.ceil(totalContacts / PAGE_SIZE)

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">CRM</h1>
        <p className="text-sm text-gray-500 mt-0.5">Contacts and site role management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'contacts', label: `Contacts (${totalContacts})` },
          { key: 'site-roles', label: `Site Roles (${siteRoles.length})` },
        ].map(t => (
          <a
            key={t.key}
            href={`/admin/crm?tab=${t.key}`}
            className={[
              'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === 'contacts' && (
        <CrmContacts
          contacts={contacts}
          search={search}
          role={role}
          page={pageNum}
          totalPages={totalPages}
          totalCount={totalContacts}
          sort={sortField}
          dir={orderDir}
        />
      )}
      {tab === 'site-roles' && (
        <CrmSiteRoles
          siteRoles={siteRolesWithNames}
          contacts={allContacts}
          leads={leads}
        />
      )}
    </div>
  )
}
