import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { NewLeadForm } from './form'

export default async function NewLeadPage() {
  const { user } = await requireCollectorUser()

  const routeTasks = user.zoneId
    ? await prisma.routeTask.findMany({
        where: {
          zoneId: user.zoneId,
          OR: [
            { status: 'active', assignedToId: null },
            { assignedToId: user.id },
          ],
        },
        select: { id: true, name: true, polygon: true, color: true },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">New Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in what you observed on site.</p>
      </div>
      <NewLeadForm
        zoneId={user.zoneId}
        zoneName={user.zone?.name ?? null}
        routeTasks={routeTasks}
      />
    </div>
  )
}
