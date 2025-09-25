import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export type SummaryItem = {
  type: string
  count: number
}

export type SummaryResponse = {
  totals: SummaryItem[]
  severity_breakdown?: { severity: string; count: number }[]
  total_affected_population?: number
  recent_24h?: number
  economic_impact_estimate_usd?: number
}

export function useSummary() {
  return useQuery({
    queryKey: ['disasters', 'summary'],
    queryFn: async () => {
      const res = await api.get<APIResponse<SummaryResponse>>('/api/disasters/summary')
      return res.data.data
    },
    staleTime: 1000 * 60 * 2, // 2 min - summary changes less frequently
    gcTime: 1000 * 60 * 10, // 10 min garbage collection
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 5, // Auto-refetch every 5 minutes
  })
}
