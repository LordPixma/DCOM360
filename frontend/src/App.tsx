import { Suspense, lazy, useEffect } from 'react'
import { TrafficLights } from './components/TrafficLights'
import { RecentDisasters } from './components/RecentDisasters'
import { Filters } from './components/Filters'
import { useAppStore } from '@/store/appStore'
import { useQueryClient } from '@tanstack/react-query'

// Lazy-load heavy components (mapbox-gl, chart.js) to shrink initial bundle
const DisasterMap = lazy(() => import('./components/DisasterMap').then(m => ({ default: m.DisasterMap })))
const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.Statistics })))

export default function App() {
  const { preferences } = useAppStore()
  const qc = useQueryClient()

  useEffect(() => {
    if (!preferences.autoRefresh) return
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['disasters'] })
      qc.invalidateQueries({ queryKey: ['countries'] })
    }, preferences.refreshInterval)
    return () => clearInterval(id)
  }, [preferences.autoRefresh, preferences.refreshInterval, qc])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Flare360 logo" className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Flare360</h1>
          </div>
          <nav className="text-sm text-gray-600">Disaster Monitoring Dashboard</nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        <TrafficLights />
        <Filters />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Suspense fallback={<div className="bg-white border rounded-lg h-[420px] flex items-center justify-center text-sm text-gray-500">Loading map…</div>}>
              <DisasterMap />
            </Suspense>
            <Suspense fallback={<div className="bg-white border rounded-lg p-4 text-sm text-gray-500">Loading charts…</div>}>
              <Statistics />
            </Suspense>
          </div>
          <div className="lg:col-span-2">
            <RecentDisasters />
          </div>
        </div>
      </main>
    </div>
  )
}
