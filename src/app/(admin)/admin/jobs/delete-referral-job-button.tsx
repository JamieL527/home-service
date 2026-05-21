'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteReferralJob } from '@/app/actions/jobs-admin'

export function DeleteReferralJobButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this referral job? This cannot be undone.')) return
    setLoading(true)
    try {
      await deleteReferralJob(jobId)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-white border border-red-200 text-red-500 text-[11px] font-bold rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap disabled:opacity-50"
    >
      <Trash2 size={11} className="inline mr-1" />
      {loading ? '...' : 'Delete'}
    </button>
  )
}
