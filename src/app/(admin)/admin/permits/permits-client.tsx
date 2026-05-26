'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  type MapCameraChangedEvent,
} from '@vis.gl/react-google-maps'
import { Search, ChevronLeft, ChevronRight, Loader2, MapPin, Flame } from 'lucide-react'

type Permit = {
  id: string
  permit_num: string
  permit_type: string | null
  status: string | null
  application_date: string | null
  est_const_cost: number | null
  description: string | null
  builder_name: string | null
  street_num: string | null
  street_name: string | null
  street_type: string | null
  street_direction: string | null
  postal: string | null
  ward_grid: string | null
  lat: number | null
  lng: number | null
}

type LatLng = { lat: number; lng: number }

type Bounds = { north: number; south: number; east: number; west: number }

type PermitGroup = {
  key: string
  pos: LatLng
  newest: Permit
  rest: Permit[]
}

function buildAddress(p: Permit): string {
  const parts = [p.street_num, p.street_name, p.street_type, p.street_direction].filter(Boolean)
  return `${parts.join(' ')}, Toronto, ON${p.postal ? ' ' + p.postal : ''}`
}

function formatCurrency(val: number | null): string {
  if (!val) return '—'
  return '$' + Math.round(Number(val)).toLocaleString('en-CA')
}

function formatDate(val: string | null): string {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

const BADGE_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-yellow-100 text-yellow-700',
  'bg-indigo-100 text-indigo-700',
  'bg-red-100 text-red-700',
  'bg-cyan-100 text-cyan-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
]

function strHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function statusBadge(s: string | null): string {
  if (!s) return 'bg-gray-100 text-gray-500'
  return BADGE_PALETTE[strHash(s) % BADGE_PALETTE.length]
}

type HeatCell = { grid_lat: number; grid_lng: number; cnt: number }

const TOP_N = 50
// Each grid cell is ROUND(lat,2) → spans ±0.005 degrees (~550m each side)
const HALF = 0.005

function cellColor(ratio: number): { fill: string; stroke: string } {
  if (ratio > 0.75) return { fill: 'rgba(220,38,38,0.22)',  stroke: '#dc2626' }
  if (ratio > 0.5)  return { fill: 'rgba(234,88,12,0.20)',  stroke: '#ea580c' }
  if (ratio > 0.25) return { fill: 'rgba(202,138,4,0.18)',  stroke: '#ca8a04' }
  return               { fill: 'rgba(37,99,235,0.15)',  stroke: '#2563eb' }
}

function badgeColor(ratio: number): { bg: string; border: string } {
  if (ratio > 0.75) return { bg: '#dc2626', border: '#991b1b' }
  if (ratio > 0.5)  return { bg: '#ea580c', border: '#9a3412' }
  if (ratio > 0.25) return { bg: '#ca8a04', border: '#854d0e' }
  return               { bg: '#2563eb', border: '#1e3a8a' }
}

