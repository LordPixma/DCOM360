import { useQuery } from '@tanstack/react-query'
import { api, type APIResponse } from '@/lib/api'
import type { Disaster, DisastersQuery } from '@/hooks/useDisasters'

export function useDisastersWithMeta(opts: DisastersQuery = {}) {
  const params = new URLSearchParams()
  if (opts.country) params.set('country', opts.country)
  if (opts.severity) params.set('severity', opts.severity)
  if (opts.type) params.set('type', opts.type)
  if (opts.q) params.set('q', opts.q)
  if (opts.limit) params.set('limit', String(opts.limit))
  if (typeof opts.offset === 'number') params.set('offset', String(opts.offset))
  if (opts.sort) params.set('sort', opts.sort)

  return useQuery({
    queryKey: ['disasters', 'current', 'with-meta', { ...opts }],
    queryFn: async () => {
      const res = await api.get<APIResponse<Disaster[]>>(`/api/disasters/current?${params.toString()}`)
      const items = res.data.data
      const meta = (res.data.meta || {}) as { total?: number; limit?: number; offset?: number }
      return { items, total: meta.total ?? items.length, limit: meta.limit ?? opts.limit, offset: meta.offset ?? opts.offset }
    },
    staleTime: 1000 * 60,
  })
}
