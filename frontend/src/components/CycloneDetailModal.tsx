import React from 'react'
import { Cyclone } from '@/hooks/useCyclones'

interface Props {
  cyclone: Cyclone | null
  onClose: () => void
}

function formatWind(kt?: number) {
  if (!kt) return '—'
  const mph = Math.round(kt * 1.15078)
  return `${kt} kt (${mph} mph)`
}

function relativeTime(iso?: string) {
  if (!iso) return '—'
  const dt = new Date(iso).getTime()
  const diff = Date.now() - dt
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export const CycloneDetailModal: React.FC<Props> = ({ cyclone, onClose }) => {
  if (!cyclone) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Cyclone: {cyclone.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm">Close</button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Category</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{cyclone.category || '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Advisory Time</div>
              <div className="font-medium text-slate-800 dark:text-slate-200" title={cyclone.advisory_time}>{relativeTime(cyclone.advisory_time)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Max Wind</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{formatWind(cyclone.max_wind_kt)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Min Pressure</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{cyclone.min_pressure_mb ? `${cyclone.min_pressure_mb} mb` : '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Movement</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{cyclone.movement ? `${cyclone.movement.direction || ''} ${cyclone.movement.speed_kt || ''}`.trim() || '—' : '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Position</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">{cyclone.position ? `${cyclone.position.lat.toFixed(1)}, ${cyclone.position.lng.toFixed(1)}` : '—'}</div>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Forecast Track (raw)</div>
            {!cyclone.forecast?.length && <div className="text-slate-500 text-xs">No forecast points available.</div>}
            {cyclone.forecast?.length && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">+Hr</th>
                      <th className="py-1 pr-3 font-medium">Lat</th>
                      <th className="py-1 pr-3 font-medium">Lng</th>
                      <th className="py-1 pr-3 font-medium">Wind kt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cyclone.forecast.map((p, idx) => (
                      <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1 pr-3">{(p as any).t ?? p.time ?? idx * 12}</td>
                        <td className="py-1 pr-3">{p.lat?.toFixed(1)}</td>
                        <td className="py-1 pr-3">{p.lng?.toFixed(1)}</td>
                        <td className="py-1 pr-3">{(p as any).wind_kt ?? p.intensity_kt ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
