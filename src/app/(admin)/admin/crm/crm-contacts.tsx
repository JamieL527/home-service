'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Check, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { createContact, updateContact, deleteContact } from '@/app/actions/crm'

const MARKET_ROLE_OPTIONS = [
  { value: '1', label: '1 — Demand' },
  { value: '2', label: '2 — Supply' },
  { value: '3', label: '3 — Government' },
]

const SUB_ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  '1': [
    { value: '1.1', label: '1.1 — Builder' },
    { value: '1.2', label: '1.2 — Job-site in charge' },
    { value: '1.3', label: '1.3 — Owner' },
    { value: '1.4', label: '1.4 — Creditor' },
  ],
  '2': [
    { value: '2.1', label: '2.1 — Contractor' },
    { value: '2.2', label: '2.2 — Subcontractor' },
    { value: '2.3', label: '2.3 — Supplier' },
  ],
  '3': [
    { value: '3.1', label: '3.1 — City of Toronto' },
  ],
}

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

type Contact = {
  id: string
  name: string | null
  company: string | null
  phone: string | null
  email: string | null
  website: string | null
  hqAddress: string | null
  marketRole: string | null
  subRole: string | null
  trade: string | null
  sourceTable: string | null
}

function ContactModal({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [marketRole, setMarketRole] = useState(contact?.marketRole ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      if (contact) await updateContact(contact.id, formData)
      else await createContact(formData)
      onClose()
    })
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Name</label>
              <input name="name" defaultValue={contact?.name ?? ''} className={inputCls} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Company</label>
              <input name="company" defaultValue={contact?.company ?? ''} className={inputCls} placeholder="Company name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone</label>
              <input name="phone" defaultValue={contact?.phone ?? ''} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
              <input name="email" defaultValue={contact?.email ?? ''} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Website</label>
            <input name="website" defaultValue={contact?.website ?? ''} className={inputCls} placeholder="https://" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">HQ Address</label>
            <input name="hqAddress" defaultValue={contact?.hqAddress ?? ''} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Market Role</label>
              <select name="marketRole" value={marketRole} onChange={e => setMarketRole(e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {MARKET_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Sub Role</label>
              <select name="subRole" defaultValue={contact?.subRole ?? ''} className={inputCls}>
                <option value="">— Select —</option>
                {(SUB_ROLE_OPTIONS[marketRole] ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Trade</label>
            <input name="trade" defaultValue={contact?.trade ?? ''} className={inputCls} placeholder="e.g. drywall, framing..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
              <Check size={14} />{isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SortIcon({ field, current, dir }: { field: string; current: string; dir: string }) {
  if (field !== current) return <ChevronDown size={12} className="text-gray-300" />
  return dir === 'asc' ? <ChevronUp size={12} className="text-blue-600" /> : <ChevronDown size={12} className="text-blue-600" />
}

export function CrmContacts({ contacts, search, role, page, totalPages, totalCount, sort, dir }: {
  contacts: Contact[]
  search: string
  role: string
  page: number
  totalPages: number
  totalCount: number
  sort: string
  dir: string
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Contact | undefined>()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams({ tab: 'contacts', search, role, page: String(page), sort, dir })
    Object.entries(overrides).forEach(([k, v]) => params.set(k, v))
    return `/admin/crm?${params.toString()}`
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    router.push(buildUrl({ search: e.target.value, page: '1' }))
  }

  function handleSort(field: string) {
    const newDir = sort === field && dir === 'asc' ? 'desc' : 'asc'
    router.push(buildUrl({ sort: field, dir: newDir, page: '1' }))
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContact(id)
      setDeleting(null)
    })
  }

const thCls = 'px-4 py-3 text-xs font-semibold text-gray-500 text-left cursor-pointer hover:text-gray-700 select-none'

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          defaultValue={search}
          onChange={handleSearch}
          placeholder="Search name, company, email, phone..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <select
          value={role}
          onChange={e => router.push(buildUrl({ role: e.target.value, page: '1' }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="1">1 — Demand</option>
          <option value="2">2 — Supply</option>
          <option value="3">3 — Government</option>
        </select>
<button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">{totalCount} contacts{search || role ? ' (filtered)' : ''} — page {page} of {totalPages}</p>

      {/* Mobile card list */}
      <div className="sm:hidden bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {contacts.length === 0 ? (
          <p className="py-12 text-center text-gray-400 text-sm">No contacts found.</p>
        ) : contacts.map(c => (
          <div key={c.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <Link href={`/admin/crm/${c.id}`} className="hover:text-blue-600 transition-colors">
                {c.name && <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>}
                {c.company && <p className={c.name ? 'text-xs text-gray-500 truncate' : 'text-sm font-medium text-gray-900 truncate'}>{c.company}</p>}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {c.marketRole && (
                  <span className={`text-[11px] font-bold border rounded-full px-1.5 py-0.5 ${ROLE_BADGE[c.marketRole] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {ROLE_LABEL[c.marketRole] ?? c.marketRole}
                  </span>
                )}
                {c.subRole && <span className="text-[11px] text-gray-500">{SUB_ROLE_LABEL[c.subRole] ?? c.subRole}</span>}
                {c.trade && <span className="text-[11px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{c.trade}</span>}
              </div>
              {c.email && <p className="text-xs text-gray-500 mt-1 truncate">{c.email}</p>}
              {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => { setEditing(c); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                <Pencil size={13} />
              </button>
              {deleting === c.id ? (
                <>
                  <button onClick={() => handleDelete(c.id)} disabled={isPending} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold">
                    {isPending ? '...' : 'Confirm'}
                  </button>
                  <button onClick={() => setDeleting(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={13} /></button>
                </>
              ) : (
                <button onClick={() => setDeleting(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {contacts.length === 0 ? (
          <p className="py-12 text-center text-gray-400 text-sm">No contacts found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={thCls} onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">Name / Company <SortIcon field="name" current={sort} dir={dir} /></span>
                </th>
                <th className={thCls} onClick={() => handleSort('email')}>
                  <span className="flex items-center gap-1">Contact <SortIcon field="email" current={sort} dir={dir} /></span>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">Trade</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">Source</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/${c.id}`} className="hover:text-blue-600 transition-colors">
                      {c.name && <p className="font-medium text-gray-900">{c.name}</p>}
                      {c.company && <p className={c.name ? 'text-xs text-gray-500' : 'font-medium text-gray-900'}>{c.company}</p>}
                      {!c.name && !c.company && <span className="text-gray-400">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.email && <p className="text-gray-600">{c.email}</p>}
                    {c.phone && <p className="text-gray-500 text-xs">{c.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {c.marketRole && (
                      <div className="space-y-1">
                        <span className={`inline-block text-[10px] font-bold border rounded-full px-2 py-0.5 ${ROLE_BADGE[c.marketRole] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {ROLE_LABEL[c.marketRole] ?? c.marketRole}
                        </span>
                        {c.subRole && <p className="text-xs text-gray-500">{SUB_ROLE_LABEL[c.subRole] ?? c.subRole}</p>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.trade || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{c.sourceTable ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(c); setShowModal(true) }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      {deleting === c.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(c.id)} disabled={isPending} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold">
                            {isPending ? '...' : 'Confirm'}
                          </button>
                          <button onClick={() => setDeleting(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleting(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <a
            href={page > 1 ? buildUrl({ page: String(page - 1) }) : '#'}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${page <= 1 ? 'text-gray-300 border-gray-100 pointer-events-none' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Previous
          </a>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <a
            href={page < totalPages ? buildUrl({ page: String(page + 1) }) : '#'}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${page >= totalPages ? 'text-gray-300 border-gray-100 pointer-events-none' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            Next
          </a>
        </div>
      )}

      {showModal && (
        <ContactModal contact={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />
      )}
    </div>
  )
}
