import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SendOfferButton } from './send-offer-button'
import { ArrowLeft, MapPin, Wrench, CheckCircle } from 'lucide-react'

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS',
}

function extractCity(address: string): string {
  const parts = address.split(',')
  return parts.length >= 2 ? parts[parts.length - 2].trim().toLowerCase() : ''
}

export default async function ContractorMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      lead: { select: { address: true, phase: true } },
      offers: { select: { companyId: true, status: true } },
    },
  })

  if (!job) notFound()
  if ((job.status as string) !== 'READY') {
    return (
      <div className="animate-fadeIn max-w-2xl">
        <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5 transition-colors">
          <ArrowLeft size={13} /> Back to Jobs
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-amber-700">This job is not in READY status.</p>
          <p className="text-xs text-amber-500 mt-1">Fill in job details first before finding a contractor.</p>
        </div>
      </div>
    )
  }

  // pending = offer still outstanding; rejected = contractor declined
  const pendingOfferCompanies = new Set(
    job.offers.filter((o) => o.status === 'pending').map((o) => o.companyId)
  )
  const rejectedOfferCompanies = new Set(
    job.offers.filter((o) => o.status === 'rejected').map((o) => o.companyId)
  )
  const jobCity = extractCity(job.lead.address)

  const companies = await prisma.contractorCompany.findMany({
    where: { status: 'ACTIVE' as never },
    orderBy: { createdAt: 'asc' },
  })

  const jobContractorType = job.contractorType

  function score(c: (typeof companies)[0]): number {
    let s = 0
    if (c.address && jobCity && c.address.toLowerCase().includes(jobCity)) s += 2
    if (jobContractorType && c.tradeType && c.tradeType.toLowerCase().includes(jobContractorType.toLowerCase())) s += 1
    return s
  }

  const sorted = [...companies].sort((a, b) => score(b) - score(a))

  const phase = job.phase ?? job.lead.phase

  return (
    <div className="animate-fadeIn max-w-2xl">
      <Link href="/admin/jobs" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5 transition-colors">
        <ArrowLeft size={13} /> Back to Jobs
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900">Find Contractor</h1>
        <p className="text-sm text-gray-500 mt-0.5">{job.lead.address}</p>
        {phase && <p className="text-xs text-gray-400 mt-0.5">{PHASE_LABELS[phase] ?? phase}</p>}
        {job.contractorType && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
            <Wrench size={11} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700">Looking for: {job.contractorType}</span>
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-sm text-gray-400">No active contractors found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((company) => {
            const s = score(company)
            const isPending  = pendingOfferCompanies.has(company.id)
            const isDeclined = rejectedOfferCompanies.has(company.id)
            return (
              <div key={company.id} className={`bg-white border rounded-2xl p-5 shadow-sm flex items-start gap-4 ${
                isDeclined ? 'border-red-100 opacity-70' :
                isPending  ? 'border-gray-200' :
                s >= 3     ? 'border-green-200' :
                s === 2    ? 'border-green-200' :
                s === 1    ? 'border-blue-100' : 'border-gray-100'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-black text-gray-900">{company.name}</p>
                    {isDeclined && (
                      <span className="text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 rounded-full px-2 py-0.5">
                        Declined
                      </span>
                    )}
                    {!isPending && !isDeclined && s >= 3 && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <CheckCircle size={9} /> Best Match
                      </span>
                    )}
                    {!isPending && !isDeclined && s === 2 && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                        <CheckCircle size={9} /> Location Match
                      </span>
                    )}
                    {!isPending && !isDeclined && s === 1 && (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                        Trade Match
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1">
                    {company.tradeType && (
                      <span className="flex items-center gap-1">
                        <Wrench size={10} className="text-gray-400" />
                        {company.tradeType}
                      </span>
                    )}
                    {company.address && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} className="text-gray-400" />
                        {company.address}
                      </span>
                    )}
                    {company.contactName && (
                      <span className="font-medium text-gray-600">{company.contactName}</span>
                    )}
                    {company.contactPhone && (
                      <span>{company.contactPhone}</span>
                    )}
                    {company.contactEmail && (
                      <span>{company.contactEmail}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  {isPending ? (
                    <span className="px-3 py-1.5 text-[11px] font-bold bg-gray-100 text-gray-400 rounded-lg">
                      Offer Sent
                    </span>
                  ) : (
                    <SendOfferButton jobId={job.id} companyId={company.id} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
