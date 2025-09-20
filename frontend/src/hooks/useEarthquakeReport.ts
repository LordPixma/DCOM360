import { useQuery } from '@tanstack/react-query'
import { api, type APIResponse } from '@/lib/api'

export type EnrichedEqReport = {
  totals?: { total?: number; m5?: number; m4?: number; m3?: number; m2?: number }
  top?: Array<{
    rank: number;
    mag: number;
    title: string;
    url?: string;
    felt?: number;
    local_time?: string;
    page_title?: string;
    location?: string;
    region?: string;
    country?: string;
    lat?: number;
    lon?: number;
  }>
}

export function useEarthquakeReport(id?: string) {
  return useQuery({
    queryKey: ['eq-report', id],
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get<APIResponse<EnrichedEqReport>>(`/api/disasters/${id}/eq-report`)
      return res.data.data
    }
  })
}
