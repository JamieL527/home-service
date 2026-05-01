'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resubmitLead } from '@/app/actions/collector-leads'

export function ResubmitButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      await resubmitLead(leadId)
      router.push(`/collector/leads/${leadId}?resubmitted=1`)
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors"
    >
      {pending ? 'Submitting…' : 'Edit & Resubmit'}
    </button>
  )
}
