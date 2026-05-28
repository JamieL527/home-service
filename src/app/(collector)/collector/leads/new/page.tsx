export const dynamic = 'force-dynamic'

import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { NewLeadForm } from './form'

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string; lat?: string; lng?: string; address?: string }>
}) {
  const { user } = await requireCollectorUser()
  const { taskId, lat, lng, address } = await searchParams

  const zoneIds = user.zones.map(z => z.id)
  const routeTasks = zoneIds.length > 0
    ? await prisma.routeTask.findMany({
        where: {
          zoneId: { in: zoneIds },
          OR: [
            { status: 'active', assignedToId: null },
            { assignedToId: user.id },
          ],
        },
        select: { id: true, name: true, polygon: true, color: true },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const firstZone = user.zones[0] ?? null

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">New Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in what you observed on site.</p>
      </div>
      <NewLeadForm
        zoneId={firstZone?.id ?? null}
        zoneName={firstZone?.name ?? null}
        routeTasks={routeTasks}
        initialTaskId={taskId}
        initialLat={lat ? parseFloat(lat) : undefined}
        initialLng={lng ? parseFloat(lng) : undefined}
        initialAddress={address}
      />
    </div>
  )
}
