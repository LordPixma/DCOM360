import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useConfig } from '@/hooks/useConfig'

// Simple heatmap view using MapLibre + a GeoJSON source from /api/disasters/history
export function HeatmapView() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const { data: cfg } = useConfig()
  const { data } = useQuery({
    queryKey: ['history-heatmap', 30],
    queryFn: async () => {
      const res = await api.get('/api/disasters/history?days=30')
      return res.data?.data || []
    },
    staleTime: 5 * 60 * 1000
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const style = cfg?.map_style || undefined
    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false
    })
  }, [cfg?.map_style])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !data) return

    const features = data
      .filter((d: any) => typeof d.longitude === 'number' && typeof d.latitude === 'number')
      .map((d: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.longitude, d.latitude] },
        properties: { severity: d.severity }
      }))

    const src: any = map.getSource('disasters')
    const geojson = { type: 'FeatureCollection', features }
    if (src) (src as maplibregl.GeoJSONSource).setData(geojson as any)
    else {
      map.addSource('disasters', { type: 'geojson', data: geojson as any })
      map.addLayer({
        id: 'disasters-heat',
        type: 'heatmap',
        source: 'disasters',
        paint: {
          'heatmap-weight': [
            'case',
            ['==', ['get', 'severity'], 'red'], 1.0,
            ['==', ['get', 'severity'], 'yellow'], 0.7,
            0.3
          ],
          'heatmap-intensity': 1,
          'heatmap-radius': 30,
          'heatmap-opacity': 0.8,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(59,130,246,0)',
            0.2, 'rgba(96,165,250,0.6)',
            0.4, 'rgba(59,130,246,0.7)',
            0.6, 'rgba(245,158,11,0.8)',
            0.8, 'rgba(239,68,68,0.9)'
          ]
        }
      })
    }
  }, [data])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Heatmap (30 days)</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Frequency of events over the last month</p>
      </div>
      <div ref={containerRef} className="h-[70vh] m-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" />
    </div>
  )
}
