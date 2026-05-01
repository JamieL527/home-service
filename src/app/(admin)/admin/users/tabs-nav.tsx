import Link from 'next/link'

const ALL_TABS = [
  { key: 'internal',    label: 'Internal Users', mobileOnly: false },
  { key: 'external',    label: 'External Users', mobileOnly: false },
  { key: 'invitations', label: 'Invitations',    mobileOnly: false },
  { key: 'roles',       label: 'Roles',          mobileOnly: true },
  { key: 'teams',       label: 'Teams',          mobileOnly: true },
  { key: 'activity',    label: 'Activity Log',   mobileOnly: true },
]

export function TabsNav({ activeTab, pendingCount }: { activeTab: string; pendingCount: number }) {
  return (
    <>
      {/* Mobile: pill buttons, only show the 3 real tabs */}
      <div className="sm:hidden flex gap-2 mb-6">
        {ALL_TABS.filter(t => !t.mobileOnly).map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/users?tab=${tab.key}`}
            className={[
              'flex-1 text-center py-2 rounded-xl text-xs font-semibold border transition-colors',
              activeTab === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
            ].join(' ')}
          >
            {tab.key === 'internal' ? 'Internal' : tab.key === 'external' ? 'External' : 'Invitations'}
            {tab.key === 'external' && pendingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-white text-blue-600">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Desktop: full underline tab bar */}
      <div className="hidden sm:flex border-b border-gray-200 mb-6 -mx-6 px-6">
        {ALL_TABS.map((tab) => (
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
    </>
  )
}
