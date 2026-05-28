'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  suspendInternalUser, reactivateInternalUser,
  deactivateInternalUser, changeUserRole, updateUserZones,
} from '@/app/actions/admin'

type Zone = { id: string; name: string; color: string | null }

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
  userId, name, userStatus, userRole, allZones = [], userZones = [],
}: {
  userId: string
  name: string
  userStatus: string
  userRole: string
  allZones?: Zone[]
  userZones?: Zone[]
}) {
  const [open, setOpen]               = useState(false)
  const [view, setView]               = useState<'menu' | 'role' | 'zones'>('menu')
  const [roleOpen, setRoleOpen]       = useState(false)
  const [openUp, setOpenUp]           = useState(false)
  const [selectedZones, setSelectedZones] = useState<string[]>(userZones.map(z => z.id))
  const [pending, startTransition]    = useTransition()
  const ref                           = useRef<HTMLDivElement>(null)
  const router                        = useRouter()

  function checkDirection(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setOpenUp(rect.bottom + 220 > window.innerHeight)
  }

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

  function toggleZone(id: string) {
    setSelectedZones(prev => prev.includes(id) ? prev.filter(z => z !== id) : [...prev, id])
  }

  function saveZones() {
    act(() => updateUserZones(userId, selectedZones))
  }

  const isSuspended   = userStatus === 'suspended'
  const isDeactivated = userStatus === 'deactivated'
  const isActive      = userStatus === 'active'

  return (
    <div ref={ref} className="flex items-center gap-1.5">

      {/* ── Desktop: inline buttons ── */}
      <div className="hidden sm:flex items-center gap-1.5">

        {/* Manage Zones — DATA_COLLECTOR only */}
        {userRole === 'DATA_COLLECTOR' && allZones.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => { checkDirection(e); setRoleOpen(false); setOpen(v => !v) }}
              disabled={pending}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-40"
            >
              Zones
            </button>
            {open && (
              <div className={`absolute right-0 z-20 w-52 bg-white rounded-lg border border-gray-200 shadow-lg p-3 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Assign Zones</p>
                <div className="space-y-1.5 mb-3">
                  {allZones.map(z => (
                    <label key={z.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedZones.includes(z.id)}
                        onChange={() => toggleZone(z.id)}
                        className="rounded"
                      />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color ?? '#6b7280' }} />
                      {z.name}
                    </label>
                  ))}
                </div>
                <button
                  onClick={saveZones}
                  disabled={pending}
                  className="w-full py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}

        {/* Change Role dropdown */}
        <div className="relative">
          <button
            onClick={(e) => { checkDirection(e); setRoleOpen(v => !v) }}
            disabled={pending}
            className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            {ROLE_LABELS[userRole] ?? userRole} ▾
          </button>
          {roleOpen && (
            <div className={`absolute right-0 z-20 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
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
          onClick={(e) => { checkDirection(e); setOpen(v => !v); setView('menu') }}
          disabled={pending}
          className="px-2 py-1 text-xs font-bold text-gray-400 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
        >
          {pending ? '…' : '•••'}
        </button>

        {open && (
          <div className={`absolute right-0 z-20 w-44 bg-white rounded-lg border border-gray-200 shadow-lg py-1 ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            {view === 'menu' && (
              <>
                <button
                  onClick={() => setView('role')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Change Role
                </button>
                {userRole === 'DATA_COLLECTOR' && allZones.length > 0 && (
                  <button
                    onClick={() => setView('zones')}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Manage Zones
                  </button>
                )}

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

            {view === 'zones' && (
              <>
                <p className="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Manage Zones</p>
                <div className="px-3 space-y-1.5 mb-2">
                  {allZones.map(z => (
                    <label key={z.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedZones.includes(z.id)}
                        onChange={() => toggleZone(z.id)}
                        className="rounded"
                      />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: z.color ?? '#6b7280' }} />
                      {z.name}
                    </label>
                  ))}
                </div>
                <div className="px-3 pb-2">
                  <button
                    onClick={saveZones}
                    disabled={pending}
                    className="w-full py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => setView('menu')}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
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
