import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'

export default async function ContractorOverviewPage() {
  const { company } = await requireContractorUser()

  const [memberCount, activeJobs, completedJobs] = await Promise.all([
    prisma.user.count({ where: { contractorCompanyId: company.id } }),
    prisma.job.count({
      where: {
        contractor: { companyId: company.id },
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] as never[] },
      },
    }),
    prisma.job.count({
      where: {
        contractor: { companyId: company.id },
        status: 'COMPLETED' as never,
      },
    }),
  ])

  const stats = [
    { label: 'Team Members', value: memberCount },
    { label: 'Active Jobs', value: activeJobs },
    { label: 'Completed Jobs', value: completedJobs },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
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
