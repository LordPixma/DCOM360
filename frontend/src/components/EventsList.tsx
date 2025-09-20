import { useEffect, useMemo, useRef, useState } from 'react'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCountries } from '@/hooks/useCountries'

export default function EventsList() {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const page = Math.max(parseInt(sp.get('page') || '1', 10), 1)
  const [q, setQ] = useState(sp.get('q') || '')
  const [type, setType] = useState(sp.get('type') || '')
  const [severity, setSeverity] = useState(sp.get('severity') || '')
  const [country, setCountry] = useState(sp.get('country') || '')
  const limit = 20
  const offset = (page - 1) * limit

  const { data, isLoading } = useDisasters({ q, type, severity, country, limit, offset })
  const [items, setItems] = useState<Disaster[]>([])
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const [autoPage, setAutoPage] = useState(page)
  // Reset on filter changes
  useEffect(() => {
    setItems([])
    setAutoPage(1)
    const next = new URLSearchParams(sp)
    if (q) next.set('q', q); else next.delete('q')
    if (type) next.set('type', type); else next.delete('type')
    if (severity) next.set('severity', severity); else next.delete('severity')
    if (country) next.set('country', country); else next.delete('country')
    next.set('page', '1')
    setSp(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, severity, country])
  // Append data as pages load
  useEffect(() => {
    if (data && data.length) {
      setItems(prev => (autoPage === 1 ? data : [...prev, ...data]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading && (data?.length || 0) >= limit) {
        const nextPage = autoPage + 1
        setAutoPage(nextPage)
        const next = new URLSearchParams(sp)
        next.set('page', String(nextPage))
        setSp(next, { replace: true })
      }
    }, { rootMargin: '200px' })
    ob.observe(el)
    return () => ob.disconnect()
  }, [isLoading, data, limit, autoPage, sp, setSp])

  const { data: countries } = useCountries()
  const countryOptions = useMemo(() => [
    { value: '', label: 'All countries' },
    ...(countries || []).map(c => ({ value: c.code, label: c.name }))
  ], [countries])

  const dotClass = (sev?: string) => {
    const v = (sev || '').toLowerCase()
    if (v === 'red') return 'bg-red-500'
    if (v === 'yellow' || v === 'orange') return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">All Events</h1>
          <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline">Back</button>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="">All types</option>
              <option value="earthquake">Earthquake</option>
              <option value="flood">Flood</option>
              <option value="wildfire">Wildfire</option>
              <option value="cyclone">Cyclone</option>
              <option value="volcano">Volcano</option>
            </select>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              <option value="">All severities</option>
              <option value="red">Critical</option>
              <option value="yellow">Warning</option>
              <option value="green">Monitoring</option>
            </select>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
              {countryOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button onClick={() => { setQ(''); setType(''); setSeverity(''); setCountry('') }} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm">Clear</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No events found</div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((d) => (
                <li key={d.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 h-3 w-3 rounded-full mt-1.5 ${dotClass(d.severity)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <button onClick={() => navigate(`/disaster/${d.id}`)} className="font-semibold text-left text-slate-900 dark:text-white hover:underline line-clamp-2">
                          {d.title}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{new Date(d.occurred_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {d.type}{d.country ? ` • ${d.country}` : ''}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

  <div ref={loaderRef} className="py-6 text-center text-sm text-slate-500">{isLoading ? 'Loading…' : ' '}</div>
      </div>
    </div>
  )
}
