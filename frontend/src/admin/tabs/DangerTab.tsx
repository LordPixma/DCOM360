import { useState } from 'react'
import { adminApi } from '@/lib/adminApi'

export function DangerTab() {
  const [confirmText, setConfirmText] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function purgeCache() {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.post('/api/admin/cache/purge'); setMsg(data?.success ? 'Cache purged' : 'Failed to purge cache') }
    catch (e: any) { setMsg(e?.message || 'Error purging cache') } finally { setLoading(false) }
  }

  async function purgeDemo() {
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.post('/api/admin/disasters/purge?mode=demo'); setMsg(data?.success ? 'Demo data purged' : 'Failed to purge demo data') }
    catch (e: any) { setMsg(e?.message || 'Error purging demo') } finally { setLoading(false) }
  }

  async function purgeAll() {
    if (confirmText !== 'PURGE-ALL') { setMsg('Type PURGE-ALL to confirm'); return }
    setLoading(true); setMsg('')
    try { const { data } = await adminApi.post('/api/admin/disasters/purge?mode=all&confirm=PURGE-ALL'); setMsg(data?.success ? 'All data purged' : (data?.error?.message || 'Failed to purge all')) }
    catch (e: any) { setMsg(e?.message || 'Error purging all') } finally { setLoading(false) }
  }

  return (
    <div className="border rounded p-3">
      <div className="font-medium mb-2 text-red-600">Danger Zone</div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={purgeCache} disabled={loading} className="px-3 py-2 text-sm rounded bg-amber-600 text-white disabled:opacity-50">Purge Cache</button>
        <button onClick={purgeDemo} disabled={loading} className="px-3 py-2 text-sm rounded bg-red-600 text-white disabled:opacity-50">Purge Demo</button>
      </div>
      <p className="text-sm text-slate-600 mb-2">Purge all data requires a superadmin account and explicit confirmation text.</p>
      <div className="flex items-center gap-2 mb-3">
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type PURGE-ALL" className="border rounded px-3 py-2 text-sm" />
        <button onClick={purgeAll} disabled={loading} className="px-3 py-2 text-sm rounded bg-red-700 text-white disabled:opacity-50">Purge ALL</button>
      </div>
      {msg && <div className="text-sm text-slate-700 dark:text-slate-300">{msg}</div>}
      <p className="text-xs text-slate-500">This will delete all disasters and history.</p>
    </div>
  )
}
