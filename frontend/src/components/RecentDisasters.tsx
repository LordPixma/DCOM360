import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { format } from 'date-fns'

export function RecentDisasters() {
  const { data, isLoading } = useDisasters({ limit: 10 })
  return (
    <div className="bg-white border rounded-lg p-3">
      <div className="text-sm font-medium mb-2">Recent Disasters</div>
      <ul className="divide-y">
        {isLoading && <li className="py-2 text-sm text-gray-500">Loading…</li>}
  {data?.map((d: Disaster) => (
          <li key={d.id} className="py-2 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{d.title}</div>
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