function HeatmapCells({ cells, bounds, zoom }: { cells: HeatCell[]; bounds: Bounds | null; zoom: number }) {
  const map = useMap()

  // Filter to cells visible in current viewport, then take top N by count
  const top = useMemo(() => {
    const visible = bounds
      ? cells.filter(c =>
          c.grid_lat >= bounds.south && c.grid_lat <= bounds.north &&
          c.grid_lng >= bounds.west  && c.grid_lng <= bounds.east
        )
      : cells
    // cells already sorted DESC by cnt from API
    return visible.slice(0, TOP_N)
  }, [cells, bounds])

  const maxCnt = top.length ? Number(top[0].cnt) : 1

  // Draw grid rectangles via Google Maps API
  useEffect(() => {
    if (!map || !top.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return

    const rects = top.map(cell => {
      const ratio = Number(cell.cnt) / maxCnt
      const { fill, stroke } = cellColor(ratio)
      return new g.maps.Rectangle({
        bounds: {
          north: cell.grid_lat + HALF,
          south: cell.grid_lat - HALF,
          east:  cell.grid_lng + HALF,
          west:  cell.grid_lng - HALF,
        },
        strokeColor: stroke,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        fillColor: fill,
        fillOpacity: 1,
        map,
        zIndex: Math.floor(ratio * 50),
      })
    })

    return () => rects.forEach(r => r.setMap(null))
  }, [map, top, maxCnt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Count badges — only show labels when zoomed in enough to avoid clutter
  if (zoom < 12) return null
  return (
    <>
      {top.map((cell, i) => {
        const ratio = Number(cell.cnt) / maxCnt
        const { bg, border } = badgeColor(ratio)
        return (
          <AdvancedMarker
            key={`badge-${cell.grid_lat},${cell.grid_lng}`}
            position={{ lat: cell.grid_lat, lng: cell.grid_lng }}
            zIndex={TOP_N - i + 100}
          >
            <div style={{
              backgroundColor: bg,
              border: `2px solid ${border}`,
              color: 'white',
              borderRadius: 6,
              padding: '3px 7px',
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              lineHeight: 1.3,
              textAlign: 'center',
            }}>
              {Number(cell.cnt).toLocaleString()}
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}

// Keep the old name as alias so the JSX below doesn't need changing
function HeatmapOverlay({ cells, bounds, zoom }: { cells: HeatCell[]; bounds: Bounds | null; zoom: number }) {
  return <HeatmapCells cells={cells} bounds={bounds} zoom={zoom} />
}

function MapController({ trigger, center }: { trigger: number; center: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (map && center && trigger > 0) {
      map.panTo(center)
      map.setZoom(16)
    }
  }, [trigger]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const TORONTO_CENTER: LatLng = { lat: 43.6532, lng: -79.3832 }
const LIST_PER_PAGE = 50
const MAP_LIMIT = 200

interface Props {
  apiKey: string
  statuses: string[]
  permitTypes: string[]
  totalCount: number
}

export default function PermitsClient({ apiKey, statuses, permitTypes, totalCount }: Props) {
  // ── Filter / search state ─────────────────────────────────────────────────
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [page, setPage] = useState(1)
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list')

  // ── Left panel list (text search, paginated) ──────────────────────────────
  const [listPermits, setListPermits] = useState<Permit[]>([])
  const [total, setTotal] = useState(totalCount)
  const [listLoading, setListLoading] = useState(false)

  // ── Map permits (viewport-based, up to 200, from DB lat/lng) ─────────────
  const [mapPermits, setMapPermits] = useState<Permit[]>([])
  const [mapTotal, setMapTotal] = useState(0)
  const [mapOverLimit, setMapOverLimit] = useState(false)
  const [mapLoading, setMapLoading] = useState(false)

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const [heatmapOn, setHeatmapOn]       = useState(false)
  const [heatCells, setHeatCells]       = useState<HeatCell[]>([])
  const [heatLoading, setHeatLoading]   = useState(false)

  const loadHeatmap = useCallback(async (status: string, type: string, year: string) => {
    setHeatLoading(true)
    try {
      const res = await fetch('/api/admin/permits/heatmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:     status     || undefined,
          permitType: type       || undefined,
          yearFrom:   year       || undefined,
        }),
      })
      const data = await res.json()
      setHeatCells(data.cells ?? [])
    } finally {
      setHeatLoading(false)
    }
  }, [])

  const handleToggleHeatmap = () => {
    if (!heatmapOn) {
      setHeatmapOn(true)
      loadHeatmap(statusFilter, typeFilter, yearFilter)
    } else {
      setHeatmapOn(false)
    }
  }

  // Auto-refresh heatmap when filters change (only if heatmap is on)
  useEffect(() => {
    if (heatmapOn) loadHeatmap(statusFilter, typeFilter, yearFilter)
  }, [statusFilter, typeFilter, yearFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Current map bounds + zoom (for heatmap viewport filtering) ──────────
  const [currentBounds, setCurrentBounds] = useState<Bounds | null>(null)
  const [currentZoom, setCurrentZoom]     = useState(12)

  // ── Map interaction ───────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [infoKey, setInfoKey] = useState<string | null>(null)
  const [mapTrigger, setMapTrigger] = useState(0)
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null)
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const geocodeCache = useRef<Map<string, LatLng | null>>(new Map())
  // Permit clicked from list — re-injected after every viewport reload so it stays visible
  const pinnedPermitRef = useRef<Permit | null>(null)

  // ── Group map permits by address for deduped markers ─────────────────────
  const permitGroups = useMemo<PermitGroup[]>(() => {
    const map = new Map<string, { pos: LatLng; permits: Permit[] }>()
    for (const p of mapPermits) {
      if (p.lat == null || p.lng == null) continue
      const addr = buildAddress(p)
      const pos: LatLng = { lat: p.lat, lng: p.lng }
      if (!map.has(addr)) map.set(addr, { pos, permits: [] })
      map.get(addr)!.permits.push(p)
    }
    return Array.from(map.entries()).map(([key, { pos, permits: ps }]) => ({
      key,
      pos,
      newest: ps[0],
      rest: ps.slice(1),
    }))
  }, [mapPermits])

  const infoGroup = infoKey ? permitGroups.find(g => g.key === infoKey) : null

  // ── Load map permits by viewport bounds ───────────────────────────────────
  const loadMapPermits = useCallback(async (bounds: Bounds) => {
    setMapLoading(true)
    try {
      const res = await fetch('/api/admin/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds }),
      })
      const data = await res.json()
      let newPermits: Permit[] = data.permits ?? []
      // Re-inject pinned permit so its marker stays visible after viewport reload
      const pinned = pinnedPermitRef.current
      if (pinned && !newPermits.some(p => p.id === pinned.id)) {
        newPermits = [pinned, ...newPermits]
      }
      setMapPermits(newPermits)
      setMapTotal(data.total ?? 0)
      setMapOverLimit(data.overLimit ?? false)
    } finally {
      setMapLoading(false)
    }
  }, [])

  const handleBoundsChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      setCurrentBounds(event.detail.bounds)
      setCurrentZoom(event.detail.zoom)
      if (boundsTimerRef.current) clearTimeout(boundsTimerRef.current)
      boundsTimerRef.current = setTimeout(() => {
        loadMapPermits(event.detail.bounds)
      }, 600)
    },
    [loadMapPermits]
  )

  // ── Load left panel list ──────────────────────────────────────────────────
  const doSearch = useCallback(
    async (params: { q: string; status: string; type: string; year: string; page: number }) => {
      setListLoading(true)
      try {
        const res = await fetch('/api/admin/permits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: params.q || undefined,
            status: params.status || undefined,
            permitType: params.type || undefined,
            yearFrom: params.year || undefined,
            page: params.page,
            perPage: LIST_PER_PAGE,
          }),
        })
        const data = await res.json()
        setListPermits(data.permits ?? [])
        setTotal(data.total ?? 0)
        setSelectedId(null)
        setInfoKey(null)
        pinnedPermitRef.current = null
      } finally {
        setListLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    doSearch({ q: '', status: '', type: '', year: '', page: 1 })
  }, [doSearch])

  const handleSearch = () => {
    setPage(1)
    doSearch({ q, status: statusFilter, type: typeFilter, year: yearFilter, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    doSearch({ q, status: statusFilter, type: typeFilter, year: yearFilter, page: newPage })
  }

  const handlePermitClick = useCallback(async (p: Permit) => {
    const addr = buildAddress(p)
    setSelectedId(p.id.toString())
    setInfoKey(addr)

    let pos: LatLng | null = null
    let permitWithCoords = p

    if (p.lat != null && p.lng != null) {
      pos = { lat: p.lat, lng: p.lng }
    } else {
      // Geocode on demand for permits without DB coordinates
      if (geocodeCache.current.has(addr)) {
        pos = geocodeCache.current.get(addr) ?? null
      } else {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${apiKey}`
          )
          const data = await res.json()
          pos = data.results?.[0]?.geometry?.location ?? null
        } catch {
          pos = null
        }
        geocodeCache.current.set(addr, pos)
      }

      if (pos) {
        permitWithCoords = { ...p, lat: pos.lat, lng: pos.lng }
      }
    }

    if (pos) {
      // Pin this permit so viewport reloads keep re-injecting it as a marker
      pinnedPermitRef.current = permitWithCoords
      setMapPermits(prev => {
        const exists = prev.some(x => x.id === p.id)
        if (exists) return prev.map(x => x.id === p.id ? permitWithCoords : x)
        return [permitWithCoords, ...prev]
      })
      setMapCenter(pos)
      setMapTrigger(t => t + 1)
      setMobileView('map')
    }
  }, [apiKey])

  const totalPages = Math.ceil(total / LIST_PER_PAGE)

  return (
    <div className="-m-4 sm:-m-6 flex flex-col sm:flex-row" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Mobile tab toggle */}
      <div className="sm:hidden flex border-b border-border bg-white shrink-0">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mobileView === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-muted-foreground'}`}
        >
          List {total > 0 && `(${total.toLocaleString()})`}
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mobileView === 'map' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-muted-foreground'}`}
        >
          Map
        </button>
      </div>

      {/* Left panel — text search list */}
      <div className={`sm:w-72 xl:w-80 shrink-0 flex-col overflow-hidden border-r border-border bg-white ${mobileView === 'list' ? 'flex flex-1' : 'hidden'} sm:flex sm:flex-none`}>
        <div className="p-3 border-b border-border space-y-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Address, permit #, builder, description"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-md outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex gap-1.5">
            <select
              value={statusFilter}
              onChange={e => {
                const v = e.target.value
                setStatusFilter(v)
                setPage(1)
                doSearch({ q, status: v, type: typeFilter, year: yearFilter, page: 1 })
              }}
              className="flex-1 min-w-0 text-xs border border-input rounded-md px-2 py-1.5 outline-none focus:border-ring bg-background"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => {
                const v = e.target.value
                setTypeFilter(v)
                setPage(1)
                doSearch({ q, status: statusFilter, type: v, year: yearFilter, page: 1 })
              }}
              className="flex-1 min-w-0 text-xs border border-input rounded-md px-2 py-1.5 outline-none focus:border-ring bg-background"
            >
              <option value="">All Types</option>
              {permitTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <select
            value={yearFilter}
            onChange={e => {
              const v = e.target.value
              setYearFilter(v)
              setPage(1)
              doSearch({ q, status: statusFilter, type: typeFilter, year: v, page: 1 })
            }}
            className="w-full text-xs border border-input rounded-md px-2 py-1.5 outline-none focus:border-ring bg-background"
          >
            <option value="">All Years</option>
            {Array.from({ length: new Date().getFullYear() - 2009 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={listLoading}
            className="w-full py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            Search
          </button>
          <p className="text-xs text-muted-foreground">{total.toLocaleString()} results</p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : listPermits.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <MapPin size={24} className="opacity-40" />
              No permits found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {listPermits.map(p => {
                const id = p.id.toString()
                const isSelected = selectedId === id
                return (
                  <button
                    key={id}
                    onClick={() => handlePermitClick(p)}
                    className={[
                      'w-full text-left p-3 transition-colors hover:bg-gray-50',
                      isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-sm text-foreground leading-tight">
                        {p.permit_num}
                      </span>
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge(p.status)}`}>
                        {p.status ?? 'Unknown'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">
                      {buildAddress(p)}
                    </div>
                    {p.permit_type && (
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">{p.permit_type}</div>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(p.application_date)}</span>
                      {p.est_const_cost && (
                        <span className="text-green-700 font-medium">
                          {formatCurrency(p.est_const_cost)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="shrink-0 border-t border-border p-2 flex items-center justify-between">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || listLoading}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-muted-foreground">
              {page.toLocaleString()} / {totalPages.toLocaleString()}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || listLoading}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Map panel */}
      <div className={`flex-1 relative ${mobileView === 'map' ? 'flex' : 'hidden'} sm:flex`}>
        {/* Heatmap toggle */}
        <button
          onClick={handleToggleHeatmap}
          disabled={heatLoading}
          className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md border transition-colors ${
            heatmapOn
              ? 'bg-orange-500 text-white border-orange-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {heatLoading ? <Loader2 size={13} className="animate-spin" /> : <Flame size={13} />}
          Heatmap
        </button>
        <APIProvider apiKey={apiKey}>
          <GMap
            defaultCenter={TORONTO_CENTER}
            defaultZoom={12}
            mapId="permits-map"
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            onBoundsChanged={handleBoundsChanged}
          >
            <MapController trigger={mapTrigger} center={mapCenter} />
            {heatmapOn && <HeatmapOverlay cells={heatCells} bounds={currentBounds} zoom={currentZoom} />}

            {permitGroups.map(group => {
              const isSelected = infoKey === group.key
              const count = group.rest.length + 1
              const bg = isSelected ? '#b91c1c' : '#ef4444'
              const border = isSelected ? '#7f1d1d' : '#b91c1c'
              return (
                <AdvancedMarker
                  key={group.key}
                  position={group.pos}
                  onClick={() => {
                    setInfoKey(group.key)
                    setSelectedId(group.newest.id.toString())
                  }}
                >
                  <div style={{
                    position: 'relative',
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.25)' : 'scale(1)',
                    transformOrigin: 'bottom center',
                    transition: 'transform 0.15s',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                  }}>
                    <MapPin size={28} fill={bg} color={border} strokeWidth={1.5} />
                    {count > 1 && (
                      <div style={{
                        position: 'absolute',
                        top: -5,
                        right: -7,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: '#1d4ed8',
                        color: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        lineHeight: 1,
                      }}>
                        {count > 99 ? '99+' : count}
                      </div>
                    )}
                  </div>
                </AdvancedMarker>
              )
            })}

            {infoGroup && (
              <InfoWindow
                position={infoGroup.pos}
                onCloseClick={() => {
                  setInfoKey(null)
                  setSelectedId(null)
                }}
              >
                <div className="text-sm" style={{ minWidth: 210, maxWidth: 270 }}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-semibold text-gray-900">{infoGroup.newest.permit_num}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge(infoGroup.newest.status)}`}>
                      {infoGroup.newest.status ?? 'Unknown'}
                    </span>
                  </div>
                  <div className="text-gray-600 text-xs">{infoGroup.key}</div>
                  {infoGroup.newest.permit_type && (
                    <div className="text-gray-500 text-xs mt-0.5">{infoGroup.newest.permit_type}</div>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="text-gray-500">{formatDate(infoGroup.newest.application_date)}</span>
                    {infoGroup.newest.est_const_cost && (
                      <span className="text-green-700 font-medium">{formatCurrency(infoGroup.newest.est_const_cost)}</span>
                    )}
                  </div>
                  {infoGroup.newest.builder_name && (
                    <div className="text-gray-500 text-xs mt-1">{infoGroup.newest.builder_name}</div>
                  )}
                  {infoGroup.newest.description && (
                    <div className="text-gray-400 text-xs mt-1 line-clamp-2">{infoGroup.newest.description}</div>
                  )}
                  {infoGroup.rest.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        {infoGroup.rest.length} more permit{infoGroup.rest.length > 1 ? 's' : ''} at this address
                      </div>
                      <div className="space-y-1">
                        {infoGroup.rest.map(p => (
                          <div key={p.id.toString()} className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-gray-700 font-medium">{p.permit_num}</span>
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${statusBadge(p.status)}`}>
                              {p.status ?? '—'}
                            </span>
                            <span className="text-gray-400 shrink-0">{formatDate(p.application_date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GMap>
        </APIProvider>

        {/* Map status overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1.5">
          {mapLoading && (
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md text-xs text-gray-700 border border-gray-200">
              <Loader2 size={12} className="animate-spin text-blue-500" />
              Loading permits…
            </div>
          )}
          {!mapLoading && mapTotal > 0 && (
            <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md text-xs text-gray-700 border border-gray-200">
              {mapOverLimit
                ? `Showing ${MAP_LIMIT.toLocaleString()} of ${mapTotal.toLocaleString()} permits. Zoom in for more details.`
                : `${mapTotal.toLocaleString()} permit${mapTotal !== 1 ? 's' : ''} in this area`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
