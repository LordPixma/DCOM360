import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export interface WildfireCluster {
  id: string
  cluster_key: string
  centroid: { lat: number; lng: number }
  detections_6h: number
  detections_24h: number
  growth_rate?: number
  area_estimate_km2?: number
  intensity_score?: number
  first_detected?: string
  last_detected?: string
  trend?: 'rising' | 'falling' | 'stable'
}

export interface WildfireClustersOptions {
  limit?: number
}

export function useWildfireClusters(opts: WildfireClustersOptions = {}) {
  const limit = Math.min(Math.max(opts.limit || 50, 1), 200)
  return useQuery({
    queryKey: ['wildfire', 'clusters', { limit }],
    queryFn: async () => {
      const res = await api.get<APIResponse<WildfireCluster[]>>(`/api/wildfire/clusters?limit=${limit}`)
      return res.data.data
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 2,
    refetchOnWindowFocus: false
  })
}
