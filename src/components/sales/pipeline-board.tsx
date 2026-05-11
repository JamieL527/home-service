'use client'

import { useState } from 'react'
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
  status: string
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
        {deal.lead.phase && (
          <span className="shrink-0 text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
            {deal.lead.phase}
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

const STATUS_TABS = [
  { key: 'active', label: 'Active' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]

export function PipelineBoard({ deals, basePath = '/sales' }: { deals: Deal[]; basePath?: string }) {
  const [statusFilter, setStatusFilter] = useState('active')
  const [phaseFilter, setPhaseFilter] = useState('')

  const phases = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']

  const filtered = deals.filter(d => {
    if (d.status !== statusFilter) return false
    if (phaseFilter && d.lead.phase !== phaseFilter) return false
    return true
  })

  const byStage = Object.fromEntries(STAGES.map(s => [s.key, [] as Deal[]]))
  for (const deal of filtered) {
    if (byStage[deal.currentStage]) byStage[deal.currentStage].push(deal)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <span className="text-sm text-gray-500">{filtered.length} deal{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                statusFilter === tab.key
                  ? tab.key === 'won'
                    ? 'bg-green-600 text-white'
                    : tab.key === 'lost'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-70">
                ({deals.filter(d => d.status === tab.key && (!phaseFilter || d.lead.phase === phaseFilter)).length})
              </span>
            </button>
          ))}
        </div>

        {/* Phase filter */}
        {phases.length > 0 && (
          <select
            value={phaseFilter}
            onChange={e => setPhaseFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">All Phases</option>
            {phases.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        {phaseFilter && (
          <button
            onClick={() => setPhaseFilter('')}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Kanban (active only) */}
      {statusFilter === 'active' && (
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
      )}

      {/* Won / Lost list */}
      {statusFilter !== 'active' && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No {statusFilter} deals.</p>
          ) : (
            filtered.map(deal => (
              <div key={deal.id} className={`flex items-center justify-between bg-white rounded-lg border px-4 py-3 ${
                deal.status === 'won' ? 'border-green-200' : 'border-red-200'
              }`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {deal.projectName || deal.lead.address}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {deal.lead.phase && (
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                        {deal.lead.phase}
                      </span>
                    )}
                    {deal.clientName && (
                      <span className="text-xs text-gray-500">{deal.clientName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {deal.quotes[0]?.total != null && (
                    <span className="text-sm font-bold text-gray-700">
                      ${deal.quotes[0].total.toLocaleString()}
                    </span>
                  )}
                  <Link
                    href={`${basePath}/deals/${deal.id}`}
                    className="text-[11px] font-semibold px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
