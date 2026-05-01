import { prisma } from '@/lib/prisma'
import { ZoneManager } from './zone-manager'

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'zones',   label: 'Zones' },
]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'general' } = await searchParams
  const zones = await prisma.zone.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform configuration</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <a
            key={t.key}
            href={`/admin/settings?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* General tab */}
      {tab === 'general' && (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          General settings coming soon.
        </div>
      )}

      {/* Zones tab */}
      {tab === 'zones' && <ZoneManager zones={zones} />}
    </div>
  )
}
