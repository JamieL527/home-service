import { prisma } from '@/lib/prisma'
import PermitsClient from './permits-client'

export default async function PermitsPage() {
  const [statusRows, typeRows, totalCount] = await Promise.all([
    prisma.permits.findMany({
      select: { status: true },
      distinct: ['status'],
      where: { status: { not: null } },
      orderBy: { status: 'asc' },
    }),
    prisma.permits.findMany({
      select: { permit_type: true },
      distinct: ['permit_type'],
      where: { permit_type: { not: null } },
      orderBy: { permit_type: 'asc' },
    }),
    prisma.permits.count(),
  ])

  const statuses = statusRows.map(r => r.status!).filter(Boolean)
  const permitTypes = typeRows.map(r => r.permit_type!).filter(Boolean)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  return (
    <PermitsClient
      apiKey={apiKey}
      statuses={statuses}
      permitTypes={permitTypes}
      totalCount={totalCount}
    />
  )
}
