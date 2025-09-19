import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'
import type { Disaster } from './useDisasters'

export function useDisaster(id?: string) {
  return useQuery({
    queryKey: ['disaster', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await api.get<APIResponse<Disaster & Record<string, any>>>(`/api/disasters/${id}`)
      return res.data.data
    },
    staleTime: 60_000
  })
}
