import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { format } from 'date-fns'
import { Clock, MapPin, AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export function RecentDisasters() {
  const filters = useAppStore((s) => s.filters)
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState<Disaster[]>([])
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const { data, isLoading } = useDisasters({ limit: 20, offset, ...filters })
  const targetId = useMemo(() => new URLSearchParams(window.location.search).get('disasterId'), [])

  useEffect(() => { setItems([]); setOffset(0) }, [filters.country, filters.severity, filters.type])
  useEffect(() => { if (data && data.length) setItems(prev => [...prev, ...data]) }, [data])
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const ob = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoading && (data?.length || 0) >= 20) {
        setOffset(o => o + 20)
      }
    }, { rootMargin: '200px' })
    ob.observe(el)
    return () => ob.disconnect()
  }, [isLoading, data])
  
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Recent Events</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Latest disaster updates</p>
          </div>
        </div>
      </div>
      
  <div id="recent" className="max-h-[600px] overflow-auto">
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
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {items.map((d: Disaster) => (
              <li key={d.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150 ${targetId === d.id ? 'ring-2 ring-blue-500 rounded-xl' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 h-3 w-3 rounded-full mt-1.5 ${
                    d.severity === 'red' 
                      ? 'bg-red-500 shadow-lg shadow-red-500/30' 
                      : d.severity === 'yellow' 
                      ? 'bg-orange-500 shadow-lg shadow-orange-500/30' 
                      : 'bg-green-500 shadow-lg shadow-green-500/30'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight mb-2">
                      {d.title}
                    </h4>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg font-medium">
                        {d.type}
                      </span>
                      {d.country && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {d.country}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(d.occurred_at), 'MMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            <div ref={loaderRef} className="p-4 text-center text-xs text-slate-500">{isLoading ? 'Loading…' : ' '}</div>
          </ul>
        )}
      </div>
    </div>
  )
}
