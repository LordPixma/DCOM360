import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { format } from 'date-fns'

export function RecentDisasters() {
  const filters = useAppStore((s) => s.filters)
  const { data, isLoading } = useDisasters({ limit: 10, ...filters })
  return (
    <div className="bg-white border rounded-lg shadow-sm p-0">
      <div className="sticky top-[72px] bg-white/90 backdrop-blur px-4 py-3 border-b z-10">
        <div className="text-sm font-medium">Recent Events</div>
      </div>
      <ul className="divide-y max-h-[600px] overflow-auto px-4">
        {isLoading && <li className="py-3 text-sm text-gray-500">Loading…</li>}
        {data?.map((d: Disaster) => (
          <li key={d.id} className="py-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${d.severity === 'red' ? 'bg-status-red' : d.severity === 'yellow' ? 'bg-status-orange' : 'bg-status-green'}`}></span>
                  {d.title}
                </div>
                <div className="text-gray-500">{d.type} • {d.country ?? 'N/A'}</div>
              </div>
              <div className="text-gray-500">{format(new Date(d.occurred_at), 'PP p')}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
