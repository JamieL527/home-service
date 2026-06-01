export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import RoutesClient from './routes-client'

export default async function RoutesPage() {
  const [tasks, zones, collectors] = await Promise.all([
    prisma.routeTask.findMany({
      include: {
        zone: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.zone.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { role: 'DATA_COLLECTOR' as never },
      select: { id: true, firstName: true, lastName: true, email: true, zones: { select: { id: true } } },
      orderBy: { email: 'asc' },
    }),
  ])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  return <RoutesClient apiKey={apiKey} initialTasks={tasks} zones={zones} collectors={collectors} />
}
