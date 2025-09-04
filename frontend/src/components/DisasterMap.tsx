import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { Map, Layers, ZoomIn } from 'lucide-react'

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined) || ''
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN
}

export function DisasterMap() {
  const filters = useAppStore((s) => s.filters)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const { data, isLoading } = useDisasters({ limit: 200, ...filters })

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 1.3,
      attributionControl: false
    })
    
    // Add custom controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right')
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
      const color = d.severity === 'red' ? '#ef4444' : d.severity === 'yellow' ? '#f59e0b' : '#10b981'
      const pulse = d.severity !== 'green' ? ' animate-pulse' : ''
      
      el.className = 'rounded-full shadow-lg border-2 border-white cursor-pointer transition-transform hover:scale-110' + pulse
      el.style.width = `${size}px`
      el.style.height = `${size}px`
      el.style.background = `radial-gradient(circle, ${color}, ${color}dd)`
      el.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([d.longitude!, d.latitude!])
        .setPopup(
          new mapboxgl.Popup({ 
            offset: 15,
            className: 'custom-popup',
            closeButton: true,
            closeOnClick: false
          }).setHTML(
            `<div class="p-3">
              <div class="font-bold text-slate-900 mb-2">${d.title}</div>
              <div class="space-y-1 text-sm text-slate-600">
                <div><span class="font-medium">Type:</span> ${d.type}</div>
                <div><span class="font-medium">Location:</span> ${d.country ?? 'Unknown'}</div>
                <div><span class="font-medium">Severity:</span> 
                  <span class="inline-flex items-center gap-1">
                    <span class="h-2 w-2 rounded-full" style="background-color: ${color}"></span>
                    ${d.severity === 'red' ? 'Critical' : d.severity === 'yellow' ? 'Warning' : 'Monitoring'}
                  </span>
                </div>
              </div>
            </div>`
          )
        )
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend([d.longitude!, d.latitude!])
      added++
    })

    if (added) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
      const padding = vw < 640 ? 24 : vw < 1024 ? 40 : 60
      map.fitBounds(bounds, { padding, maxZoom: 6 })
    }
  }, [data])

  return (
    <div className="relative w-full border-b border-slate-200 dark:border-slate-700">
      <div ref={containerRef} className="h-[48vh] min-h-[320px] sm:h-[56vh] sm:min-h-[420px] w-full" />
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Map unavailable</p>
            <p className="text-sm text-slate-500 dark:text-slate-500">Mapbox token required</p>
          </div>
        </div>
      )}
      {/* Overlay header */}
      <div className="pointer-events-none absolute top-3 sm:top-4 left-3 right-3 sm:left-6 sm:right-6 flex flex-col gap-3 sm:flex-row items-start justify-between">
        <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 sm:px-4 shadow-lg pointer-events-auto">
          <h3 className="font-bold text-slate-900 dark:text-white">Global Map</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">{isLoading ? 'Loading events...' : `${data?.length || 0} active events worldwide`}</p>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-2 sm:p-3 shadow-lg pointer-events-auto">
          <div className="font-semibold text-slate-900 dark:text-white text-xs mb-1 sm:mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Legend
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-green-500"></span> Monitoring</div>
            <div className="flex items-center gap-2"><span className="h-4 w-4 rounded-full bg-orange-500"></span> Warning</div>
            <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-red-500"></span> Critical</div>
          </div>
        </div>
      </div>
    </div>
  )
}
