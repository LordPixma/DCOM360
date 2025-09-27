import { Radio } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api, type APIResponse } from '@/lib/api'
import { safeToISOString, safeToLocaleTimeString, cleanTimestamp } from '@/lib/dateUtils'

// Placeholder breaking news card – data source (RSS/API) to be integrated later
export function BreakingNews() {
  const [items, setItems] = useState<{ id: string; title: string; ts: string; link?: string; source?: string }[]>([])
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    api.get<APIResponse<any[]>>('/api/news')
      .then(res => {
        if (!mounted) return
        if (res.data?.success && Array.isArray(res.data.data)) {
          setItems(res.data.data)
        } else {
          setErr('Failed to load news')
        }
      })
      .catch(() => mounted && setErr('Failed to load news'))
    return () => { mounted = false }
  }, [])

  const fmtUTC = (ts: string) => {
    try {
      const cleaned = cleanTimestamp(ts)
      return safeToLocaleTimeString(cleaned, { timeZone: 'UTC', hour12: false }) + ' UTC'
    } catch {
      return ts
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
          <Radio className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">News Updates</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Latest reports from MSF and Crisis Group</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {err && <li className="p-4 text-sm text-red-600">{err}</li>}
        {items.map(it => (
          <li key={it.id} className="p-4 text-sm">
            {it.link ? (
              <a href={it.link} target="_blank" rel="noreferrer" className="font-medium text-slate-900 dark:text-white hover:underline">
                {it.title}
              </a>
            ) : (
              <div className="font-medium text-slate-900 dark:text-white">{it.title}</div>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
              <span title={safeToISOString(cleanTimestamp(it.ts))}>{fmtUTC(it.ts)}</span>
              {it.source && (
                <a href={it.source} target="_blank" rel="noreferrer" className="opacity-70 hover:underline">
                  {(() => { try { return new URL(it.source).hostname.replace('www.', '') } catch { return it.source } })()}
                </a>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="p-4 text-sm text-slate-500 dark:text-slate-400">No updates yet.</li>
        )}
      </ul>
    </div>
  )
}
