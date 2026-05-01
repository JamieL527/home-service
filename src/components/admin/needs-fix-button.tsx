'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { markLeadNeedsFix } from '@/app/actions/leads-admin'

export function NeedsFixButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit() {
    if (!comment.trim()) return
    startTransition(async () => {
      await markLeadNeedsFix(leadId, comment.trim())
      setOpen(false)
      setComment('')
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 whitespace-nowrap bg-orange-100 text-orange-700 hover:bg-orange-200"
      >
        Needs Fix
      </button>

      {open && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900">Mark as Needs Fix</h3>
              <button onClick={() => { setOpen(false); setComment('') }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Describe the issue for the collector
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="e.g. Missing contact information, unclear photos..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setComment('') }}
                className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!comment.trim() || pending}
                onClick={handleSubmit}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                {pending ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
