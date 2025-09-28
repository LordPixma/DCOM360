import React from 'react'
import { useWildfireClusters } from '@/hooks/useWildfireClusters'
import { Flame } from 'lucide-react'

function trendColor(trend?: string) {
  switch (trend) {
    case 'rising': return 'text-red-600 dark:text-red-400'
    case 'falling': return 'text-emerald-600 dark:text-emerald-400'
    case 'stable': return 'text-amber-600 dark:text-amber-400'
    default: return 'text-slate-500'
  }
}

function relativeTime(iso?: string) {
  if (!iso) return '—'
  const dt = new Date(iso).getTime()
  const diff = Date.now() - dt
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const WildfireClusters: React.FC<{ limit?: number }> = ({ limit = 25 }) => {
  const { data, isLoading, isError, refetch, isFetching } = useWildfireClusters({ limit })

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm tracking-wide text-slate-700 dark:text-slate-200 flex items-center gap-1"><Flame className="w-4 h-4" /> Wildfire Clusters</h3>
        <button onClick={() => refetch()} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {isLoading && <div className="text-xs text-slate-500">Loading clusters…</div>}
      {isError && <div className="text-xs text-red-500">Failed to load clusters.</div>}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="text-xs text-slate-500">No clusters detected.</div>
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="font-medium py-1 pr-3">Key</th>
                <th className="font-medium py-1 pr-3">Det 6h</th>
                <th className="font-medium py-1 pr-3">Det 24h</th>
                <th className="font-medium py-1 pr-3">Growth</th>
                <th className="font-medium py-1 pr-3">Area km²</th>
                <th className="font-medium py-1 pr-3">Intensity</th>
                <th className="font-medium py-1 pr-3">Last</th>
              </tr>
            </thead>
            <tbody>
              {data.map(c => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1 pr-3 font-medium text-slate-700 dark:text-slate-200">{c.cluster_key}</td>
                  <td className="py-1 pr-3">{c.detections_6h}</td>
                  <td className="py-1 pr-3">{c.detections_24h}</td>
                  <td className={`py-1 pr-3 ${trendColor(c.trend)}`}>{c.growth_rate != null ? `${(c.growth_rate * 100).toFixed(0)}%` : '—'}</td>
                  <td className="py-1 pr-3">{c.area_estimate_km2 != null ? c.area_estimate_km2.toFixed(1) : '—'}</td>
                  <td className="py-1 pr-3">{c.intensity_score != null ? c.intensity_score.toFixed(1) : '—'}</td>
                  <td className="py-1 pr-3" title={c.last_detected}>{relativeTime(c.last_detected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
