import { useQuery } from '@tanstack/react-query'
import { api, type APIResponse } from '@/lib/api'

type Health = { status: string; ts: string }

export function useApiStatus() {
  const healthQ = useQuery({
    queryKey: ['api','health'],
    queryFn: async () => {
      const res = await api.get<APIResponse<Health>>('/api/health')
      return res.data.data
    },
    refetchInterval: 30000,
    staleTime: 30000,
  })

  const latestQ = useQuery({
    queryKey: ['disasters','latest-sample'],
    queryFn: async () => {
      const res = await api.get<APIResponse<any[]>>('/api/disasters/current?limit=1')
      return res.data.data?.[0]?.occurred_at as string | undefined
    },
    refetchInterval: 60000,
    staleTime: 60000,
  })

  return {
    online: healthQ.data?.status === 'ok',
    lastChecked: healthQ.data?.ts,
    latestEventAt: latestQ.data,
    isLoading: healthQ.isLoading || latestQ.isLoading,
    error: healthQ.error || latestQ.error,
  }
}
