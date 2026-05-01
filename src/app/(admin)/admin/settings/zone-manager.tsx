'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createZone, updateZone, deleteZone } from '@/app/actions/settings'

type Zone = { id: string; name: string; description: string | null; color: string | null }

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function ZoneModal({
  zone,
  onClose,
}: {
  zone?: Zone
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [color, setColor] = useState<string>(zone?.color || '#3b82f6')
  const [error, setError] = useState('')

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('color', color)
    setError('')
    startTransition(async () => {
      const res = zone ? await updateZone(zone.id, fd) : await createZone(fd)
      if (res && 'error' in res) { setError(res.error ?? ''); return }
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          {zone ? 'Edit Zone' : 'Add Zone'}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Zone Name *</label>
            <input
              name="name"
              defaultValue={zone?.name ?? ''}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. North York Hub"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input
              name="description"
              defaultValue={zone?.description ?? ''}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#1e40af' : 'transparent',
                    outline: color === c ? '2px solid #1e40af' : 'none',
                    outlineOffset: '1px',
                  }}
                />
              ))}
            </div>
            <input type="hidden" name="color" value={color} />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function confirm() {
    startTransition(async () => {
      await deleteZone(zone.id)
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Delete Zone</h2>
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold">{zone.name}</span>?
          Collectors assigned to this zone will be unassigned.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={pending}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-40"
          >
            {pending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ZoneManager({ zones }: { zones: Zone[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editZone, setEditZone] = useState<Zone | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null)

  return (
    <div className="space-y-4">
      {showAdd && <ZoneModal onClose={() => setShowAdd(false)} />}
      {editZone && <ZoneModal zone={editZone} onClose={() => setEditZone(null)} />}
      {deleteTarget && <DeleteConfirm zone={deleteTarget} onClose={() => setDeleteTarget(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{zones.length} zone{zones.length !== 1 ? 's' : ''} configured</p>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + Add Zone
        </button>
      </div>

      {zones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          No zones yet. Click "Add Zone" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {zones.map(zone => (
            <div
              key={zone.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: zone.color ?? '#94a3b8' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{zone.name}</p>
                {zone.description && (
                  <p className="text-xs text-gray-500 truncate">{zone.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditZone(zone)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(zone)}
                  className="text-xs text-red-500 hover:underline font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
