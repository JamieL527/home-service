'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendJobOffer } from '@/app/actions/jobs-admin'

export function SendOfferButton({ jobId, companyId }: { jobId: string; companyId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      await sendJobOffer(jobId, companyId)
      router.push('/admin/jobs')
    })
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      className="px-3 py-1.5 text-[11px] font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
    >
      {pending ? 'Sending...' : 'Send Offer'}
    </button>
  )
}
