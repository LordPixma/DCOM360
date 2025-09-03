import { Suspense, lazy } from 'react'
import { TrafficLights } from './components/TrafficLights'
import { RecentDisasters } from './components/RecentDisasters'
import { Filters } from './components/Filters'

// Lazy-load heavy components (mapbox-gl, chart.js) to shrink initial bundle
const DisasterMap = lazy(() => import('./components/DisasterMap').then(m => ({ default: m.DisasterMap })))
const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.Statistics })))

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">DCOM360</h1>
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
