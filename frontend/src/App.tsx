import { TrafficLights } from './components/TrafficLights'
import { DisasterMap } from './components/DisasterMap'
import { RecentDisasters } from './components/RecentDisasters'
import { Filters } from './components/Filters'

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
          <div className="lg:col-span-3">
            <DisasterMap />
          </div>
          <div className="lg:col-span-2">
            <RecentDisasters />
          </div>
        </div>
      </main>
    </div>
  )
}
