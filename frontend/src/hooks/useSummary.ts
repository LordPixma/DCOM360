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
  staleTime: 1000 * 60, // 1 min
  })
}
