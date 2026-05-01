'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveContractor, rejectContractor, requestMoreInfo, deleteContractor } from '@/app/actions/admin'

type Company = {
  id: string
  name: string
  status: string
  businessNumber: string | null
  address: string | null
  website: string | null
  tradeType: string | null
  wsibNumber: string | null
  insuranceNumber: string | null
  contactName: string | null
  contactTitle: string | null
  contactEmail: string | null
  contactPhone: string | null
  adminNote: string | null
  userEmail: string | null
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-32 shrink-0 text-gray-400">{label}</span>
      <span className="text-gray-800 break-all">{value}</span>
    </div>
  )
}

export function ContractorReviewModal({ company }: { company: Company }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'profile' | 'reject' | 'moreinfo' | 'delete'>('profile')
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const canAct = company.status === 'PENDING_APPROVAL' || company.status === 'ACTION_REQUIRED'

  function close() {
    setOpen(false)
    setView('profile')
    setNote('')
  }

  function handleApprove() {
    startTransition(async () => {
      await approveContractor(company.id)
      close()
      router.refresh()
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectContractor(company.id, note)
      close()
      router.refresh()
    })
  }

  function handleMoreInfo() {
    startTransition(async () => {
      await requestMoreInfo(company.id, note)
      close()
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteContractor(company.id)
      close()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          canAct
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {canAct ? 'Review' : 'View'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{company.tradeType || 'Contractor'}</span>
                  {company.status === 'ACTION_REQUIRED' && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Action Required
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={close}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {view === 'profile' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Business</p>
                    <InfoRow label="Registered Name" value={company.name} />
                    <InfoRow label="Business Number" value={company.businessNumber} />
                    <InfoRow label="Trade / Service" value={company.tradeType} />
                    <InfoRow label="Address" value={company.address} />
                    <InfoRow label="Website" value={company.website} />
                    <InfoRow label="Account Email" value={company.userEmail} />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Person in Charge</p>
                    <InfoRow label="Name" value={company.contactName} />
                    <InfoRow label="Title" value={company.contactTitle} />
                    <InfoRow label="Email" value={company.contactEmail} />
                    <InfoRow label="Phone" value={company.contactPhone} />
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Insurance & Compliance</p>
                    <InfoRow label="WSIB Number" value={company.wsibNumber} />
                    <InfoRow label="Insurance Number" value={company.insuranceNumber} />
                  </div>
                  {company.adminNote && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Admin Note</p>
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{company.adminNote}</p>
                    </div>
                  )}
                </div>
              )}

              {view === 'reject' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Provide a reason for rejection. This will be saved as an admin note.</p>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Rejection reason (optional)..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('profile')}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={pending}
                      onClick={handleReject}
                      className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40"
                    >
                      {pending ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}

              {view === 'moreinfo' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Describe what additional information or corrections are needed.</p>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="What information is needed..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('profile')}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      ← Back
                    </button>
                    <button
                      disabled={pending}
                      onClick={handleMoreInfo}
                      className="px-4 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40"
                    >
                      {pending ? 'Sending…' : 'Send Request'}
                    </button>
                  </div>
                </div>
              )}

              {view === 'delete' && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <p className="text-sm font-semibold text-red-700 mb-1">Delete contractor company</p>
                    <p className="text-xs text-red-600">
                      This will permanently delete <span className="font-bold">{company.name}</span> and all associated user accounts. This cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setView('profile')}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      ← Cancel
                    </button>
                    <button
                      disabled={pending}
                      onClick={handleDelete}
                      className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40"
                    >
                      {pending ? 'Deleting…' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            {view === 'profile' && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 shrink-0">
                {canAct ? (
                  <>
                    <button
                      disabled={pending}
                      onClick={handleApprove}
                      className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                    >
                      {pending ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => { setNote(''); setView('moreinfo') }}
                      className="px-4 py-2 text-sm font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                    >
                      Request More Info
                    </button>
                    <button
                      onClick={() => { setNote(''); setView('reject') }}
                      className="px-4 py-2 text-sm font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <button onClick={close} className="text-sm text-gray-500 hover:text-gray-700">
                    Close
                  </button>
                )}
                <button
                  onClick={() => setView('delete')}
                  className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Delete company
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
