'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { createSiteRole, updateSiteRole, deleteSiteRole } from '@/app/actions/crm'

type SiteRoleRow = {
  id: string
  leadId: string
  contactId: string
  sideOnThisSite: string
  isDealer: boolean
  isGatekeeper: boolean
  interactionType: string | null
  notes: string | null
  contactName: string
  leadAddress: string
}

type ContactOption = { id: string; name: string | null; company: string | null }
type LeadOption = { id: string; address: string }

const SIDE_BADGE: Record<string, string> = {
  '1': 'bg-blue-50 text-blue-700 border-blue-200',
  '2': 'bg-green-50 text-green-700 border-green-200',
  '3': 'bg-orange-50 text-orange-700 border-orange-200',
}
const SIDE_LABEL: Record<string, string> = { '1': 'Demand', '2': 'Supply', '3': 'Government' }

function SiteRoleModal({
  siteRole,
  contacts,
  leads,
  onClose,
}: {
  siteRole?: SiteRoleRow
  contacts: ContactOption[]
  leads: LeadOption[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      if (siteRole) await updateSiteRole(siteRole.id, formData)
      else await createSiteRole(formData)
      onClose()
    })
  }

  const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30'
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{siteRole ? 'Edit Site Role' : 'Add Site Role'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!siteRole && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Contact</label>
                <select name="contactId" required className={selectCls}>
                  <option value="">— Select contact —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name || c.company || c.id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Lead / Site</label>
                <select name="leadId" required className={selectCls}>
                  <option value="">— Select site —</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.address}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Side on this site</label>
            <select name="sideOnThisSite" defaultValue={siteRole?.sideOnThisSite ?? ''} required className={selectCls}>
              <option value="">— Select —</option>
              <option value="1">1 — Demand</option>
              <option value="2">2 — Supply</option>
              <option value="3">3 — Government</option>
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name="isDealer" value="true" defaultChecked={siteRole?.isDealer} className="rounded" />
              Dealer / Authorized signer
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name="isGatekeeper" value="true" defaultChecked={siteRole?.isGatekeeper} className="rounded" />
              Gatekeeper
            </label>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Interaction Type</label>
            <input name="interactionType" defaultValue={siteRole?.interactionType ?? ''} className={inputCls} placeholder="e.g. meeting, call..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Notes</label>
            <textarea name="notes" defaultValue={siteRole?.notes ?? ''} className={inputCls} rows={3} placeholder="Notes..." />
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

function ContactGroup({
  contactId,
  contactName,
  rows,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
  deleting,
  isPending,
}: {
  contactId: string
  contactName: string
  rows: SiteRoleRow[]
  onEdit: (sr: SiteRoleRow) => void
  onRequestDelete: (id: string) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  deleting: string | null
  isPending: boolean
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Contact header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
          <Link
            href={`/admin/crm/${contactId}`}
            onClick={e => e.stopPropagation()}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {contactName}
          </Link>
          <span className="text-xs text-gray-400">{rows.length} site{rows.length !== 1 ? 's' : ''}</span>
        </div>
      </button>

      {/* Site roles */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {rows.map(sr => (
            <div key={sr.id} className="px-4 py-3 flex items-start justify-between gap-3 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{sr.leadAddress}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${SIDE_BADGE[sr.sideOnThisSite] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {SIDE_LABEL[sr.sideOnThisSite] ?? sr.sideOnThisSite}
                  </span>
                  {sr.isDealer && <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-1.5 py-0.5">Dealer</span>}
                  {sr.isGatekeeper && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-1.5 py-0.5">Gatekeeper</span>}
                  {sr.interactionType && <span className="text-[10px] text-gray-500">{sr.interactionType}</span>}
                </div>
                {sr.notes && <p className="text-xs text-gray-400 mt-1 truncate">{sr.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEdit(sr)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                  <Pencil size={13} />
                </button>
                {deleting === sr.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => onConfirmDelete(sr.id)} disabled={isPending} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold">
                      {isPending ? '...' : 'Confirm'}
                    </button>
                    <button onClick={onCancelDelete} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={13} /></button>
                  </div>
                ) : (
                  <button onClick={() => onRequestDelete(sr.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CrmSiteRoles({ siteRoles, contacts, leads }: {
  siteRoles: SiteRoleRow[]
  contacts: ContactOption[]
  leads: LeadOption[]
}) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SiteRoleRow | undefined>()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirmDelete(id: string) {
    startTransition(async () => {
      await deleteSiteRole(id)
      setDeleting(null)
    })
  }

  // Group by contact
  const grouped = siteRoles.reduce<Record<string, { contactName: string; rows: SiteRoleRow[] }>>(
    (acc, sr) => {
      if (!acc[sr.contactId]) acc[sr.contactId] = { contactName: sr.contactName, rows: [] }
      acc[sr.contactId].rows.push(sr)
      return acc
    },
    {}
  )

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} /> Add Site Role
        </button>
      </div>

      {siteRoles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No site roles found.
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([contactId, { contactName, rows }]) => (
            <ContactGroup
              key={contactId}
              contactId={contactId}
              contactName={contactName}
              rows={rows}
              onEdit={sr => { setEditing(sr); setShowModal(true) }}
              onRequestDelete={id => setDeleting(id)}
              onConfirmDelete={handleConfirmDelete}
              onCancelDelete={() => setDeleting(null)}
              deleting={deleting}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {showModal && (
        <SiteRoleModal
          siteRole={editing}
          contacts={contacts}
          leads={leads}
          onClose={() => { setShowModal(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
