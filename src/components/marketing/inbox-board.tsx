'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Phone, MapPin, Bell, BarChart2 } from 'lucide-react'
import {
  startContacting, markNoResponse, markContactEstablished,
  retryContact, parkLeadMarketing, setFollowUpDate,
  qualifyLead, updateMarketingNote, updateSentimentTag,
} from '@/app/actions/marketing'

type LeadContact = { name: string | null; phone: string | null; email: string | null }
type Lead = {
  id: string
  address: string
  status: string
  phase: string | null
  businessName: string | null
  marketingTag: string | null
  retryCount: number
  nextFollowUpDate: Date | null
  marketingNote: string | null
  sentimentTag: string | null
  updatedAt: Date
  createdAt: Date
  contacts: LeadContact[]
}

// "To Contact" column maps to MARKETING_INBOX status
const COLUMNS: {
  status: string
  label: string
  dotCls: string
  headerCls: string
  bodyBg: string
  textCls: string
}[] = [
  {
    status: 'MARKETING_INBOX',
    label: 'To Contact',
    dotCls: 'bg-gray-400',
    headerCls: 'bg-white border-gray-200',
    bodyBg: 'bg-gray-50',
    textCls: 'text-gray-700',
  },
  {
    status: 'CONTACTING',
    label: 'Contacting',
    dotCls: 'bg-blue-500',
    headerCls: 'bg-blue-50 border-blue-200',
    bodyBg: 'bg-blue-50/60',
    textCls: 'text-blue-700',
  },
  {
    status: 'NO_RESPONSE',
    label: 'No Response',
    dotCls: 'bg-amber-400',
    headerCls: 'bg-amber-50 border-amber-200',
    bodyBg: 'bg-amber-50/60',
    textCls: 'text-amber-700',
  },
  {
    status: 'CONTACT_ESTABLISHED',
    label: 'Contact Shared',
    dotCls: 'bg-purple-500',
    headerCls: 'bg-purple-50 border-purple-200',
    bodyBg: 'bg-purple-50/60',
    textCls: 'text-purple-700',
  },
]

// Tab → marketingTag mapping
const TAB_TAG: Record<string, string> = {
  inbox: 'NEW',
  reactivated: 'RE-ACTIVATED',
  error: 'FIXED',
}

function tagStyle(tag: string | null) {
  if (!tag) return 'bg-gray-100 text-gray-500'
  const t = tag.toUpperCase()
  if (t === 'NEW') return 'bg-blue-100 text-blue-700'
  if (t === 'RE-ACTIVATED') return 'bg-emerald-100 text-emerald-700'
  if (t === 'FIXED') return 'bg-orange-100 text-orange-700'
  return 'bg-gray-100 text-gray-600'
}

function relativeTime(date: Date): string {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3_600_000)
  if (h < 1) return '<1h ago'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function LeadCard({
  lead,
  globalIndex,
  onSelect,
  selected,
}: {
  lead: Lead
  globalIndex: number
  onSelect: () => void
  selected: boolean
}) {
  const contact = lead.contacts[0]
  const status = lead.status

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-md ${
        selected
          ? 'border-blue-400 ring-1 ring-blue-300 shadow-md'
          : 'border-gray-100 hover:border-gray-200 shadow-sm'
      }`}
    >
      {/* Tag + dot */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${tagStyle(lead.marketingTag)}`}>
          {lead.marketingTag || 'NEW'}
        </span>
        <span className="w-2 h-2 rounded-full bg-blue-300 shrink-0" />
      </div>

      {/* Address */}
      <p className="text-sm font-bold text-gray-900 leading-snug mb-0.5">{lead.address}</p>

      {/* Contact name */}
      {contact?.name && (
        <p className="text-xs text-gray-500 mb-2 truncate">{contact.name}</p>
      )}

      {/* Meta row */}
      <div className="flex items-end justify-between mt-2">
        <div className="flex flex-col gap-0.5">
          {status === 'MARKETING_INBOX' && (
            <span className="text-[10px] font-semibold text-amber-600">
              SLA: {relativeTime(lead.updatedAt)}
            </span>
          )}
          {status === 'NO_RESPONSE' && lead.retryCount > 0 && (
            <span className="text-[10px] font-semibold text-red-500">
              Retry: {lead.retryCount}/3
            </span>
          )}
          {status === 'CONTACTING' && (
            <span className="text-[10px] text-gray-400">
              last: {relativeTime(lead.updatedAt)}
            </span>
          )}
          {lead.nextFollowUpDate && (
            <span className="text-[10px] font-medium text-purple-600">
              follow-up:{' '}
              {new Date(lead.nextFollowUpDate).toLocaleDateString('en-CA', { weekday: 'short' })}
            </span>
          )}
          {lead.sentimentTag && (
            <span className="text-[10px] font-medium text-emerald-600">{lead.sentimentTag}</span>
          )}
        </div>
        <span className="text-[10px] text-gray-300 font-mono shrink-0">
          #{String(globalIndex + 1).padStart(3, '0')}
        </span>
      </div>
    </div>
  )
}

