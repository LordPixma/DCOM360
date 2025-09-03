import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'

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

  return (
    <section aria-labelledby="traffic-lights-title" className="bg-white rounded-lg border p-4">
      <h2 id="traffic-lights-title" className="font-semibold mb-3">Current Risk Levels</h2>
      <div className="grid grid-cols-3 gap-4">
        {(['green','yellow','red'] as const).map(s => (
          <div key={s} className="flex items-center gap-3">
            <span className={`h-4 w-4 rounded-full ${severityConfig[s].className}`} />
            <div>
              <div className="text-sm text-gray-600">{severityConfig[s].label}</div>
              <div className="text-xl font-semibold">{isLoading ? '…' : counts[s] || 0}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
