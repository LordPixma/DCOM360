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
    <section aria-labelledby="global-alert-status" className="rounded-lg border shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-[var(--grad-start,#667EEA)] to-[var(--grad-end,#764BA2)] text-white">
        <div className="px-6 py-6">
          <div className="text-sm uppercase tracking-wider opacity-90" id="global-alert-status">Global Alert Status</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <span className="relative inline-flex h-20 w-20 rounded-full bg-status-red/20 ring-4 ring-white/20">
                <span className="absolute inset-0 rounded-full bg-status-red animate-pulseSoft opacity-80"></span>
              </span>
              <div>
                <div className="text-[48px] leading-[52px] font-bold">{isLoading ? '…' : counts.red}</div>
                <div className="text-sm font-medium">Critical</div>
                <div className="flex items-center gap-1 text-xs opacity-90"><Users className="h-3.5 w-3.5"/> {Math.round(totalAffected/1000)}K affected</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="relative inline-flex h-20 w-20 rounded-full bg-status-orange/20 ring-4 ring-white/20">
                <span className="absolute inset-0 rounded-full bg-status-orange animate-pulseSoft opacity-80"></span>
              </span>
              <div>
                <div className="text-[48px] leading-[52px] font-bold">{isLoading ? '…' : counts.yellow}</div>
                <div className="text-sm font-medium">Warning</div>
                <div className="flex items-center gap-1 text-xs opacity-90"><AlertTriangle className="h-3.5 w-3.5"/> Live monitoring</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="relative inline-flex h-20 w-20 rounded-full bg-status-green/20 ring-4 ring-white/20">
                <span className="absolute inset-0 rounded-full bg-status-green animate-pulseSoft opacity-80"></span>
              </span>
              <div>
                <div className="text-[48px] leading-[52px] font-bold">{isLoading ? '…' : counts.green}</div>
                <div className="text-sm font-medium">Monitoring</div>
                <div className="flex items-center gap-1 text-xs opacity-90"><Activity className="h-3.5 w-3.5"/> Auto-refresh active</div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs opacity-90">
            <span>Last Updated: just now</span>
            <span>•</span>
            <div className="flex-1 max-w-sm h-1 bg-white/20 rounded overflow-hidden"><div className="h-full bg-white/70 animate-progressBar" /></div>
            <span>Auto-refresh</span>
          </div>
        </div>
      </div>
    </section>
  )
}
