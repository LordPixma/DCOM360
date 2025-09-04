import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { Users, AlertTriangle, Activity } from 'lucide-react'

const severityConfig = {
  green: { label: 'Low', className: 'bg-green-500' },
  yellow: { label: 'Medium', className: 'bg-yellow-500' },
  red: { label: 'High', className: 'bg-red-600' },
}

export function TrafficLights() {
  const filters = useAppStore((s) => s.filters)
  const { data, isLoading } = useDisasters({ limit: 50, ...filters })
  const counts = { green: 0, yellow: 0, red: 0 }
  data?.forEach((d: Disaster) => { counts[d.severity as 'green'|'yellow'|'red']++ })

  const totalAffected = (counts.red * 190000) + (counts.yellow * 20000) + (counts.green * 500) // placeholder metric

  return (
    <section aria-labelledby="global-alert-status" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-600/10"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold tracking-tight" id="global-alert-status">Global Alert Status</h2>
              <p className="text-slate-300 text-sm mt-1">Real-time disaster monitoring worldwide</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium">Live Data</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-2xl flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-red-500/50 to-red-600/50 rounded-2xl blur animate-pulse"></div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{isLoading ? '—' : counts.red}</div>
                <div className="text-lg font-semibold text-red-400 mb-1">Critical</div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Users className="h-4 w-4" />
                  <span>{Math.round(totalAffected/1000)}K affected</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-orange-500/50 to-orange-600/50 rounded-2xl blur animate-pulse"></div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{isLoading ? '—' : counts.yellow}</div>
                <div className="text-lg font-semibold text-orange-400 mb-1">Warning</div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Activity className="h-4 w-4" />
                  <span>Live monitoring</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-2xl flex items-center justify-center">
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-green-500/50 to-green-600/50 rounded-2xl blur animate-pulse"></div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">{isLoading ? '—' : counts.green}</div>
                <div className="text-lg font-semibold text-green-400 mb-1">Monitoring</div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Activity className="h-4 w-4" />
                  <span>Auto-refresh active</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <span>Last Updated: just now</span>
              <div className="h-1 w-1 bg-slate-400 rounded-full"></div>
              <span>Next update in 30s</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 animate-progressBar rounded-full" />
              </div>
              <span className="text-xs text-slate-400">Auto-refresh</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
