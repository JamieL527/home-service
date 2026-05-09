'use client'

import { useTransition } from 'react'
import { releaseRouteTask } from '@/app/actions/route-tasks'

export function CancelTaskButton({ taskId, size = 'md' }: { taskId: string; size?: 'sm' | 'md' }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    if (!confirm('Cancel this task? It will return to the pool and others can claim it.')) return
    startTransition(() => releaseRouteTask(taskId, new FormData()))
  }

  const cls = size === 'sm'
    ? 'px-3 py-1.5 rounded-lg text-xs font-bold'
    : 'px-5 py-3.5 rounded-2xl text-sm font-bold shadow-2xl'

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 ${cls}`}
    >
      {isPending ? 'Cancelling…' : 'Cancel Task'}
    </button>
  )
}
