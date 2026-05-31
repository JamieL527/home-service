'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  useMap,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps'
import { MapPin, Trash2, CheckCircle, Route, X, PenLine, Map, Pencil, RotateCcw, Undo2 } from 'lucide-react'
import {
  createRouteTask, deleteRouteTask, updateRouteTaskStatus,
  renameRouteTask, adminReleaseRouteTask,
} from '@/app/actions/route-tasks'

type LatLng = { lat: number; lng: number }
type Zone   = { id: string; name: string; color: string | null }
type RouteTask = {
  id: string; name: string; polygon: unknown; color: string
  zoneId: string; status: string; createdAt: Date
  zone: { id: string; name: string; color: string | null }
  assignedTo: { id: string; firstName: string | null; lastName: string | null; email: string } | null
  _count: { leads: number }
}

const TORONTO: LatLng = { lat: 43.6532, lng: -79.3832 }

const PRESET_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
]

function centroid(poly: LatLng[]): LatLng {
  const s = poly.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: s.lat / poly.length, lng: s.lng / poly.length }
}

// ── Manual drawing overlay ────────────────────────────────────────────────────
function ManualDrawingOverlay({ active, vertices, color, onAddVertex }: {
  active: boolean
  vertices: LatLng[]
  color: string
  onAddVertex: (pos: LatLng) => void
}) {
  const map = useMap()
  const onAddRef = useRef(onAddVertex)
  onAddRef.current = onAddVertex

  // Cursor style
  useEffect(() => {
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    if (active) map.setOptions({ draggableCursor: 'crosshair' })
    else map.setOptions({ draggableCursor: '' })
    return () => map.setOptions({ draggableCursor: '' })
  }, [active, map])


  // Mouse-follow guide line
  useEffect(() => {
    if (!active || !map || vertices.length === 0) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    const guideLine = new g.maps.Polyline({
      path: [vertices[vertices.length - 1], vertices[vertices.length - 1]],
      strokeColor: color,
      strokeWeight: 2,
      strokeOpacity: 0.6,
      strokeDashStyle: 'dash',
      clickable: false,
      zIndex: 15,
    })
    guideLine.setMap(map)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moveListener = map.addListener('mousemove', (e: any) => {
      if (e.latLng) guideLine.setPath([vertices[vertices.length - 1], { lat: e.latLng.lat(), lng: e.latLng.lng() }])
    })
    return () => {
      g.maps.event.removeListener(moveListener)
      guideLine.setMap(null)
    }
  }, [active, map, vertices, color])

  // Draw committed vertices as polyline + fill
  useEffect(() => {
    if (!map || vertices.length < 1) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    const overlays: { setMap: (m: null) => void }[] = []

    if (vertices.length >= 2) {
      const line = new g.maps.Polyline({
        path: vertices,
        strokeColor: color,
        strokeWeight: 3,
        strokeOpacity: 0.9,
        clickable: false,
        zIndex: 10,
      })
      line.setMap(map)
      overlays.push(line)
    }

    if (vertices.length >= 3) {
      const fill = new g.maps.Polygon({
        paths: vertices,
        strokeColor: color,
        strokeWeight: 1,
        strokeOpacity: 0.3,
        fillColor: color,
        fillOpacity: 0.18,
        clickable: false,
        zIndex: 5,
      })
      fill.setMap(map)
      overlays.push(fill)
    }

    // Highlight first vertex as close target (when >= 3 vertices)
    if (active && vertices.length >= 3) {
      const closeTarget = new g.maps.Circle({
        center: vertices[0],
        radius: 12,
        strokeColor: color,
        strokeWeight: 3,
        fillColor: 'white',
        fillOpacity: 0.9,
        clickable: false,
        zIndex: 20,
      })
      closeTarget.setMap(map)
      overlays.push(closeTarget)
    }

    return () => overlays.forEach(o => o.setMap(null))
  }, [map, vertices, color, active])

  return null
}

