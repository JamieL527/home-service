'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { moveDealToNextStage } from '@/app/actions/sales'

const STAGES = [
  { key: 'NEW_OPPORTUNITY', label: 'New Opportunity', color: 'bg-slate-100 border-slate-300' },
  { key: 'DISCOVERY', label: 'Discovery', color: 'bg-blue-50 border-blue-200' },
  { key: 'ESTIMATION', label: 'Estimation', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'QUOTE_SENT', label: 'Quote Sent', color: 'bg-orange-50 border-orange-200' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-50 border-purple-200' },
]

type Deal = {
  id: string
  projectName: string | null
  clientName: string | null
  projectType: string | null
  phase: string | null
  estimatedValue: number | null
  currentStage: string
  lead: { address: string; phase: string | null }
  quotes: { total: number | null; status: string }[]
}

function DealCard({ deal, basePath }: { deal: Deal; basePath: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const stageIdx = STAGES.findIndex(s => s.key === deal.currentStage)
  const hasNext = stageIdx !== -1 && stageIdx < STAGES.length - 1
  const latestQuote = deal.quotes[0]

  function advance() {
    startTransition(async () => {
      await moveDealToNextStage(deal.id)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {deal.projectName || deal.lead.address}
          </p>
          {deal.clientName && (
            <p className="text-xs text-gray-500 truncate">{deal.clientName}</p>
          )}
        </div>
        {deal.phase && (
          <span className="shrink-0 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
            {deal.phase}
          </span>
        )}
      </div>

      {deal.estimatedValue != null && (
        <p className="text-xs text-green-700 font-medium">
          ${deal.estimatedValue.toLocaleString()}
        </p>
      )}

      {latestQuote?.total != null && (
        <p className="text-xs text-gray-500">
          Quote: ${latestQuote.total.toLocaleString()}
          {latestQuote.status === 'accepted' && (
            <span className="ml-1 text-green-600 font-semibold">✓ Accepted</span>
          )}
        </p>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <Link
          href={`${basePath}/deals/${deal.id}`}
          className="text-[11px] font-semibold px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Open
        </Link>
        {hasNext && (
          <button
            disabled={pending}
            onClick={advance}
            className="text-[11px] font-semibold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            → Next Stage
          </button>
        )}
      </div>
    </div>
  )
}

export function PipelineBoard({ deals, basePath = '/sales' }: { deals: Deal[]; basePath?: string }) {
  const byStage = Object.fromEntries(STAGES.map(s => [s.key, [] as Deal[]]))
  for (const deal of deals) {
    if (byStage[deal.currentStage]) {
      byStage[deal.currentStage].push(deal)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <span className="text-sm text-gray-500">{deals.length} active deal{deals.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-4">
        {STAGES.map(stage => {
          const stageDeals = byStage[stage.key]
          return (
            <div key={stage.key} className="min-w-0 sm:flex-none sm:w-64">
              <div className={`rounded-t-lg border-t border-x px-3 py-2 flex items-center justify-between ${stage.color}`}>
                <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                <span className="text-xs font-bold text-gray-500 bg-white rounded-full px-2 py-0.5">
                  {stageDeals.length}
                </span>
              </div>
              <div className={`min-h-48 rounded-b-lg border border-t-0 p-2 space-y-2 ${stage.color}`}>
                {stageDeals.map(deal => (
                  <DealCard key={deal.id} deal={deal} basePath={basePath} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
