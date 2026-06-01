export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { Route, MapPin } from 'lucide-react'

export default async function CollectorRoutesPage() {
  const { user } = await requireCollectorUser()

  const tasks = await prisma.routeTask.findMany({
    where: { assignedToId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const accepted    = tasks.filter((t) => t.status === 'assigned')
  const inProgress  = tasks.filter((t) => t.status === 'in_progress' && t.assignedToId === user.id)
  const completed   = tasks.filter((t) => t.status === 'completed' && t.assignedToId === user.id)

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
          <p className="text-sm text-gray-400">No route tasks assigned to you yet.</p>
        </div>
      )}

      {[
        { group: accepted,   label: 'Assigned',    labelCls: 'text-yellow-600', cardCls: 'bg-yellow-50 border-yellow-200',   btnCls: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
        { group: inProgress, label: 'In Progress', labelCls: 'text-blue-600',   cardCls: 'bg-blue-50 border-blue-200',       btnCls: 'bg-blue-600 hover:bg-blue-700 text-white' },
        { group: completed,  label: 'Completed',   labelCls: 'text-green-600',  cardCls: 'bg-gray-50 border-gray-200 opacity-70', btnCls: 'bg-gray-200 hover:bg-gray-300 text-gray-700' },
      ].map(({ group, label, labelCls, cardCls, btnCls }) =>
        group.length > 0 && (
          <div key={label} className="mb-6">
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${labelCls}`}>
              {label} ({group.length})
            </p>
            <div className="space-y-2">
              {group.map((task) => (
                <div key={task.id} className={`flex items-center justify-between border rounded-xl px-4 py-3.5 ${cardCls}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{task.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(task.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <Link
                    href={`/collector/routes/${task.id}`}
                    className={`shrink-0 ml-3 flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${btnCls}`}
                  >
                    <MapPin size={12} />
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
