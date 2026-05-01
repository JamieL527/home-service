'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateLeadNotes } from '@/app/actions/collector-leads'
import { MessageCircle } from 'lucide-react'

export function NotesForm({ leadId, existing }: { leadId: string; existing: string | null }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(existing ?? '')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      await updateLeadNotes(leadId, value)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
      >
        <MessageCircle size={11} />
        {existing ? 'Edit Notes' : 'Add Notes'}
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Add your field observations here..."
        autoFocus
        className="w-full text-sm border border-teal-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-200 resize-none bg-white"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setValue(existing ?? '') }}
          className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={pending}
          onClick={save}
          className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
