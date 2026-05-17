'use client'

import { useEffect } from 'react'
import {
  APIProvider,
  Map as GMap,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'

type LatLng = { lat: number; lng: number }

function TerritoryOverlay({ polygon, color }: { polygon: LatLng[]; color: string }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !polygon.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google
    if (!g) return

    const polyline = new g.maps.Polyline({
      path: polygon,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight: 5,
    })
    polyline.setMap(map)

    const poly = new g.maps.Polygon({
      paths: polygon,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: color,
      fillOpacity: 0.12,
    })
    poly.setMap(map)

    // Fit map to polygon bounds
    const bounds = new g.maps.LatLngBounds()
    polygon.forEach((p: LatLng) => bounds.extend(p))
    map.fitBounds(bounds, 60)

    return () => {
      polyline.setMap(null)
      poly.setMap(null)
    }
  }, [map, polygon, color])

  return null
}

interface Props {
  apiKey: string
  polygon: LatLng[]
  color: string
  center: LatLng
}

export default function RouteMap({ apiKey, polygon, color, center }: Props) {
  return (
    <APIProvider apiKey={apiKey}>
      <GMap
        defaultCenter={center}
        defaultZoom={14}
        mapId="collector-route-map"
        style={{ width: '100%', height: '100%' }}
        gestureHandling="greedy"
      >
        {polygon.length > 0 && (
          <TerritoryOverlay polygon={polygon} color={color} />
        )}
        {polygon.length > 0 && (
          <AdvancedMarker position={polygon[0]} zIndex={30}>
            <div className="flex flex-col items-center">
              <div className="bg-green-600 text-white px-3 py-1 rounded-md text-xs font-black shadow-lg border-2 border-white whitespace-nowrap mb-1">
                START HERE
              </div>
              <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#16a34a', border: '2.5px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
            </div>
          </AdvancedMarker>
        )}
        {polygon.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <MapPin size={24} />
          </div>
        )}
      </GMap>
    </APIProvider>
  )
}
