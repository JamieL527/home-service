'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateJobStatus } from '@/app/actions/contractor-jobs'

export function StatusActions({ jobId, status }: { jobId: string; status: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function act(newStatus: 'IN_PROGRESS' | 'COMPLETED') {
    startTransition(async () => {
      await updateJobStatus(jobId, newStatus)
      router.refresh()
    })
  }

  if (status === 'ASSIGNED') {
    return (
      <button
        disabled={pending}
        onClick={() => act('IN_PROGRESS')}
        className="w-full py-2.5 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
      >
        {pending ? 'Updating…' : 'Start Job'}
      </button>
    )
  }

  if (status === 'IN_PROGRESS') {
    return (
      <button
        disabled={pending}
        onClick={() => act('COMPLETED')}
        className="w-full py-2.5 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
      >
        {pending ? 'Updating…' : 'Mark as Completed'}
      </button>
    )
  }

  return null
}
