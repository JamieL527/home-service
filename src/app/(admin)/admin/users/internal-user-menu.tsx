'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  suspendInternalUser, reactivateInternalUser,
  deactivateInternalUser, changeUserRole,
} from '@/app/actions/admin'

const ROLE_OPTIONS = [
  { value: 'ADMIN',          label: 'Admin' },
  { value: 'SALES',          label: 'Sales' },
  { value: 'MARKETING',      label: 'Marketing' },
  { value: 'DATA_COLLECTOR', label: 'Data Collector' },
]

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', SALES: 'Sales', MARKETING: 'Marketing', DATA_COLLECTOR: 'Data Collector',
}

export function InternalUserMenu({
  userId, name, userStatus, userRole,
}: {
  userId: string
  name: string
  userStatus: string
  userRole: string
}) {
  const [open, setOpen]             = useState(false)
  const [view, setView]             = useState<'menu' | 'role'>('menu')
  const [roleOpen, setRoleOpen]     = useState(false)
  const [pending, startTransition]  = useTransition()
  const ref                         = useRef<HTMLDivElement>(null)
  const router                      = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setView('menu')
        setRoleOpen(false)
      }
    }
    if (open || roleOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, roleOpen])

  function act(fn: () => Promise<void>) {
    setOpen(false)
    setView('menu')
    setRoleOpen(false)
    startTransition(async () => { await fn(); router.refresh() })
  }

  const isSuspended   = userStatus === 'suspended'
  const isDeactivated = userStatus === 'deactivated'
  const isActive      = userStatus === 'active'

  return (
    <div ref={ref} className="flex items-center gap-1.5">

      {/* ── Desktop: inline buttons ── */}
      <div className="hidden sm:flex items-center gap-1.5">

        {/* Change Role dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleOpen(v => !v)}
            disabled={pending}
            className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {ROLE_LABELS[userRole] ?? userRole} ▾
          </button>
          {roleOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  disabled={opt.value === userRole}
                  onClick={() => act(() => changeUserRole(userId, opt.value))}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    opt.value === userRole
                      ? 'text-blue-600 font-bold bg-blue-50 cursor-default'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label} {opt.value === userRole && '✓'}
                </button>
              ))}
            </div>
          )}
        </div>

        {isActive && (
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Suspend "${name}"? They will be logged out and blocked.`)) return
              act(() => suspendInternalUser(userId))
            }}
            className="px-2.5 py-1 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40"
          >
            Suspend
          </button>
        )}

        {isSuspended && (
          <button
            disabled={pending}
            onClick={() => act(() => reactivateInternalUser(userId))}
            className="px-2.5 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            Reactivate
          </button>
        )}

        {!isDeactivated && (
          <button
            disabled={pending}
            onClick={() => {
              if (!confirm(`Deactivate "${name}"? This permanently disables the account.`)) return
              act(() => deactivateInternalUser(userId))
            }}
            className="px-2.5 py-1 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
          >
            Deactivate
          </button>
        )}
      </div>

      {/* ── Mobile: ••• dropdown ── */}
      <div className="sm:hidden relative">
        <button
          onClick={() => { setOpen(v => !v); setView('menu') }}
          disabled={pending}
          className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {pending ? '…' : '•••'}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
            {view === 'menu' && (
              <>
                <button
                  onClick={() => setView('role')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Change Role
                </button>

                {isActive && (
                  <button
                    onClick={() => {
                      if (!confirm(`Suspend "${name}"? They will be logged out and blocked.`)) return
                      act(() => suspendInternalUser(userId))
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    Suspend
                  </button>
                )}

                {isSuspended && (
                  <button
                    onClick={() => act(() => reactivateInternalUser(userId))}
                    className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
                  >
                    Reactivate
                  </button>
                )}

                {!isDeactivated && (
                  <button
                    onClick={() => {
                      if (!confirm(`Deactivate "${name}"? This permanently disables the account.`)) return
                      act(() => deactivateInternalUser(userId))
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Deactivate
                  </button>
                )}
              </>
            )}

            {view === 'role' && (
              <>
                <p className="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Change Role</p>
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    disabled={opt.value === userRole}
                    onClick={() => act(() => changeUserRole(userId, opt.value))}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      opt.value === userRole
                        ? 'text-blue-600 font-bold bg-blue-50 cursor-default'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label} {opt.value === userRole && '✓'}
                  </button>
                ))}
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => setView('menu')}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
