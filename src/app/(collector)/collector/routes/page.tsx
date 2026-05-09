import Link from 'next/link'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { Route, MapPin, CheckCircle, Clock } from 'lucide-react'

export default async function CollectorRoutesPage() {
  const { user } = await requireCollectorUser()

  const tasks = user.zoneId
    ? await prisma.routeTask.findMany({
        where: { zoneId: user.zoneId },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const active = tasks.filter((t) => t.status === 'active')
  const completed = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center gap-2 mb-6">
        <Route size={20} className="text-purple-500" />
        <h1 className="text-2xl font-bold text-foreground">My Routes</h1>
      </div>

      {tasks.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Route size={28} className="text-purple-400" />
          </div>
          <p className="font-bold text-gray-700 mb-1">No routes assigned yet</p>
          <p className="text-sm text-gray-400">Your admin will assign route tasks to your zone.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock size={12} className="text-purple-500" />
            Active ({active.length})
          </p>
          <div className="space-y-2">
            {active.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-purple-900">{task.name}</p>
                  <p className="text-xs text-purple-500 mt-0.5">
                    {new Date(task.createdAt).toLocaleDateString('en-CA', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <Link
                  href={`/collector/routes/${task.id}`}
                  className="shrink-0 ml-3 flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <MapPin size={12} />
                  View on Map
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <CheckCircle size={12} className="text-green-500" />
            Completed ({completed.length})
          </p>
          <div className="space-y-2">
            {completed.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 opacity-70"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-700">{task.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(task.createdAt).toLocaleDateString('en-CA', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>
                <Link
                  href={`/collector/routes/${task.id}`}
                  className="shrink-0 ml-3 flex items-center gap-1.5 px-3 py-2 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <MapPin size={12} />
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
