'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resendInvite } from '@/app/actions/admin'

export function ResendInviteButton({ email }: { email: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await resendInvite(email)
          router.refresh()
        })
      }
      className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40"
    >
      {pending ? '…' : 'Resend'}
    </button>
  )
}
