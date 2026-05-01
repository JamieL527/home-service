import { prisma } from '@/lib/prisma'
import { ContractorActions } from './contractor-actions'

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

export default async function ContractorsPage() {
  const contractors = await prisma.contractorCompany.findMany({
    where: { status: { in: ['PENDING_APPROVAL', 'ACTION_REQUIRED'] } },
    include: {
      users: { take: 1 },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Contractor Approval</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {contractors.length} pending application{contractors.length !== 1 ? 's' : ''}
      </p>

      {contractors.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No pending applications.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {contractors.map((company) => {
            const c = company
            const user = company.users[0]
            const isActionRequired = company.status === 'ACTION_REQUIRED'
            return (
              <div
                key={company.id}
                className="rounded-lg border border-border bg-card px-5 py-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{company.name || '(unnamed)'}</p>
                      {isActionRequired && (
                        <span className="rounded-full border border-amber-400/40 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied{' '}
                      {company.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <ContractorActions companyId={company.id} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Business
                    </p>
                    <InfoRow label="Registered Name" value={company.name} />
                    <InfoRow label="Business Number" value={c.businessNumber} />
                    <InfoRow label="Trade / Service" value={c.tradeType} />
                    <InfoRow label="Address" value={c.address} />
                    <InfoRow label="Website" value={c.website} />
                    <InfoRow label="Account Email" value={user?.email} />
                  </div>

                  <div className="space-y-1.5 mt-4 sm:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Person in Charge
                    </p>
                    <InfoRow label="Name" value={c.contactName} />
                    <InfoRow label="Title" value={c.contactTitle} />
                    <InfoRow label="Email" value={c.contactEmail} />
                    <InfoRow label="Phone" value={c.contactPhone} />
                  </div>

                  <div className="space-y-1.5 mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Insurance & Compliance
                    </p>
                    <InfoRow label="WSIB Number" value={c.wsibNumber} />
                    <InfoRow label="Insurance Number" value={c.insuranceNumber} />
                  </div>

                  {c.adminNote && (
                    <div className="space-y-1.5 mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Admin Note
                      </p>
                      <p className="text-sm text-foreground">{c.adminNote}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
