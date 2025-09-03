import { useDisasters } from '@/hooks/useDisasters'

export function DisasterMap() {
  const { data, isLoading } = useDisasters({ limit: 100 })
  return (
    <div className="bg-white border rounded-lg h-[420px] p-3">
      <div className="text-sm text-gray-600 mb-2">Interactive Map (stub)</div>
      <div className="text-xs text-gray-500">{isLoading ? 'Loading…' : `${data?.length || 0} active events`}</div>
      <div className="mt-2 h-full bg-gray-100 rounded-md flex items-center justify-center text-gray-400">Mapbox goes here</div>
    </div>
  )
}
