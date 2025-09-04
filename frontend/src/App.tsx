import { Suspense, lazy, useEffect, useState } from 'react'
import { TrafficLights } from './components/TrafficLights'
import { RecentDisasters } from './components/RecentDisasters'
import { Filters } from './components/Filters'
import { useAppStore } from '@/store/appStore'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Bell, Wifi, WifiOff, Moon, Sun } from 'lucide-react'

// Lazy-load heavy components (mapbox-gl, chart.js) to shrink initial bundle
const DisasterMap = lazy(() => import('./components/DisasterMap').then(m => ({ default: m.DisasterMap })))
const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.Statistics })))

export default function App() {
  const { preferences } = useAppStore()
  const qc = useQueryClient()
  const [online, setOnline] = useState(true)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (!preferences.autoRefresh) return
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['disasters'] })
      qc.invalidateQueries({ queryKey: ['countries'] })
    }, preferences.refreshInterval)
    return () => clearInterval(id)
  }, [preferences.autoRefresh, preferences.refreshInterval, qc])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [dark])

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-brand-primary text-white px-3 py-2 rounded-md shadow-md z-50">Skip to main content</a>
      <header className="glass border-b sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 h-[72px] flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <img src="/logo.svg" alt="Flare360 logo" className="h-8 w-8" />
            <span className="text-lg font-semibold">AlertScope</span>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="w-full relative">
              <input
                aria-label="Global search"
                placeholder="Search…"
                className="w-full rounded-lg border border-gray-300 bg-white/70 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center text-xs text-gray-600" aria-live="polite">
              {online ? (
                <span className="inline-flex items-center gap-1 text-green-600"><Wifi className="h-4 w-4"/> Online</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600"><WifiOff className="h-4 w-4"/> Offline</span>
              )}
            </div>
            <button className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Notifications">
              <Bell className="h-5 w-5 text-gray-700" />
              <span className="absolute -top-0.5 -right-0.5 inline-block h-2 w-2 bg-brand-primary rounded-full" aria-hidden />
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5 text-gray-700"/> : <Moon className="h-5 w-5 text-gray-700"/>}
            </button>
            <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700 select-none" aria-label="User Menu">AS</div>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-6 space-y-6">
        <TrafficLights />
        <div className="space-y-6 lg:space-y-0 lg:flex lg:items-start lg:gap-6">
          <div className="order-2 lg:order-1 lg:w-[320px] lg:flex-none">
            <Filters />
          </div>
          <div className="order-1 lg:order-2 lg:flex-1">
            <Suspense fallback={<div className="bg-white border rounded-lg h-[420px] flex items-center justify-center text-sm text-gray-500">Loading map…</div>}>
              <DisasterMap />
            </Suspense>
          </div>
        </div>
        <div className="space-y-6 lg:space-y-0 lg:flex lg:items-start lg:gap-6">
          <div className="order-2 lg:order-1 lg:w-[320px] lg:flex-none">
            <RecentDisasters />
          </div>
          <div className="order-1 lg:order-2 lg:flex-1">
            <Suspense fallback={<div className="bg-white border rounded-lg p-4 text-sm text-gray-500">Loading charts…</div>}>
              <Statistics />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  )
}
