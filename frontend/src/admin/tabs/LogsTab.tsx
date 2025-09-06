import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/adminApi'

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

export function LogsTab() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { (async () => {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.get('/api/admin/reports/logs?limit=200'); if (data?.success) setLogs(data.data); else setMsg('Failed to fetch logs') }
    catch (e: any) { setMsg(e?.message || 'Error') } finally { setLoading(false) }
  })() }, [])

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  return (
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
  )
}
