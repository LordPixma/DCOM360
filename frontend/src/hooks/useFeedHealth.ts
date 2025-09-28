import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export interface FeedHealth {
  feed: string
  status: 'OK' | 'DEGRADED' | 'FAILING' | string
  last_success?: string
  last_error?: string
  error_count: number
  avg_latency_ms?: number
  consecutive_failures: number
  notes?: string
  freshness_seconds?: number
}

export function useFeedHealth() {
  return useQuery({
    queryKey: ['system', 'feeds', 'health'],
    queryFn: async () => {
      const res = await api.get<APIResponse<FeedHealth[]>>('/api/system/feeds')
      return res.data.data
    },
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60, // keep near-real-time
    refetchOnWindowFocus: false
  })
}
