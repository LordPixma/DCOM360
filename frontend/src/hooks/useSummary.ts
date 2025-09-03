import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export type SummaryItem = {
  type: string
  count: number
}

export type SummaryResponse = {
  totals: SummaryItem[]
}

export function useSummary() {
  return useQuery({
    queryKey: ['disasters', 'summary'],
    queryFn: async () => {
      const res = await api.get<APIResponse<SummaryResponse>>('/api/disasters/summary')
      return res.data.data
    }
  })
}