function DetailPanel({
  lead,
  globalIndex,
  onClose,
}: {
  lead: Lead
  globalIndex: number
  onClose: () => void
}) {
  const [pending, startTrans] = useTransition()
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(lead.marketingNote ?? '')
  const [followUpInput, setFollowUpInput] = useState(
    lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 10) : ''
  )
  const router = useRouter()

  function act(fn: () => Promise<void>) {
    startTrans(async () => {
      await fn()
      router.refresh()
    })
  }

  const contact = lead.contacts[0]
  const status = lead.status

  const btn = (label: string, cls: string, fn: () => Promise<void>) => (
    <button
      disabled={pending}
      onClick={() => act(fn)}
      className={`w-full py-2 text-sm font-bold rounded-lg transition-colors disabled:opacity-40 ${cls}`}
    >
      {pending ? '…' : label}
    </button>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            #{String(globalIndex + 1).padStart(3, '0')}
          </p>
          <h2 className="text-sm font-black text-gray-900 leading-snug">{lead.address}</h2>
          {lead.phase && (
            <p className="text-xs text-gray-400 mt-0.5">Phase {lead.phase}</p>
          )}
          <span className={`inline-block mt-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${tagStyle(lead.marketingTag)}`}>
            {lead.marketingTag || 'NEW'}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0">
          <X size={15} className="text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* Contact */}
          {contact && (
            <section>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Contact</p>
              <div className="space-y-1.5">
                {contact.name && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone size={11} className="text-gray-400 shrink-0" />
                    <span className="font-medium">{contact.name}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={11} className="text-gray-300 shrink-0" />
                    {contact.phone}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="text-gray-300 shrink-0 w-3 text-center">@</span>
                    {contact.email}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Location */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Location</p>
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin size={11} className="text-gray-400 mt-0.5 shrink-0" />
              <span>{lead.address}</span>
            </div>
          </section>

          {/* Sentiment */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Sentiment</p>
            <div className="flex flex-wrap gap-1.5">
              {(['Hot Lead', 'Follow-up', 'Budget Approved'] as const).map((tag) => (
                <button
                  key={tag}
                  disabled={pending}
                  onClick={() =>
                    act(() => updateSentimentTag(lead.id, lead.sentimentTag === tag ? null : tag))
                  }
                  className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors disabled:opacity-50 ${
                    lead.sentimentTag === tag
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* Next Follow-up */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
              Next Follow-up
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
              />
              <button
                disabled={pending || !followUpInput}
                onClick={() => act(() => setFollowUpDate(lead.id, followUpInput))}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Set
              </button>
            </div>
          </section>

          {/* Marketing Note */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Last Conversation
              </p>
              <button
                onClick={() => {
                  setNoteOpen(!noteOpen)
                  setNote(lead.marketingNote ?? '')
                }}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                {noteOpen ? 'Cancel' : lead.marketingNote ? 'Edit' : 'Add note'}
              </button>
            </div>
            {noteOpen ? (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Describe the conversation…"
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
                />
                <button
                  disabled={pending}
                  onClick={() =>
                    act(async () => {
                      await updateMarketingNote(lead.id, note)
                      setNoteOpen(false)
                    })
                  }
                  className="w-full py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {pending ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : lead.marketingNote ? (
              <p className="text-xs text-gray-700 leading-relaxed">{lead.marketingNote}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No notes yet.</p>
            )}
          </section>
        </div>
      </div>

      {/* Action bar */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Actions</p>
        {status === 'MARKETING_INBOX' &&
          btn('Start Contacting', 'bg-blue-600 text-white hover:bg-blue-700', () =>
            startContacting(lead.id)
          )}
        {status === 'CONTACTING' && (
          <>
            {btn('Not Answering', 'bg-amber-100 text-amber-700 hover:bg-amber-200', () =>
              markNoResponse(lead.id)
            )}
            {btn('Contact Established', 'bg-green-600 text-white hover:bg-green-700', () =>
              markContactEstablished(lead.id)
            )}
            {btn('No Need / Park', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () =>
              parkLeadMarketing(lead.id)
            )}
          </>
        )}
        {status === 'NO_RESPONSE' && (
          <>
            {btn('Retry Contact', 'bg-blue-100 text-blue-700 hover:bg-blue-200', () =>
              retryContact(lead.id)
            )}
            {btn('No Need / Park', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () =>
              parkLeadMarketing(lead.id)
            )}
          </>
        )}
        {status === 'CONTACT_ESTABLISHED' &&
          btn(
            'Qualified → Move to Sales',
            'bg-emerald-600 text-white hover:bg-emerald-700',
            () => qualifyLead(lead.id)
          )}
      </div>
    </div>
  )
}

export function InboxBoard({
  tab,
  allLeads,
  newCount,
  reactivatedCount,
  errorCount,
}: {
  tab: string
  allLeads: Lead[]
  newCount: number
  reactivatedCount: number
  errorCount: number
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  // Filter leads by the active tab's marketingTag
  const activeTag = TAB_TAG[tab] ?? 'NEW'
  const filteredLeads = allLeads.filter((l) => l.marketingTag === activeTag)

  const selectedLead = filteredLeads.find((l) => l.id === selectedLeadId) ?? null
  const selectedGlobalIndex = filteredLeads.findIndex((l) => l.id === selectedLeadId)

  const totalVisible = filteredLeads.length

  return (
    <div className="flex gap-5 min-h-0">
      {/* Main area */}
      <div className="flex-1 min-w-0">
        {/* Page heading */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-black text-gray-900">Marketing Inbox</h1>
            <p className="text-xs text-gray-400 mt-0.5">Construction pipeline management</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold border-2 border-blue-500 text-blue-600 rounded-lg">
              <Bell size={14} />
              Inbox
              <span className="w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded flex items-center justify-center">
                {newCount}
              </span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 text-gray-500 rounded-lg cursor-default">
              <BarChart2 size={14} />
              Activity
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {[
            {
              key: 'inbox',
              label: 'Inbox',
              count: newCount,
              activeCls: 'text-blue-600 border-blue-500',
              dotCls: 'bg-blue-500',
            },
            {
              key: 'reactivated',
              label: 'Re-Activated',
              count: reactivatedCount,
              activeCls: 'text-green-600 border-green-500',
              dotCls: 'bg-green-500',
            },
            {
              key: 'error',
              label: 'Returned (Error)',
              count: errorCount,
              activeCls: 'text-red-600 border-red-500',
              dotCls: 'bg-red-500',
            },
          ].map(({ key, label, count, activeCls, dotCls }) => (
            <Link
              key={key}
              href={`/marketing/inbox?tab=${key}`}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === key ? activeCls : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <span
                className={`w-5 h-5 ${dotCls} text-white text-[10px] font-black rounded flex items-center justify-center`}
              >
                {count}
              </span>
              {label}
            </Link>
          ))}
        </div>

        {/* Empty state */}
        {totalVisible === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <p className="text-sm text-gray-400">No leads in this view</p>
          </div>
        )}

        {/* Kanban board */}
        {totalVisible > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {COLUMNS.map((col) => {
              const colLeads = filteredLeads.filter((l) => l.status === col.status)
              return (
                <div key={col.status} className="flex flex-col min-h-[480px]">
                  {/* Column header */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border border-b-0 ${col.headerCls}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${col.dotCls}`} />
                    <span className={`text-xs font-black ${col.textCls}`}>{col.label}</span>
                    <span className="ml-auto text-xs font-bold text-gray-400">{colLeads.length}</span>
                  </div>
                  {/* Column body */}
                  <div
                    className={`flex-1 rounded-b-xl border border-t-0 p-2 space-y-2 ${col.headerCls} ${col.bodyBg}`}
                  >
                    {colLeads.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-xs text-gray-300">No leads</p>
                      </div>
                    ) : (
                      colLeads.map((lead) => {
                        const globalIndex = filteredLeads.findIndex((l) => l.id === lead.id)
                        return (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            globalIndex={globalIndex}
                            onSelect={() =>
                              setSelectedLeadId(selectedLeadId === lead.id ? null : lead.id)
                            }
                            selected={selectedLeadId === lead.id}
                          />
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <div className="w-72 shrink-0 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden flex flex-col">
          <DetailPanel
            lead={selectedLead}
            globalIndex={selectedGlobalIndex >= 0 ? selectedGlobalIndex : 0}
            onClose={() => setSelectedLeadId(null)}
          />
        </div>
      )}
    </div>
  )
}
