import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

export function DisasterMap() {
  const filters = useAppStore((s) => s.filters)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const { data, isLoading } = useDisasters({ limit: 200, ...filters })

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 1.3
    })
  }, [])

  // Render markers when data changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // clear old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const bounds = new mapboxgl.LngLatBounds()
    let added = 0
    data?.forEach((d: Disaster) => {
      if (typeof d.longitude !== 'number' || typeof d.latitude !== 'number') return
  const el = document.createElement('div')
  const size = d.severity === 'red' ? 40 : d.severity === 'yellow' ? 32 : 24
      const color = d.severity === 'red' ? '#FF4444' : d.severity === 'yellow' ? '#FF8800' : '#00CC66'
  const pulse = d.severity !== 'green' ? ' animate-pulseSoft' : ''
  el.className = 'rounded-full shadow-md' + pulse
      el.style.width = `${size}px`
      el.style.height = `${size}px`
      el.style.background = color
      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
      el.style.opacity = '0.9'

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([d.longitude!, d.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<div style="font-size:12px"><strong>${d.title}</strong><br/>${d.type} • ${d.country ?? 'N/A'}<br/>Severity: ${d.severity}</div>`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([d.longitude!, d.latitude!])
      added++
    })

    if (added) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 5 })
    }
  }, [data])

  return (
    <div className="relative bg-white border rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="text-sm text-gray-700 font-medium">Global Map</div>
        <div className="text-xs text-gray-500">{isLoading ? 'Loading…' : `${data?.length || 0} active events`}</div>
      </div>
      <div ref={containerRef} className="h-[420px]" />
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur rounded-md border px-3 py-2 text-xs text-gray-700 shadow-sm">
        <div className="font-medium mb-1">Legend</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-status-green" /> Low</div>
          <div className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-status-orange" /> Medium</div>
          <div className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-status-red" /> High</div>
        </div>
      </div>
    </div>
  )
}
