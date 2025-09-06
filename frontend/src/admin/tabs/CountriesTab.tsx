import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'

type CountryRow = { country: string; count: number }

export function CountriesTab() {
  const [countries, setCountries] = useState<CountryRow[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { (async () => {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.get('/api/admin/reports/countries'); if (data?.success) setCountries(data.data); else setMsg('Failed to fetch countries') }
    catch (e: any) { setMsg(e?.message || 'Error') } finally { setLoading(false) }
  })() }, [])

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  return (
    <div className="border rounded p-3">
      <div className="font-medium mb-2">Disasters by Country</div>
      <ul className="text-sm space-y-1 max-h-[420px] overflow-auto">
        {countries.map((c) => <li key={c.country}>{c.country}: {c.count}</li>)}
      </ul>
    </div>
  )
}
