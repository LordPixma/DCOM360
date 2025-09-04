import { Suspense, lazy, useEffect, useState } from 'react'
import { TrafficLights } from '@/components/TrafficLights'
import { RecentDisasters } from '@/components/RecentDisasters'
import { Filters } from '@/components/Filters'
import { useAppStore } from '@/store/appStore'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Bell, Wifi, WifiOff, Moon, Sun } from 'lucide-react'
import { NewsTicker } from '@/components/NewsTicker'

// Lazy-load heavy components (mapbox-gl, chart.js) to shrink initial bundle
const DisasterMap = lazy(() => import('@/components/DisasterMap').then(m => ({ default: m.DisasterMap })))
const Statistics = lazy(() => import('@/components/Statistics').then(m => ({ default: m.Statistics })))

export default function App() {
  const { preferences } = useAppStore()
  const qc = useQueryClient()
  const [online, setOnline] = useState(true)
  const [dark, setDark] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') {
        setDark(stored === 'dark')
        return
      }
    } catch {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(prefersDark)
  }, [])

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
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {}
  }, [dark])

  return (
  <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 bg-brand-primary text-white px-3 py-2 rounded-md shadow-md z-50">Skip to main content</a>
      <header className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Flare360</h1>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-lg mx-8">
            <div className="w-full relative">
              <input
                aria-label="Global search"
                placeholder="Search disasters, locations, or events..."
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-11 pr-4 py-2.5 text-sm placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700" aria-live="polite">
              {online ? (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Live</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Offline</span>
                </>
              )}
            </div>
            <button className="relative p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200" aria-label="Notifications">
              <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <span className="absolute -top-1 -right-1 inline-block h-3 w-3 bg-orange-500 rounded-full ring-2 ring-white dark:ring-slate-800" aria-hidden />
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5 text-slate-600 dark:text-slate-400"/> : <Moon className="h-5 w-5 text-slate-600 dark:text-slate-400"/>}
            </button>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md select-none" aria-label="User Menu">AS</div>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 w-full">
        {/* Hero map */}
        <section className="w-full">
          <Suspense fallback={<div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-[56vh] min-h-[420px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">Loading map…</div>}>
            <DisasterMap />
          </Suspense>
        </section>

        {/* Content below hero */}
        <section className="w-full px-6 py-8 space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 space-y-8 order-2 xl:order-1">
              <TrafficLights />
              <Suspense fallback={<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-sm text-slate-500 dark:text-slate-400">Loading charts…</div>}>
                <Statistics />
              </Suspense>
            </div>
            <div className="xl:col-span-4 space-y-8 order-1 xl:order-2">
              <NewsTicker />
              <Filters />
              <RecentDisasters />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
