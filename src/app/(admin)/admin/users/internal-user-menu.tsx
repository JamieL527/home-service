'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deleteUser } from '@/app/actions/admin'

export function InternalUserMenu({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleDelete() {
    setOpen(false)
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteUser(userId)
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={pending}
        className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
      >
        {pending ? '…' : '•••'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete user
          </button>
        </div>
      )}
    </div>
  )
}
