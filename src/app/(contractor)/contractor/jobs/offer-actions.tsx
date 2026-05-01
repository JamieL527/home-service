'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptOffer, rejectOffer } from '@/app/actions/contractor-jobs'

export function OfferActions({ offerId }: { offerId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  return (
    <div className="flex gap-2 mt-4">
      <button
        disabled={pending}
        onClick={() => act(() => acceptOffer(offerId))}
        className="flex-1 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
      >
        {pending ? 'Processing…' : 'Accept'}
      </button>
      <button
        disabled={pending}
        onClick={() => act(() => rejectOffer(offerId))}
        className="flex-1 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        Decline
      </button>
    </div>
  )
}
