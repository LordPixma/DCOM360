import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { TrafficLights } from '@/components/TrafficLights'
import { RecentDisasters } from '@/components/RecentDisasters'
import { Filters } from '@/components/Filters'
import { RealTimeAlerts } from '@/components/RealTimeAlerts'
import { useAppStore } from '@/store/appStore'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Bell, Moon, Sun, Share2 } from 'lucide-react'
import { NewsTicker } from '@/components/NewsTicker'
import { ApiStatus } from '@/components/ApiStatus'
import { Link, useNavigate } from 'react-router-dom'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { clearAdminEmail, clearAdminToken } from '@/lib/adminApi'

// Lazy-load heavy components (maplibre-gl, chart.js) to shrink initial bundle
const DisasterMap = lazy(() => import('@/components/DisasterMap').then(m => ({ default: m.DisasterMap })))
const Statistics = lazy(() => import('@/components/Statistics').then(m => ({ default: m.Statistics })))

export default function App() {
  const { preferences } = useAppStore()
  const qc = useQueryClient()
  const [online, setOnline] = useState(true)
  const [dark, setDark] = useState(false)
  const [query, setQuery] = useState('')
  const [showSuggest, setShowSuggest] = useState(false)
  const suggestRef = useRef<HTMLDivElement | null>(null)
  const vizRef = useRef<HTMLDivElement | null>(null)
  const profileRef = useRef<HTMLDivElement | null>(null)
  const [vizOpen, setVizOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [adminEmail, setAdminEmail] = useState<string>('')
  const nav = useNavigate()
  const { data: suggestions } = useDisasters({ limit: 6, ...(query ? { } : {}), ...(query ? {} : {}) })
  const filteredSuggest = useMemo(() => {
    if (!query) return []
    return (suggestions ?? []).filter((d: Disaster) => d.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
  }, [suggestions, query])

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

  // Initialize auth/email from sessionStorage
  useEffect(() => {
    try {
      const t = sessionStorage.getItem('ADMIN_TOKEN')
      const e = sessionStorage.getItem('ADMIN_EMAIL')
      setAuthed(Boolean(t && e))
      setAdminEmail(e || '')
    } catch {}
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

  // Global handlers to close menus on outside click or ESC
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node
      if (vizRef.current && !vizRef.current.contains(t)) setVizOpen(false)
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setVizOpen(false); setProfileOpen(false) }
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
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
            <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Flare360</h1>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-lg mx-8 relative" ref={suggestRef}>
            <div className="w-full relative">
              <input
                aria-label="Global search"
                placeholder="Search disasters, locations, or events..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggest(true) }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-11 pr-4 py-2.5 text-sm placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all duration-200"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {showSuggest && query && filteredSuggest.length > 0 && (
                <div className="absolute z-30 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                  <ul className="max-h-72 overflow-auto">
                    {filteredSuggest.map(s => (
                      <li key={s.id} className="px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                        // Navigate via URL hash to shareable link
                        const url = new URL(window.location.href)
                        url.searchParams.set('disasterId', s.id)
                        window.history.replaceState({}, '', url.toString())
                        setQuery(''); setShowSuggest(false)
                        // Smooth scroll to list card section
                        document.getElementById('recent')?.scrollIntoView({ behavior: 'smooth' })
                      }}>
                        <div className="font-medium text-slate-900 dark:text-white line-clamp-1">{s.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{s.type}{s.country ? ` • ${s.country}` : ''}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
            <div className="hidden md:block">
              <ApiStatus />
            </div>
            {/* Visualizations dropdown */}
            <div ref={vizRef} className="relative hidden md:block">
              <button
                onClick={() => setVizOpen(v => !v)}
                className="inline-flex items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200"
                aria-haspopup="menu"
                aria-expanded={vizOpen}
              >
                Visualizations
              </button>
              {vizOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-30">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Basic Views</div>
                  <Link onClick={() => setVizOpen(false)} to="/viz/heatmap" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">📊 Simple Heatmap</Link>
                  <Link onClick={() => setVizOpen(false)} to="/viz/compare" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">📈 Comparative Analysis</Link>
                  <Link onClick={() => setVizOpen(false)} to="/viz/trends" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">📉 Historical Trends</Link>
                  
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-t border-b border-slate-200 dark:border-slate-700">🧠 AI-Powered</div>
                  <Link onClick={() => setVizOpen(false)} to="/viz/predict" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">🔮 Predictive Analytics</Link>
                  <Link onClick={() => setVizOpen(false)} to="/viz/heatmap-advanced" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">🗺️ Advanced Heatmap</Link>
                </div>
              )}
            </div>
            <Link to="/admin" className="hidden md:inline-flex items-center px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200">Admin</Link>
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
            <button
              onClick={() => {
                const shareUrl = window.location.href
                if (navigator.share) {
                  navigator.share({ title: 'Flare360', url: shareUrl }).catch(() => {})
                } else {
                  navigator.clipboard?.writeText(shareUrl)
                }
              }}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
              aria-label="Share current view"
              title="Share current view"
            >
              <Share2 className="h-5 w-5 text-slate-600 dark:text-slate-400"/>
            </button>
            {/* Profile menu */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(p => !p)}
                className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-md select-none focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="User menu"
                title={authed ? adminEmail : 'Guest'}
              >
                {(() => {
                  const src = adminEmail || 'Guest User'
                    const parts = src.split('@')[0].split(/[\W_]+/).filter(Boolean)
                  const initials = (parts[0]?.[0] || 'G') + (parts[1]?.[0] || (parts[0]?.[1] || 'U'))
                  return initials.toUpperCase()
                })()}
              </button>
              {profileOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-30">
                  <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">{authed ? adminEmail : 'Not signed in'}</div>
                  <div className="border-t border-slate-200 dark:border-slate-700" />
                  <button
                    disabled
                    className="w-full text-left px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                    title="Coming soon"
                  >
                    Profile (soon)
                  </button>
                  <Link onClick={() => setProfileOpen(false)} to="/admin" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">Admin Dashboard</Link>
                  {authed ? (
                    <button
                      onClick={() => {
                        clearAdminEmail(); clearAdminToken(); setAuthed(false); setAdminEmail(''); setProfileOpen(false); nav('/', { replace: true })
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Sign out
                    </button>
                  ) : (
                    <Link onClick={() => setProfileOpen(false)} to="/admin/login" className="block px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50">Sign in</Link>
                  )}
                </div>
              )}
            </div>
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

        {/* Live updates ticker directly under the map, full width */}
        <section className="w-full px-4 sm:px-6 pt-4 sm:pt-6">
          <NewsTicker />
        </section>

        {/* Content below hero */}
        <section className="w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
            <div className="xl:col-span-8 space-y-6 sm:space-y-8 order-2 xl:order-1">
              <TrafficLights />
              <Suspense fallback={<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-sm text-slate-500 dark:text-slate-400">Loading charts…</div>}>
                <Statistics />
              </Suspense>
            </div>
            <div className="xl:col-span-4 space-y-6 sm:space-y-8 order-1 xl:order-2">
              <Filters />
              <RecentDisasters />
            </div>
          </div>
        </section>
      </main>
      
      {/* Real-time alerts overlay */}
      <RealTimeAlerts />
    </div>
  )
}
