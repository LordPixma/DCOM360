import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string

export function DisasterMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const { data, isLoading } = useDisasters({ limit: 200 })

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
      el.className = 'rounded-full border-2 bg-white'
      el.style.width = '12px'
      el.style.height = '12px'
      el.style.borderColor = d.severity === 'red' ? '#dc2626' : d.severity === 'yellow' ? '#eab308' : '#22c55e'

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
    <div className="bg-white border rounded-lg h-[420px]">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <div className="text-sm text-gray-600">Interactive Map</div>
        <div className="text-xs text-gray-500">{isLoading ? 'Loading…' : `${data?.length || 0} active events`}</div>
      </div>
      <div ref={containerRef} className="h-[372px]" />
    </div>
  )
}
