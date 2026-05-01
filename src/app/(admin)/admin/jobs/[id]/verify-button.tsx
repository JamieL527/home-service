'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyJob } from '@/app/actions/jobs-admin'

export function VerifyButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      await verifyJob(jobId)
      router.refresh()
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
    >
      {pending ? 'Verifying…' : 'Verify Job'}
    </button>
  )
}
