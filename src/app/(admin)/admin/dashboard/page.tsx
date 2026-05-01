import Link from 'next/link'
import { prisma } from '@/lib/prisma'

function StatCard({
  label,
  value,
  href,
  color = 'blue',
}: {
  label: string
  value: number
  href: string
  color?: 'blue' | 'green' | 'red' | 'gray' | 'amber'
}) {
  const colors = {
    blue:  'bg-blue-50   border-blue-100  text-blue-700   hover:bg-blue-100',
    green: 'bg-green-50  border-green-100 text-green-700  hover:bg-green-100',
    red:   'bg-red-50    border-red-100   text-red-700    hover:bg-red-100',
    gray:  'bg-gray-50   border-gray-200  text-gray-600   hover:bg-gray-100',
    amber: 'bg-amber-50  border-amber-100 text-amber-700  hover:bg-amber-100',
  }
  const numColor = {
    blue:  'text-blue-800',
    green: 'text-green-800',
    red:   'text-red-800',
    gray:  'text-gray-800',
    amber: 'text-amber-800',
  }

  return (
    <Link
      href={href}
      className={`block rounded-xl border p-5 transition-colors ${colors[color]}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${colors[color].split(' ').find(c => c.startsWith('text-'))}`}>
        {label}
      </p>
      <p className={`mt-2 text-4xl font-bold ${numColor[color]}`}>{value}</p>
    </Link>
  )
}

function Group({ title, children, cols = 4 }: { title: string; children: React.ReactNode; cols?: number }) {
  const colClass = cols === 5 ? 'sm:grid-cols-5' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
  return (
    <section>
      <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">{title}</h2>
      <div className={`grid grid-cols-2 gap-3 ${colClass}`}>{children}</div>
    </section>
  )
}

export default async function AdminDashboardPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalLeads,
    newLeads,
    inMarketingLeads,
    qualifiedLeads,
    parkedLeads,
    pendingJobs,
    readyJobs,
    activeJobs,
    completedJobs,
    verifiedJobs,
    activeDeals,
    wonThisMonth,
    lostThisMonth,
    pendingApproval,
    activeContractors,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({
      where: { status: { in: ['SUBMITTED', 'RESUBMITTED'] as never[] } },
    }),
    prisma.lead.count({
      where: { status: { in: ['MARKETING_INBOX', 'CONTACTING', 'NO_RESPONSE', 'CONTACT_ESTABLISHED'] as never[] } },
    }),
    prisma.lead.count({ where: { status: 'QUALIFIED' } }),
    prisma.lead.count({ where: { status: 'PARKED' } }),

    prisma.job.count({ where: { status: 'PENDING' } }),
    prisma.job.count({ where: { status: 'READY' } }),
    prisma.job.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.job.count({ where: { status: 'COMPLETED' } }),
    prisma.job.count({ where: { status: 'VERIFIED' } }),

    prisma.deal.count({ where: { status: 'active' } }),
    prisma.deal.count({ where: { status: 'won', updatedAt: { gte: startOfMonth } } }),
    prisma.deal.count({ where: { status: 'lost', updatedAt: { gte: startOfMonth } } }),

    prisma.contractorCompany.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.contractorCompany.count({ where: { status: 'ACTIVE' } }),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform operations at a glance</p>
      </div>

      <Group title="Leads" cols={5}>
        <StatCard label="Total Leads"   value={totalLeads}      href="/admin/evaluation" color="gray" />
        <StatCard label="New Leads"     value={newLeads}        href="/admin/evaluation" color="blue" />
        <StatCard label="In Marketing"  value={inMarketingLeads} href="/marketing/inbox"  color="blue" />
        <StatCard label="Qualified"     value={qualifiedLeads}  href="/sales/pipeline"   color="green" />
        <StatCard label="Parked"        value={parkedLeads}     href="/admin/parking"    color="gray" />
      </Group>

      <Group title="Jobs" cols={5}>
        <StatCard label="Pending Jobs"    value={pendingJobs}   href="/admin/jobs" color="amber" />
        <StatCard label="Ready to Match"  value={readyJobs}     href="/admin/jobs" color="blue" />
        <StatCard label="Active Jobs"     value={activeJobs}    href="/admin/jobs" color="blue" />
        <StatCard label="Awaiting Verify" value={completedJobs} href="/admin/jobs" color="red" />
        <StatCard label="Verified"        value={verifiedJobs}  href="/admin/jobs" color="green" />
      </Group>

      <Group title="Sales">
        <StatCard label="Active Deals"     value={activeDeals}    href="/sales/pipeline" color="blue" />
        <StatCard label="Won This Month"   value={wonThisMonth}   href="/sales/pipeline" color="green" />
        <StatCard label="Lost This Month"  value={lostThisMonth}  href="/sales/pipeline" color="red" />
      </Group>

      <Group title="Contractors">
        <StatCard label="Pending Approval"    value={pendingApproval}   href="/admin/users?tab=external&sub=PENDING_APPROVAL" color="amber" />
        <StatCard label="Active Contractors"  value={activeContractors} href="/admin/users?tab=external&sub=ACTIVE"           color="green" />
      </Group>
    </div>
  )
}
