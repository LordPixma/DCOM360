import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
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
  const [page, setPage] = useState(1)
  const pageSize = 200

  useEffect(() => { (async () => {
    setLoading(true); setMsg('')
    try {
      const { data } = await adminApi.get(`/api/admin/reports/logs?limit=${page * pageSize}`)
      if (data?.success) setLogs(data.data)
      else setMsg('Failed to fetch logs')
    } catch (e: any) { setMsg(e?.message || 'Error') } finally { setLoading(false) }
  })() }, [page])

  const parentRef = useRef<HTMLDivElement | null>(null)
  const rowVirtualizer = useVirtualizer({
    count: logs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  })

  if (loading) return <div className="p-3 text-sm text-slate-500">Loading…</div>
  if (msg) return <div className="p-3 text-sm text-slate-500">{msg}</div>
  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Processing Logs</div>
        <button disabled={loading} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 text-xs rounded bg-slate-100 disabled:opacity-50">Load more</button>
      </div>
      <div ref={parentRef} className="overflow-auto max-h-[420px]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left">
              <th className="pr-4 py-1">Time</th>
              <th className="pr-4 py-1">Processed</th>
              <th className="pr-4 py-1">New</th>
              <th className="pr-4 py-1">Updated</th>
              <th className="pr-4 py-1">Status</th>
            </tr>
          </thead>
          <tbody style={{ position: 'relative' }}>
            <tr style={{ height: rowVirtualizer.getTotalSize() }}></tr>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const l = logs[vi.index]
              return (
                <tr key={l?.id ?? vi.key} className="border-t absolute left-0 right-0" style={{ transform: `translateY(${vi.start}px)` }}>
                  <td className="pr-4 py-1">{l ? new Date(l.processing_timestamp).toLocaleString() : ''}</td>
                  <td className="pr-4 py-1">{l?.disasters_processed}</td>
                  <td className="pr-4 py-1">{l?.new_disasters}</td>
                  <td className="pr-4 py-1">{l?.updated_disasters}</td>
                  <td className="pr-4 py-1">{l?.status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
