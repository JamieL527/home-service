import { prisma } from '@/lib/prisma'

export default async function AdminDashboardPage() {
  const [pendingContractors, activeContractors, totalContractors, totalLeads] = await Promise.all([
    prisma.contractorCompany.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.contractorCompany.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'CONTRACTOR' } }),
    prisma.lead.count(),
  ])

  const stats = [
    { label: 'Pending Approval', value: pendingContractors },
    { label: 'Active Contractors', value: activeContractors },
    { label: 'Contractor Accounts', value: totalContractors },
    { label: 'Total Leads', value: totalLeads },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
