import { useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { adminApi } from '@/lib/adminApi'

type CountryRow = { country: string; count: number }

export function CountriesTab() {
  const [countries, setCountries] = useState<CountryRow[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(100)
  useEffect(() => { (async () => {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.get('/api/admin/reports/countries'); if (data?.success) setCountries(data.data); else setMsg('Failed to fetch countries') }
    catch (e: any) { setMsg(e?.message || 'Error') } finally { setLoading(false) }
  })() }, [])

  const parentRef = useRef<HTMLDivElement | null>(null)
  const rows = countries.slice(0, visibleCount)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  })

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Disasters by Country</div>
        <button disabled={loading || visibleCount >= countries.length} onClick={() => setVisibleCount((v) => Math.min(v + 100, countries.length))} className="px-2 py-1 text-xs rounded bg-slate-100 disabled:opacity-50">Show more</button>
      </div>
      <div ref={parentRef} className="text-sm max-h-[420px] overflow-auto relative">
        <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const c = rows[vi.index]
            return (
              <div key={c?.country ?? vi.key} className="border-b px-1" style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${vi.start}px)` }}>
                {c?.country}: {c?.count}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
