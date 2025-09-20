import { useQuery } from '@tanstack/react-query'
import { api, type APIResponse } from '@/lib/api'

export type PublicConfig = {
  map_style: string
  has_key: boolean
}

export function useConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      const res = await api.get<APIResponse<PublicConfig>>('/api/config')
      return res.data.data
    },
    staleTime: 5 * 60 * 1000
  })
}
