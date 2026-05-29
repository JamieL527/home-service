'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { resendInvite } from '@/app/actions/admin'

export function ResendInviteButton({ email }: { email: string }) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await resendInvite(email)
      setStatus(result.success ? 'success' : 'error')
      if (result.success) router.refresh()
      setTimeout(() => setStatus('idle'), 3000)
    })
  }

  if (status === 'success') {
    return (
      <span className="px-2.5 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded-lg">
        Sent ✓
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-lg">
        Failed ✗
      </span>
    )
  }

  return (
    <button
      disabled={pending}
      onClick={handleClick}
      className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40"
    >
      {pending ? '…' : 'Resend'}
    </button>
  )
}
