import { useEffect, useState } from 'react'
import { adminApi, setAdminToken } from '@/lib/adminApi'

type Overview = {
  totals: { type: string; count: number }[]
  severities: { severity: string; count: number }[]
  recent: { id: number; title: string; event_timestamp: string }[]
}

type LogRow = {
  id: number
  email_date: string
  processing_timestamp: string
  disasters_processed: number
  new_disasters: number
  updated_disasters: number
  status: string
  processing_time_ms: number
  email_size_bytes: number
}

type CountryRow = { country: string; count: number }
type SeriesRow = { day: string; count: number }

export function AdminDashboard() {
  const [token, setToken] = useState('')
  const [tab, setTab] = useState<'overview'|'logs'|'countries'|'series'|'danger'>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [countries, setCountries] = useState<CountryRow[]>([])
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [confirmText, setConfirmText] = useState('')
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
    } catch (e: any) { setMsg(e?.message || 'Error fetching overview') } finally { setLoading(false) }
  }

  async function loadLogs() {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.get('/api/admin/reports/logs?limit=200')
      if (data?.success) setLogs(data.data as LogRow[])
      else setMsg('Failed to fetch logs')
    } catch (e: any) { setMsg(e?.message || 'Error fetching logs') } finally { setLoading(false) }
  }

  async function loadCountries() {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.get('/api/admin/reports/countries')
      if (data?.success) setCountries(data.data as CountryRow[])
      else setMsg('Failed to fetch countries')
    } catch (e: any) { setMsg(e?.message || 'Error fetching countries') } finally { setLoading(false) }
  }

  async function loadSeries(days = 30) {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.get(`/api/admin/reports/timeseries?days=${days}`)
      if (data?.success) setSeries(data.data as SeriesRow[])
      else setMsg('Failed to fetch time series')
    } catch (e: any) { setMsg(e?.message || 'Error fetching time series') } finally { setLoading(false) }
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

  async function purgeAll() {
    if (confirmText !== 'PURGE-ALL') { setMsg('Type PURGE-ALL to confirm'); return }
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.post('/api/admin/disasters/purge?mode=all&confirm=PURGE-ALL')
      setMsg(data?.success ? 'All data purged' : (data?.error?.message || 'Failed to purge all'))
    } catch (e: any) { setMsg(e?.message || 'Error purging all') } finally { setLoading(false) }
  }

  useEffect(() => {
    // Auto-load when switching tabs
    if (tab === 'overview') loadOverview()
    if (tab === 'logs') loadLogs()
    if (tab === 'countries') loadCountries()
    if (tab === 'series') loadSeries(30)
  }, [tab])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Admin API Token</label>
          <input value={token} onChange={(e) => setToken(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="paste admin token" />
        </div>
        <button onClick={() => { setAdminToken(token); setMsg('Admin token set'); }} className="px-3 py-2 text-sm rounded bg-slate-800 text-white">Set Token</button>
        <button onClick={purgeCache} disabled={loading} className="px-3 py-2 text-sm rounded bg-amber-600 text-white disabled:opacity-50">Purge Cache</button>
        <button onClick={purgeDemo} disabled={loading} className="px-3 py-2 text-sm rounded bg-red-600 text-white disabled:opacity-50">Purge Demo</button>
      </div>
      {msg && <div className="text-sm text-slate-700 dark:text-slate-300">{msg}</div>}

      <div className="flex gap-2 border-b">
        {(['overview','logs','countries','series','danger'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-sm border-b-2 ${tab===t? 'border-blue-600 text-blue-700':'border-transparent text-slate-600'}`}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab==='overview' && overview && (
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
            <ul className="text-sm space-y-1 max-h-64 overflow-auto">
              {overview.recent.map((r) => <li key={r.id}>{r.title}</li>)}
            </ul>
          </div>
        </div>
      )}

      {tab==='logs' && (
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Processing Logs</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pr-4 py-1">Time</th>
                  <th className="pr-4 py-1">Processed</th>
                  <th className="pr-4 py-1">New</th>
                  <th className="pr-4 py-1">Updated</th>
                  <th className="pr-4 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="pr-4 py-1">{new Date(l.processing_timestamp).toLocaleString()}</td>
                    <td className="pr-4 py-1">{l.disasters_processed}</td>
                    <td className="pr-4 py-1">{l.new_disasters}</td>
                    <td className="pr-4 py-1">{l.updated_disasters}</td>
                    <td className="pr-4 py-1">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='countries' && (
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Disasters by Country</div>
          <ul className="text-sm space-y-1 max-h-[420px] overflow-auto">
            {countries.map((c) => <li key={c.country}>{c.country}: {c.count}</li>)}
          </ul>
        </div>
      )}

      {tab==='series' && (
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Daily Counts (30 days)</div>
          <ul className="text-sm space-y-1 max-h-[420px] overflow-auto">
            {series.map((s) => <li key={s.day}>{s.day}: {s.count}</li>)}
          </ul>
        </div>
      )}

      {tab==='danger' && (
        <div className="border rounded p-3">
          <div className="font-medium mb-2 text-red-600">Danger Zone</div>
          <p className="text-sm text-slate-600 mb-2">Purge all data requires a superadmin account and explicit confirmation text.</p>
          <div className="flex items-center gap-2 mb-3">
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type PURGE-ALL" className="border rounded px-3 py-2 text-sm" />
            <button onClick={purgeAll} disabled={loading} className="px-3 py-2 text-sm rounded bg-red-700 text-white disabled:opacity-50">Purge ALL</button>
          </div>
          <p className="text-xs text-slate-500">This will delete all disasters and history.</p>
        </div>
      )}
    </div>
  )
}
