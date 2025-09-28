import React from 'react'
import { useFeedHealth } from '@/hooks/useFeedHealth'

function statusColor(status: string) {
  switch (status) {
    case 'OK': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    case 'DEGRADED': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    case 'FAILING': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  }
}

function freshness(sec?: number) {
  if (sec == null) return '—'
  if (sec < 90) return 'just now'
  const m = Math.round(sec/60)
  if (m < 60) return `${m}m`
  const h = Math.round(m/60)
  if (h < 48) return `${h}h`
  const d = Math.round(h/24)
  return `${d}d`
}

export const FeedHealthStatus: React.FC = () => {
  const { data, isLoading, isError, refetch, isFetching } = useFeedHealth()
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm tracking-wide text-slate-700 dark:text-slate-200">Feed Health</h3>
        <button onClick={() => refetch()} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {isLoading && <div className="text-xs text-slate-500">Loading feed status…</div>}
      {isError && <div className="text-xs text-red-500">Failed to load feed status.</div>}
      {!isLoading && !isError && data && (
        <div className="flex flex-col gap-2">
          {data.map(f => (
            <div key={f.feed} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(f.status)}`}>{f.status}</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{f.feed}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <span title={f.last_success ? `Last success: ${f.last_success}` : ''}>fresh: {freshness(f.freshness_seconds)}</span>
                {f.consecutive_failures > 0 && <span className="text-red-500" title={`Consecutive failures: ${f.consecutive_failures}`}>fails: {f.consecutive_failures}</span>}
                {f.avg_latency_ms != null && <span>{Math.round(f.avg_latency_ms)}ms</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
