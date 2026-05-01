'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateJobNote } from '@/app/actions/contractor-jobs'

export function NoteForm({ jobId, existing }: { jobId: string; existing: string | null }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(existing ?? '')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      await updateJobNote(jobId, value)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-primary hover:underline"
      >
        {existing ? 'Edit note' : 'Add progress note'}
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Describe progress, issues, or next steps…"
        autoFocus
        className="w-full text-sm border border-input rounded-lg px-3 py-2 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 resize-none bg-background"
      />
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setValue(existing ?? '') }}
          className="px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          disabled={pending}
          onClick={save}
          className="px-3 py-1.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