// ── Saved task polygons ───────────────────────────────────────────────────────
function TaskPolygons({ tasks, selectedId, drawing, onSelect }: {
  tasks: RouteTask[]; selectedId: string | null; drawing: boolean; onSelect: (id: string) => void
}) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return
    const overlays = tasks.map(task => {
      const sel = task.id === selectedId
      const pg = new g.maps.Polygon({
        paths: task.polygon as LatLng[],
        strokeColor: task.color,
        strokeOpacity: sel ? 1 : 0.35,
        strokeWeight: sel ? 4 : 1.5,
        fillColor: task.color,
        fillOpacity: sel ? 0.25 : 0.07,
        zIndex: sel ? 2 : 1,
        clickable: !drawing,
      })
      pg.setMap(map)
      if (!drawing) pg.addListener('click', () => onSelect(task.id))
      return pg
    })
    return () => overlays.forEach(p => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).google?.maps.event.clearInstanceListeners(p)
      p.setMap(null)
    })
  }, [map, tasks, selectedId, drawing, onSelect])
  return null
}

// ── Pan map to position ───────────────────────────────────────────────────────
function MapController({ target }: { target: { pos: LatLng; t: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (map && target) { map.panTo(target.pos); map.setZoom(14) }
  }, [target?.t]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { apiKey: string; initialTasks: RouteTask[]; zones: Zone[] }

export default function RoutesClient({ apiKey, initialTasks, zones }: Props) {
  const [mobileTab, setMobileTab]       = useState<'tasks' | 'map'>('tasks')
  const [tasks, setTasks]               = useState<RouteTask[]>(initialTasks)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [drawing, setDrawing]           = useState(false)
  const [draftReady, setDraftReady]     = useState(false)
  const [draftVertices, setDraftVertices] = useState<LatLng[]>([])
  const [draftColor, setDraftColor]     = useState(PRESET_COLORS[0])
  const [taskName, setTaskName]         = useState('')
  const [zoneId, setZoneId]             = useState(zones[0]?.id ?? '')
  const [filterZone, setFilterZone]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [panTarget, setPanTarget]       = useState<{ pos: LatLng; t: number } | null>(null)
  const [isPending, startTransition]    = useTransition()


  const handleStartDrawing = () => {
    setDraftVertices([])
    setDraftReady(false)
    setDrawing(true)
    setSelectedId(null)
  }

  const handleCancelDrawing = () => {
    setDrawing(false)
    setDraftVertices([])
  }

  const handleAddVertex = useCallback((pos: LatLng) => {
    setDraftVertices(v => [...v, pos])
  }, [])

  const drawingRef = useRef(drawing)
  useEffect(() => { drawingRef.current = drawing }, [drawing])
  const draftVerticesRef = useRef(draftVertices)
  useEffect(() => { draftVerticesRef.current = draftVertices }, [draftVertices])

  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!drawingRef.current) return
    const latLng = e.detail.latLng
    if (!latLng) return

    const verts = draftVerticesRef.current
    // Click near first vertex → close polygon
    if (verts.length >= 3) {
      const first = verts[0]
      const dlat = Math.abs(latLng.lat - first.lat)
      const dlng = Math.abs(latLng.lng - first.lng)
      if (dlat < 0.0004 && dlng < 0.0004) {
        setDrawing(false)
        setDraftReady(true)
        return
      }
    }

    setDraftVertices(v => [...v, { lat: latLng.lat, lng: latLng.lng }])
  }, [])

  const handleUndo = () => {
    setDraftVertices(v => v.slice(0, -1))
  }

  const handleClosePolygon = () => {
    setDrawing(false)
    setDraftReady(true)
  }

  const handleDiscardDraft = () => {
    setDraftReady(false)
    setDraftVertices([])
    setTaskName('')
    setDraftColor(PRESET_COLORS[0])
  }

  const handleSave = () => {
    if (!taskName.trim() || draftVertices.length < 3 || !zoneId) return
    startTransition(async () => {
      const result = await createRouteTask({ name: taskName.trim(), polygon: draftVertices, color: draftColor, zoneId })
      if (result.ok) window.location.reload()
    })
  }

  // ── Task selection ────────────────────────────────────────────────────────
  const handleSelectTask = useCallback((task: RouteTask) => {
    setSelectedId(task.id)
    const poly = task.polygon as LatLng[]
    if (poly?.length) setPanTarget({ pos: centroid(poly), t: Date.now() })
  }, [])

  const handleSelectById = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id)
    if (task) {
      setSelectedId(id)
      const poly = task.polygon as LatLng[]
      if (poly?.length) setPanTarget({ pos: centroid(poly), t: Date.now() })
      setMobileTab('tasks')
    }
  }, [tasks])

  const handleDelete = (id: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return
    startTransition(async () => {
      await deleteRouteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      if (selectedId === id) setSelectedId(null)
    })
  }

  const handleRename = (id: string, name: string) => {
    startTransition(async () => {
      await renameRouteTask(id, name)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, name } : t))
    })
  }

  const handleAdminRelease = (id: string) => {
    if (!confirm('Force-release this task? The collector will lose their claim.')) return
    startTransition(async () => {
      await adminReleaseRouteTask(id)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'active', assignedTo: null } : t))
    })
  }

  const zoneFiltered    = filterZone ? tasks.filter(t => t.zoneId === filterZone) : tasks
  const filteredTasks   = filterStatus ? zoneFiltered.filter(t => t.status === filterStatus) : zoneFiltered
  const unassignedTasks = filteredTasks.filter(t => t.status === 'active')
  const assignedTasks   = filteredTasks.filter(t => t.status === 'assigned')
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress')
  const completedTasks  = filteredTasks.filter(t => t.status === 'completed')

  const statusFilters = [
    { value: '',            label: 'All',         count: zoneFiltered.length },
    { value: 'active',      label: 'Unassigned',  count: zoneFiltered.filter(t => t.status === 'active').length },
    { value: 'assigned',    label: 'Accepted',    count: zoneFiltered.filter(t => t.status === 'assigned').length },
    { value: 'in_progress', label: 'In Progress', count: zoneFiltered.filter(t => t.status === 'in_progress').length },
    { value: 'completed',   label: 'Completed',   count: zoneFiltered.filter(t => t.status === 'completed').length },
  ]

  return (
    <div className="-m-4 sm:-m-6 flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Title bar ── */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Route Tasks</h1>
        <p className="text-sm text-gray-500 mt-0.5">Draw and manage collector route zones</p>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="sm:hidden flex shrink-0 bg-white border-b border-gray-200">
        <button onClick={() => setMobileTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${mobileTab === 'tasks' ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-500'}`}>
          <Route size={15} /> Tasks
        </button>
        <button onClick={() => setMobileTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${mobileTab === 'map' ? 'text-blue-700 border-b-2 border-blue-600' : 'text-gray-500'}`}>
          <Map size={15} /> Map
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">

        {/* ── Left panel ── */}
        <div className={`flex-1 sm:flex-none sm:w-72 xl:w-80 sm:shrink-0 flex flex-col overflow-hidden border-r border-gray-200 bg-white ${mobileTab === 'tasks' ? 'flex' : 'hidden'} sm:flex`}>

          {/* Draw button (desktop) */}
          <div className="p-3 border-b border-gray-200 shrink-0 hidden sm:block">
            {!drawing && !draftReady && (
              <button onClick={handleStartDrawing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-colors">
                <PenLine size={15} />
                Draw New Zone
              </button>
            )}
            {drawing && (
              <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2.5 text-xs text-purple-800 space-y-2">
                <p className="font-semibold">Click to add vertices · click start point to close · {draftVertices.length} pts</p>
                <div className="flex gap-1.5">
                  <button onClick={handleUndo} disabled={draftVertices.length === 0}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gray-100 hover:bg-yellow-50 text-yellow-700 text-xs font-bold transition-colors disabled:opacity-30">
                    <Undo2 size={11} /> Undo
                  </button>
                  <button onClick={handleCancelDrawing}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gray-100 hover:bg-red-50 text-red-600 text-xs font-bold transition-colors">
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Zone filter */}
          {zones.length > 1 && (
            <div className="px-3 pt-3 pb-0 shrink-0">
              <select value={filterZone} onChange={e => setFilterZone(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-blue-400">
                <option value="">All Zones</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          )}

          {/* Status filter */}
          <div className="px-3 pt-2 pb-2 shrink-0 flex flex-wrap gap-1">
            {statusFilters.map(f => (
              <button key={f.value} onClick={() => setFilterStatus(f.value)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-colors ${
                  filterStatus === f.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}>
                {f.label} {f.count > 0 && <span className="opacity-70">({f.count})</span>}
              </button>
            ))}
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-gray-50">
            {unassignedTasks.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Unassigned ({unassignedTasks.length})</p>
                {unassignedTasks.map(task => (
                  <TaskCard key={task.id} task={task} selected={selectedId === task.id}
                    onSelect={() => handleSelectTask(task)} onDelete={() => handleDelete(task.id)}
                    onRename={name => handleRename(task.id, name)} onRelease={null} disabled={isPending} />
                ))}
              </div>
            )}
            {assignedTasks.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider px-2 mb-1">Accepted ({assignedTasks.length})</p>
                {assignedTasks.map(task => (
                  <TaskCard key={task.id} task={task} selected={selectedId === task.id}
                    onSelect={() => handleSelectTask(task)} onDelete={() => handleDelete(task.id)}
                    onRename={name => handleRename(task.id, name)} onRelease={() => handleAdminRelease(task.id)} disabled={isPending} />
                ))}
              </div>
            )}
            {inProgressTasks.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider px-2 mb-1">In Progress ({inProgressTasks.length})</p>
                {inProgressTasks.map(task => (
                  <TaskCard key={task.id} task={task} selected={selectedId === task.id}
                    onSelect={() => handleSelectTask(task)} onDelete={() => handleDelete(task.id)}
                    onRename={name => handleRename(task.id, name)} onRelease={() => handleAdminRelease(task.id)} disabled={isPending} />
                ))}
              </div>
            )}
            {completedTasks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider px-2 mb-1">Completed ({completedTasks.length})</p>
                {completedTasks.map(task => (
                  <TaskCard key={task.id} task={task} selected={selectedId === task.id}
                    onSelect={() => handleSelectTask(task)} onDelete={() => handleDelete(task.id)}
                    onRename={name => handleRename(task.id, name)} onRelease={null} disabled={isPending} />
                ))}
              </div>
            )}
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm gap-2">
                <Route size={24} className="opacity-30" />
                {filterZone ? 'No tasks in this zone' : 'No route tasks yet'}
              </div>
            )}
          </div>
        </div>

        {/* ── Map panel ── */}
        <div className={`flex-1 relative flex-col ${mobileTab === 'map' ? 'flex' : 'hidden'} sm:flex`}>
          <APIProvider apiKey={apiKey}>
            <GMap
              defaultCenter={TORONTO}
              defaultZoom={12}
              mapId="admin-routes-map"
              style={{ width: '100%', flex: 1 }}
              gestureHandling="greedy"
              onClick={handleMapClick}
            >
              <MapController target={panTarget} />
              <ManualDrawingOverlay active={drawing} vertices={draftVertices} color={draftColor} onAddVertex={handleAddVertex} />
              {draftReady && draftVertices.length >= 3 && (
                <ManualDrawingOverlay active={false} vertices={draftVertices} color={draftColor} onAddVertex={() => {}} />
              )}
              <TaskPolygons tasks={tasks} selectedId={selectedId} drawing={drawing} onSelect={handleSelectById} />
            </GMap>
          </APIProvider>

          {/* Mobile: Draw controls overlay */}
          <div className="sm:hidden absolute top-3 left-3 z-10 pointer-events-none">
            <div className="pointer-events-auto">
              {!drawing && !draftReady && (
                <button onClick={() => { handleStartDrawing(); setMobileTab('map') }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-lg transition-colors">
                  <PenLine size={15} /> Draw New Zone
                </button>
              )}
              {drawing && (
                <div className="rounded-xl bg-[#0f172a]/95 border border-purple-500/40 px-3 py-3 text-xs text-purple-200 space-y-2 min-w-[170px] shadow-xl">
                  <p className="font-semibold">Tap to add · tap start point to close · {draftVertices.length} pts</p>
                  <div className="flex gap-1.5">
                    <button onClick={handleUndo} disabled={draftVertices.length === 0}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-white/10 hover:bg-yellow-900/40 text-yellow-300 text-xs font-bold transition-colors disabled:opacity-30">
                      <Undo2 size={11} /> Undo
                    </button>
                    <button onClick={handleCancelDrawing}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-white/10 hover:bg-red-900/40 text-xs font-bold transition-colors">
                      <X size={12} /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save panel */}
          {draftReady && (
            <div className="absolute bottom-0 left-0 right-0 bg-[#0f172a] border-t border-white/10 p-5 z-10 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.6)]">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin size={13} />
                Save New Territory · {draftVertices.length} vertices
              </p>
              <input type="text" placeholder="Task name (e.g. North York Block A)"
                value={taskName} onChange={e => setTaskName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 mb-3 text-sm focus:outline-none focus:border-purple-400 placeholder:text-gray-500" />
              <div className="mb-3">
                <p className="text-[11px] text-gray-400 mb-2">Zone color</p>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setDraftColor(c)}
                      className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: draftColor === c ? '3px solid white' : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-[11px] text-gray-400 mb-2">Assign to Zone</p>
                <select value={zoneId} onChange={e => setZoneId(e.target.value)}
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-400">
                  <option value="" disabled className="text-gray-900">Select a zone…</option>
                  {zones.map(z => <option key={z.id} value={z.id} className="text-gray-900">{z.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDiscardDraft} disabled={isPending}
                  className="py-3 px-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <X size={15} /> Discard
                </button>
                <button onClick={() => { setDraftReady(false); setDrawing(true) }} disabled={isPending}
                  className="py-3 px-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Undo2 size={15} /> Edit
                </button>
                <button onClick={handleSave} disabled={isPending || !taskName.trim() || !zoneId || !draftReady}
                  className="flex-1 py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                  <CheckCircle size={15} />
                  {isPending ? 'Saving…' : 'Publish to Collectors'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, selected, onSelect, onDelete, onRename, onRelease, disabled }: {
  task: RouteTask; selected: boolean; onSelect: () => void
  onDelete: () => void; onRename: (name: string) => void; onRelease: (() => void) | null
  disabled: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName]   = useState(task.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (isEditing) inputRef.current?.focus() }, [isEditing])

  const handleSaveRename = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== task.name) onRename(trimmed)
    setIsEditing(false)
  }

  const assigneeName = task.assignedTo
    ? (task.assignedTo.firstName || task.assignedTo.lastName)
      ? `${task.assignedTo.firstName ?? ''} ${task.assignedTo.lastName ?? ''}`.trim()
      : task.assignedTo.email
    : null

  const statusLabel: Record<string, string> = {
    active: 'Unassigned', assigned: 'Accepted', in_progress: 'In Progress', completed: 'Completed',
  }
  const statusColor: Record<string, string> = {
    active: 'bg-purple-100 text-purple-700',
    assigned: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  }

  return (
    <div onClick={isEditing ? undefined : onSelect}
      className={`rounded-lg px-3 py-2.5 cursor-pointer transition-colors mb-1 border ${selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
            {isEditing ? (
              <input ref={inputRef} value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); if (e.key === 'Escape') { setEditName(task.name); setIsEditing(false) } }}
                onBlur={handleSaveRename} onClick={e => e.stopPropagation()}
                className="flex-1 text-sm font-semibold text-gray-900 border-b border-blue-400 bg-transparent outline-none min-w-0" />
            ) : (
              <p className="text-sm font-semibold text-gray-900 truncate">{task.name}</p>
            )}
          </div>
          <p className="text-[11px] text-gray-500">{task.zone.name}</p>
          {assigneeName && <p className="text-[11px] text-blue-600 mt-0.5 truncate">👤 {assigneeName}</p>}
          {task._count.leads > 0 && (
            <p className="text-[11px] text-purple-600 mt-0.5">{task._count.leads} lead{task._count.leads !== 1 ? 's' : ''} collected</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRelease && (
            <button onClick={e => { e.stopPropagation(); onRelease() }} disabled={disabled}
              title="Force-release task"
              className="p-1 rounded text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-40">
              <RotateCcw size={13} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setEditName(task.name); setIsEditing(v => !v) }} disabled={disabled}
            title="Rename task"
            className="p-1 rounded text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-40">
            <Pencil size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} disabled={disabled}
            title="Delete task"
            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <span className={`mt-1.5 inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded ${statusColor[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {statusLabel[task.status] ?? task.status}
      </span>
    </div>
  )
}
