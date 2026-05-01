import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { EditLeadForm } from './form'

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireCollectorUser()

  const lead = await prisma.lead.findFirst({
    where: { id, createdById: user.id },
    include: { contacts: true, suppliers: true },
  })

  if (!lead) notFound()

  type PhotosData = { site: string[]; demand: string[]; supply: string[]; other: string[] }
  const initial = {
    businessName: lead.businessName ?? '',
    website: lead.website ?? '',
    officeLocation: lead.officeLocation ?? '',
    rating: lead.rating ?? '',
    zoneName: lead.zoneName ?? '',
    initialComment: lead.initialComment ?? '',
    contacts: lead.contacts.map((c) => ({
      id: c.id,
      name: c.name ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      role: c.role ?? '',
    })),
    suppliers: lead.suppliers.map((s) => ({
      id: s.id,
      trade: s.trade ?? '',
      company: s.company ?? '',
      contact: s.contact ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      website: s.website ?? '',
      officeLocation: s.officeLocation ?? '',
      interaction: s.interaction ?? '',
    })),
    photos: (lead.photos as PhotosData | null) ?? { site: [], demand: [], supply: [], other: [] },
  }

  return (
    <div className="max-w-2xl animate-fadeIn">
      <Link
        href={`/collector/leads/${id}`}
        className="inline-flex items-center text-sm text-gray-400 hover:text-gray-700 font-semibold mb-4 transition-colors"
      >
        ← Back to Lead
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-black text-gray-900 leading-tight">Edit Lead</h1>
        <p className="text-xs text-gray-400 mt-1 truncate">{lead.address}</p>
      </div>

      <EditLeadForm leadId={id} initial={initial} />
    </div>
  )
}
