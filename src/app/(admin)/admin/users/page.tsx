import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { TabsNav } from './tabs-nav'
import { InviteUserButton } from './invite-user-button'
import { ContractorReviewModal } from './contractor-review-modal'
import { InternalUserMenu } from './internal-user-menu'
import { ResendInviteButton } from './resend-invite-button'

// ── Helpers ────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN:          'bg-gray-100 text-gray-700',
  SALES:          'bg-red-100 text-red-700',
  MARKETING:      'bg-purple-100 text-purple-700',
  DATA_COLLECTOR: 'bg-blue-100 text-blue-700',
}
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', SALES: 'Sales', MARKETING: 'Marketing', DATA_COLLECTOR: 'Data Collector',
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700', 'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700',
]

function avatarColor(seed: string) {
  let n = 0
  for (let i = 0; i < seed.length; i++) n += seed.charCodeAt(i)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const cls = avatarColor(name)
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${cls}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name || '?')}
    </div>
  )
}

function relativeTime(date: Date) {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min${m !== 1 ? 's' : ''} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-CA')
}

const SUB_TABS = [
  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { key: 'ACTIVE',           label: 'Active' },
  { key: 'ACTION_REQUIRED',  label: 'Action Required' },
  { key: 'REJECTED',         label: 'Rejected' },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sub?: string }>
}) {
  const { tab = 'internal', sub = 'PENDING_APPROVAL' } = await searchParams

  // Always fetch pending count for badge
  const pendingCount = await prisma.contractorCompany.count({
    where: { status: 'PENDING_APPROVAL' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

      <TabsNav activeTab={tab} pendingCount={pendingCount} />

      {tab === 'internal' && <InternalUsersTab />}
      {tab === 'external' && <ExternalUsersTab activeSub={sub} />}
      {tab === 'invitations' && <InvitationsTab />}
      {(tab === 'roles' || tab === 'teams' || tab === 'activity') && <PlaceholderTab label={tab} />}
    </div>
  )
}

// ── Internal Users Tab ─────────────────────────────────────────────────────

async function InternalUsersTab() {
  const [users, zones] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: 'CONTRACTOR' as never } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <InviteUserButton zones={zones} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Team</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Leads Assigned</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Leads Converted</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center">Conversion Rate</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
              const roleColor = ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'
              const roleLabel = ROLE_LABELS[user.role] ?? user.role
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">—</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs text-gray-600">Active</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Edit
                      </button>
                      <InternalUserMenu userId={user.id} name={name} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">No internal users found.</p>
        )}
      </div>
    </div>
  )
}

// ── External Users Tab ─────────────────────────────────────────────────────

async function ExternalUsersTab({ activeSub }: { activeSub: string }) {
  const validSub = SUB_TABS.find(s => s.key === activeSub)?.key ?? 'PENDING_APPROVAL'

  const [companies, counts] = await Promise.all([
    prisma.contractorCompany.findMany({
      where: { status: validSub as never },
      include: { users: { take: 1, select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contractorCompany.groupBy({
      by: ['status'],
      _count: true,
    }),
  ])

  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count]))

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-4">
        {SUB_TABS.map(({ key, label }) => {
          const count = countMap[key] ?? 0
          const isActive = key === validSub
          return (
            <a
              key={key}
              href={`/admin/users?tab=external&sub=${key}`}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {label}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/30 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                  {count}
                </span>
              )}
            </a>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Business Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">User Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Contact Person</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Trade Type</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Submitted</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Insurance</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Risk Flags</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((company) => {
              const hasInsurance = !!company.insuranceNumber
              const hasWsib = !!company.wsibNumber
              const companyData = {
                id: company.id,
                name: company.name,
                status: company.status as string,
                businessNumber: company.businessNumber,
                address: company.address,
                website: company.website,
                tradeType: company.tradeType,
                wsibNumber: company.wsibNumber,
                insuranceNumber: company.insuranceNumber,
                contactName: company.contactName,
                contactTitle: company.contactTitle,
                contactEmail: company.contactEmail,
                contactPhone: company.contactPhone,
                adminNote: company.adminNote,
                userEmail: company.users[0]?.email ?? null,
              }
              return (
                <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={company.name} />
                      <span className="font-medium text-gray-900">{company.name || '(unnamed)'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      Contractor
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {company.contactName ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={company.contactName} size={28} />
                        <span className="text-gray-700 text-xs">{company.contactName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{company.tradeType || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{relativeTime(company.createdAt)}</td>
                  <td className="px-4 py-3">
                    {hasInsurance ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                        No Insurance
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!hasWsib && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        ⚠ WSIB
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ContractorReviewModal company={companyData} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {companies.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">
            No contractors in this category.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Invitations Tab ────────────────────────────────────────────────────────

async function InvitationsTab() {
  const [users, zones] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: 'CONTRACTOR' as never }, invitedAt: { not: null } },
      orderBy: { invitedAt: 'desc' },
    }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
  ])

  // Use Supabase Admin API to check which invites have been accepted
  let confirmedEmails = new Set<string>()
  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
    confirmedEmails = new Set(
      (data?.users ?? [])
        .filter(u => u.email_confirmed_at)
        .map(u => u.email?.toLowerCase() ?? '')
    )
  } catch {
    // If Admin API fails, fall back to showing all as accepted
    users.forEach(u => confirmedEmails.add(u.email.toLowerCase()))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{users.length} invitation{users.length !== 1 ? 's' : ''} sent</p>

        <InviteUserButton zones={zones} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Invitee</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Role</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Team</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Sent At</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(user => {
              const accepted = confirmedEmails.has(user.email.toLowerCase())
              const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
              const roleColor = ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'
              const roleLabel = ROLE_LABELS[user.role] ?? user.role
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={name || user.email} />
                      <div className="min-w-0">
                        {name && <p className="font-medium text-gray-900 truncate">{name}</p>}
                        <p className={`text-xs truncate ${name ? 'text-gray-400' : 'font-medium text-gray-700'}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user.invitedAt ? relativeTime(user.invitedAt) : relativeTime(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {accepted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        Accepted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {!accepted && <ResendInviteButton email={user.email} />}
                      <InternalUserMenu userId={user.id} name={name || user.email} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">No invitations sent yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Placeholder Tab ────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  const labels: Record<string, string> = {
    roles: 'Roles', teams: 'Teams', activity: 'Activity Log',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <p className="text-gray-500 text-sm font-medium mb-1">{labels[label] ?? label}</p>
      <p className="text-gray-400 text-xs">This section is coming soon.</p>
    </div>
  )
}
