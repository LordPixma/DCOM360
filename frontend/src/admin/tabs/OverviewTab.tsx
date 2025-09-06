import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '@/lib/adminApi'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'

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

  useEffect(() => {
    // Register needed chart components once
    try { ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement) } catch {}
  }, [])

  const byType = useMemo(() => {
    if (!data) return null
    return {
      labels: data.totals.map((t) => t.type),
      datasets: [{
        label: 'Totals',
        data: data.totals.map((t) => t.count),
        backgroundColor: ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6','#10b981'],
      }]
    }
  }, [data])

  const bySeverity = useMemo(() => {
    if (!data) return null
    return {
      labels: data.severities.map((s) => s.severity),
      datasets: [{
        label: 'Count',
        data: data.severities.map((s) => s.count),
        backgroundColor: '#93c5fd',
      }]
    }
  }, [data])

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  if (!data) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="border rounded p-3">
        <div className="font-medium mb-2">Totals by Type</div>
        {byType ? <Doughnut data={byType} /> : null}
      </div>
      <div className="border rounded p-3">
        <div className="font-medium mb-2">Totals by Severity</div>
        {bySeverity ? <Bar data={bySeverity} options={{ responsive: true, scales: { y: { beginAtZero: true } } }} /> : null}
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
