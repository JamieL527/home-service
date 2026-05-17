export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireCollectorUser } from '@/lib/collector'
import { Route, MapPin, ArrowLeft, Plus, CheckCircle } from 'lucide-react'
import RouteMap from './route-map'
import { acceptRouteTask, completeRouteTask } from '@/app/actions/route-tasks'
import { CancelTaskButton } from '@/components/collector/cancel-task-button'

type LatLng = { lat: number; lng: number }

function centroid(poly: LatLng[]): LatLng {
  const s = poly.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: s.lat / poly.length, lng: s.lng / poly.length }
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:      { label: 'Available',   cls: 'bg-purple-900/60 text-purple-300 border border-purple-500/40' },
  assigned:    { label: 'Accepted',    cls: 'bg-yellow-900/60 text-yellow-300 border border-yellow-500/40' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-900/60 text-blue-300 border border-blue-500/40' },
  completed:   { label: 'Completed',   cls: 'bg-green-900/40 text-green-400 border border-green-500/40' },
}

export default async function CollectorRoutePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireCollectorUser()

  const task = await prisma.routeTask.findUnique({
    where: { id },
    include: {
      zone: { select: { id: true, name: true } },
      _count: { select: { leads: { where: { createdById: user.id } } } },
    },
  })

  if (!task) notFound()
  if (user.zoneId && task.zoneId !== user.zoneId) notFound()

  const polygon = (task.polygon as LatLng[]) ?? []
  const center = polygon.length > 0 ? centroid(polygon) : { lat: 43.6532, lng: -79.3832 }
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''

  const isMyTask     = task.assignedToId === user.id
  const isAvailable  = task.status === 'active' && !task.assignedToId
  const isAssigned   = task.status === 'assigned' && isMyTask
  const isInProgress = task.status === 'in_progress' && isMyTask
  const myLeadCount  = task._count.leads
  const badge        = STATUS_BADGE[task.status] ?? STATUS_BADGE.active

  return (
    <div className="-m-4 sm:-m-6 flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/collector/dashboard" className="text-gray-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Route size={15} className="text-purple-400 shrink-0" />
              <p className="font-bold text-white truncate">{task.name}</p>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin size={10} />
              {task.zone.name}
              {myLeadCount > 0 && (
                <><span className="mx-1">·</span>{myLeadCount} lead{myLeadCount !== 1 ? 's' : ''} submitted</>
              )}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <RouteMap apiKey={apiKey} polygon={polygon} color={task.color} center={center} />

        {/* Action buttons */}
        <div className="absolute bottom-24 sm:bottom-8 left-0 right-0 flex justify-center items-center gap-3 px-4 pointer-events-none z-50">

          {/* Available: Accept */}
          {isAvailable && (
            <form action={acceptRouteTask.bind(null, task.id)} className="pointer-events-auto">
              <button
                type="submit"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl transition-colors"
              >
                <CheckCircle size={18} />
                Accept Task
              </button>
            </form>
          )}

          {/* Assigned / In Progress: Start Collecting */}
          {(isAssigned || isInProgress) && (
            <Link
              href={`/collector/leads/new?taskId=${task.id}`}
              className="pointer-events-auto inline-flex items-center bg-gray-900 hover:bg-black text-white text-sm font-bold px-5 py-3.5 rounded-2xl shadow-2xl border border-white/10 transition-colors"
            >
              Start Collecting
            </Link>
          )}

          {/* Assigned + 0 leads: Cancel */}
          {isAssigned && myLeadCount === 0 && (
            <div className="pointer-events-auto">
              <CancelTaskButton taskId={task.id} />
            </div>
          )}

          {/* In Progress: Mark Done */}
          {isInProgress && (
            <form action={completeRouteTask.bind(null, task.id)} className="pointer-events-auto">
              <button
                type="submit"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl transition-colors"
              >
                <CheckCircle size={18} />
                Done
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
