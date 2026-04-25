import { prisma } from '@/lib/prisma'
import { DeleteContractorButton } from './delete-contractor-button'

const statusLabel: Record<string, string> = {
  UNVERIFIED: 'Unverified',
  PENDING: 'Pending',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  ACTION_REQUIRED: 'Action Required',
}

const statusClass: Record<string, string> = {
  UNVERIFIED: 'border-border text-muted-foreground',
  PENDING: 'border-yellow-400 text-yellow-700 dark:text-yellow-400',
  ACTIVE: 'border-green-500 text-green-700 dark:text-green-400',
  REJECTED: 'border-destructive text-destructive',
  ACTION_REQUIRED: 'border-orange-400 text-orange-700 dark:text-orange-400',
}

export default async function ContractorManagementPage() {
  const companies = await prisma.contractorCompany.findMany({
    include: {
      users: { where: { role: 'CONTRACTOR' as never }, take: 1 },
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Contractor Management</h1>
      <p className="mt-1 text-sm text-muted-foreground">{companies.length} companies</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Admin Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Members</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const admin = company.users[0]
              const status = company.status as string
              return (
                <tr key={company.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{company.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{admin?.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClass[status] ?? statusClass.UNVERIFIED}`}
                    >
                      {statusLabel[status] ?? status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{company._count.users}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {company.createdAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteContractorButton companyId={company.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {companies.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">No contractor companies found.</p>
        )}
      </div>
    </div>
  )
}
