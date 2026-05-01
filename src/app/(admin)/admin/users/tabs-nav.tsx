import Link from 'next/link'

const TABS = [
  { key: 'internal', label: 'Internal Users' },
  { key: 'external', label: 'External Users' },
  { key: 'invitations', label: 'Invitations' },
  { key: 'roles', label: 'Roles' },
  { key: 'teams', label: 'Teams' },
  { key: 'activity', label: 'Activity Log' },
]

export function TabsNav({ activeTab, pendingCount }: { activeTab: string; pendingCount: number }) {
  return (
    <div className="flex border-b border-gray-200 mb-6 -mx-6 px-6">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/users?tab=${tab.key}`}
          className={[
            'px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
            activeTab === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          ].join(' ')}
        >
          {tab.label}
          {tab.key === 'external' && pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
