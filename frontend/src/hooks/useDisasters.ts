import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '@/lib/api'

export type Disaster = {
  id: string
  type: string
  severity: 'green' | 'yellow' | 'red'
  country?: string
  latitude?: number
  longitude?: number
  title: string
  occurred_at: string
  source?: 'gdacs' | 'reliefweb' | string
}

export interface DisastersQuery {
  country?: string
  severity?: string
  type?: string
  q?: string
  limit?: number
  offset?: number
  sort?: string
}

export function useDisasters(opts: DisastersQuery = {}) {
  const params = new URLSearchParams()
  if (opts.country) params.set('country', opts.country)
  if (opts.severity) params.set('severity', opts.severity)
  if (opts.type) params.set('type', opts.type)
  if (opts.q) params.set('q', opts.q)
  if (opts.limit) params.set('limit', String(opts.limit))
  if (typeof opts.offset === 'number') params.set('offset', String(opts.offset))
  if (opts.sort) params.set('sort', opts.sort)

  return useQuery({
    queryKey: ['disasters', 'current', { ...opts }],
    queryFn: async () => {
      const res = await api.get<APIResponse<Disaster[]>>(`/api/disasters/current?${params.toString()}`)
      return res.data.data
  },
  staleTime: 1000 * 60, // 1 min
  })
}
