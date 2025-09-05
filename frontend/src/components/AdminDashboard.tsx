import { useEffect, useState } from 'react'
import { adminApi, setAdminToken } from '@/lib/adminApi'

type Overview = {
  totals: { type: string; count: number }[]
  severities: { severity: string; count: number }[]
  recent: { id: number; title: string; event_timestamp: string }[]
}

export function AdminDashboard() {
  const [token, setToken] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    try {
      const t = sessionStorage.getItem('ADMIN_TOKEN') || ''
      if (t) setToken(t)
    } catch {}
  }, [])

  async function loadOverview() {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.get('/api/admin/reports/overview')
      if (data?.success) setOverview(data.data as Overview)
      else setMsg('Failed to fetch overview')
    } catch (e: any) {
      setMsg(e?.message || 'Error fetching overview')
    } finally { setLoading(false) }
  }

  async function purgeCache() {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.post('/api/admin/cache/purge')
      setMsg(data?.success ? 'Cache purged' : 'Failed to purge cache')
    } catch (e: any) { setMsg(e?.message || 'Error purging cache') } finally { setLoading(false) }
  }

  async function purgeDemo() {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.post('/api/admin/disasters/purge?mode=demo')
      setMsg(data?.success ? 'Demo data purged' : 'Failed to purge demo data')
    } catch (e: any) { setMsg(e?.message || 'Error purging demo data') } finally { setLoading(false) }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Admin API Token</label>
          <input value={token} onChange={(e) => setToken(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="paste admin token" />
        </div>
        <button onClick={() => { setAdminToken(token); setMsg('Admin token set'); }} className="px-3 py-2 text-sm rounded bg-slate-800 text-white">Set Token</button>
        <button onClick={loadOverview} disabled={loading} className="px-3 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50">Load Overview</button>
        <button onClick={purgeCache} disabled={loading} className="px-3 py-2 text-sm rounded bg-amber-600 text-white disabled:opacity-50">Purge Cache</button>
        <button onClick={purgeDemo} disabled={loading} className="px-3 py-2 text-sm rounded bg-red-600 text-white disabled:opacity-50">Purge Demo</button>
      </div>
      {msg && <div className="text-sm text-slate-600">{msg}</div>}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Totals by Type</div>
            <ul className="text-sm space-y-1">
              {overview.totals.map((t) => <li key={t.type}>{t.type}: {t.count}</li>)}
            </ul>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Totals by Severity</div>
            <ul className="text-sm space-y-1">
              {overview.severities.map((s) => <li key={s.severity}>{s.severity}: {s.count}</li>)}
            </ul>
          </div>
          <div className="border rounded p-3 md:col-span-1">
            <div className="font-medium mb-2">Recent</div>
            <ul className="text-sm space-y-1 max-h-48 overflow-auto">
              {overview.recent.map((r) => <li key={r.id}>{r.title}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
