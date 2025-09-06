import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'

type SeriesRow = { day: string; count: number }

export function SeriesTab() {
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { (async () => {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.get('/api/admin/reports/timeseries?days=30'); if (data?.success) setSeries(data.data); else setMsg('Failed to fetch time series') }
    catch (e: any) { setMsg(e?.message || 'Error') } finally { setLoading(false) }
  })() }, [])

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  return (
    <div className="border rounded p-3">
      <div className="font-medium mb-2">Daily Counts (30 days)</div>
      <ul className="text-sm space-y-1 max-h-[420px] overflow-auto">
        {series.map((s) => <li key={s.day}>{s.day}: {s.count}</li>)}
      </ul>
    </div>
  )
}
