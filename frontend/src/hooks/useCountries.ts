import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export type Country = { code: string; name: string }

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await api.get<APIResponse<Country[]>>('/api/countries')
      return res.data.data
    },
    staleTime: 1000 * 60 * 30,
  })
}
