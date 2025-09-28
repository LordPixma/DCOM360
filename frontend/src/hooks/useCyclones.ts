import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export interface Cyclone {
  id: string
  name: string
  basin?: string
  category?: string
  position?: { lat: number; lng: number }
  max_wind_kt?: number
  min_pressure_mb?: number
  movement?: { direction?: string; speed_kt?: number }
  advisory_time: string
  forecast?: Array<{
    time: string
    lat: number
    lng: number
    intensity_kt?: number
    category?: string
  }>
}

export function useCyclones() {
  return useQuery({
    queryKey: ['cyclones', 'latest'],
    queryFn: async () => {
      const res = await api.get<APIResponse<Cyclone[]>>('/api/cyclones')
      return res.data.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - advisory updates are not ultra-frequent
    refetchInterval: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  })
}
