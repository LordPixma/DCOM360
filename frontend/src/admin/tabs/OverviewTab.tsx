import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'

type Overview = {
  totals: { type: string; count: number }[]
  severities: { severity: string; count: number }[]
  recent: { id: number; title: string; event_timestamp: string }[]
}

export function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { (async () => {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.get('/api/admin/reports/overview'); if (data?.success) setData(data.data); else setMsg('Failed to fetch overview') }
    catch (e: any) { setMsg(e?.message || 'Error') } finally { setLoading(false) }
  })() }, [])

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  if (!data) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="border rounded p-3">
        <div className="font-medium mb-2">Totals by Type</div>
        <ul className="text-sm space-y-1">
          {data.totals.map((t) => <li key={t.type}>{t.type}: {t.count}</li>)}
        </ul>
      </div>
      <div className="border rounded p-3">
        <div className="font-medium mb-2">Totals by Severity</div>
        <ul className="text-sm space-y-1">
          {data.severities.map((s) => <li key={s.severity}>{s.severity}: {s.count}</li>)}
        </ul>
      </div>
      <div className="border rounded p-3 md:col-span-1">
        <div className="font-medium mb-2">Recent</div>
        <ul className="text-sm space-y-1 max-h-64 overflow-auto">
          {data.recent.map((r) => <li key={r.id}>{r.title}</li>)}
        </ul>
      </div>
    </div>
  )
}
