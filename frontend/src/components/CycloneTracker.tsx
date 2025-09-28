import React from 'react'
import { useCyclones } from '@/hooks/useCyclones'
import { CycloneDetailModal } from './CycloneDetailModal'

function formatWind(kt?: number) {
  if (!kt) return '—'
  const mph = Math.round(kt * 1.15078)
  return `${kt} kt (${mph} mph)`
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

export const CycloneTracker: React.FC = () => {
  const { data, isLoading, isError, refetch, isFetching } = useCyclones()
  const [selected, setSelected] = React.useState<string | null>(null)
  const active = data?.find(c => c.id === selected) || null

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm tracking-wide text-slate-700 dark:text-slate-200">Active Cyclones</h3>
        <button onClick={() => refetch()} className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {isLoading && <div className="text-xs text-slate-500">Loading cyclones…</div>}
      {isError && <div className="text-xs text-red-500">Failed to load cyclones.</div>}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="text-xs text-slate-500">No active cyclones detected.</div>
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="font-medium py-1 pr-3">Name</th>
                <th className="font-medium py-1 pr-3">Cat</th>
                <th className="font-medium py-1 pr-3">Wind</th>
                <th className="font-medium py-1 pr-3">Pressure</th>
                <th className="font-medium py-1 pr-3">Movement</th>
                <th className="font-medium py-1 pr-3">Advisory</th>
              </tr>
            </thead>
            <tbody>
              {data.map(c => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60" onClick={() => setSelected(c.id)}>
                  <td className="py-1 pr-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">{c.name}</td>
                  <td className="py-1 pr-3">{c.category || '—'}</td>
                  <td className="py-1 pr-3">{formatWind(c.max_wind_kt)}</td>
                  <td className="py-1 pr-3">{c.min_pressure_mb ? `${c.min_pressure_mb} mb` : '—'}</td>
                  <td className="py-1 pr-3">{c.movement ? `${c.movement.direction || ''} ${c.movement.speed_kt || ''}`.trim() || '—' : '—'}</td>
                  <td className="py-1 pr-3" title={c.advisory_time}>{relativeTime(c.advisory_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CycloneDetailModal cyclone={active} onClose={() => setSelected(null)} />
    </div>
  )
}
