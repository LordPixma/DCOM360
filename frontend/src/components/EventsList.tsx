import { useEffect, useMemo, useState } from 'react'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function EventsList() {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const page = Math.max(parseInt(sp.get('page') || '1', 10), 1)
  const q = sp.get('q') || ''
  const type = sp.get('type') || ''
  const severity = sp.get('severity') || ''
  const country = sp.get('country') || ''
  const limit = 20
  const offset = (page - 1) * limit

  const { data, isLoading } = useDisasters({ q, type, severity, country, limit, offset })
  const [items, setItems] = useState<Disaster[]>([])
  useEffect(() => { setItems(data || []) }, [data])

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(sp)
    if (v) next.set(k, v); else next.delete(k)
    if (k !== 'page') next.set('page', '1')
    setSp(next, { replace: true })
  }

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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Search" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <input value={type} onChange={(e) => setParam('type', e.target.value)} placeholder="Type (earthquake, flood...)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <input value={severity} onChange={(e) => setParam('severity', e.target.value)} placeholder="Severity (red, yellow, green)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <input value={country} onChange={(e) => setParam('country', e.target.value)} placeholder="Country code (US, NG, ...)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
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

        <div className="flex items-center justify-between mt-4">
          <button disabled={page<=1} onClick={() => setParam('page', String(page-1))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50">Prev</button>
          <div className="text-xs text-slate-500">Page {page}</div>
          <button disabled={(items?.length||0) < limit} onClick={() => setParam('page', String(page+1))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  )
}
