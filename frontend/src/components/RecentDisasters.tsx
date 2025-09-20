import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { Clock, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

export function RecentDisasters() {
  const filters = useAppStore((s) => s.filters)
  const [items, setItems] = useState<Disaster[]>([])
  const parentRef = useRef<HTMLDivElement | null>(null)
  const { data, isLoading } = useDisasters({ limit: 5, offset: 0, ...filters })
  const navigate = useNavigate()
  const targetId = useMemo(() => new URLSearchParams(window.location.search).get('disasterId'), [])

  useEffect(() => { setItems([]) }, [filters.country, filters.severity, filters.type])
  useEffect(() => { if (data && data.length) setItems(data) }, [data])

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 8,
  })

  const dotClass = (sev?: string) => {
    const v = (sev || '').toLowerCase()
    if (v === 'red') return 'bg-red-500 shadow-lg shadow-red-500/30'
    if (v === 'yellow' || v === 'orange') return 'bg-orange-500 shadow-lg shadow-orange-500/30'
    return 'bg-green-500 shadow-lg shadow-green-500/30'
  }

  const fmtUTC = (ts: string) => {
    try { return new Date(ts).toLocaleString('en-GB', { timeZone: 'UTC', hour12: false }) + ' UTC' } catch { return ts }
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white">Recent Events</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block">Latest disaster updates</p>
          </div>
          <button onClick={() => navigate('/events')} className="text-xs text-blue-600 hover:underline">View all</button>
        </div>
      </div>

      <div id="recent" ref={parentRef} className="max-h-[600px] overflow-auto">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading events...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No events found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            <ul
              className="absolute top-0 left-0 w-full divide-y divide-slate-200 dark:divide-slate-700"
              style={{ transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)` }}
            >
              {rowVirtualizer.getVirtualItems().map((row) => {
                const d = items[row.index] as Disaster
                return (
                  <li
                    key={d.id}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${targetId === d.id ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/disaster/${d.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/disaster/${d.id}`) }}
                    aria-label={`View details for ${d.title}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 h-3 w-3 rounded-full mt-1.5 ${dotClass(d.severity)}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-2 flex items-center gap-2">
                            <span className="truncate">{d.title}</span>
                            {d.source && (
                              <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50">
                                {d.source}
                              </span>
                            )}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap" title={new Date(d.occurred_at).toISOString()}>{fmtUTC(d.occurred_at)}</span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {d.type}{d.country ? ` • ${d.country}` : ''}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
  {/* Pagination removed; limiting to 5 items */}
      </div>
    </div>
  )
}
