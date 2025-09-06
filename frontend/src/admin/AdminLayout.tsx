import { Outlet, NavLink } from 'react-router-dom'
import { setAdminToken } from '@/lib/adminApi'
import { useEffect, useState } from 'react'

export function AdminLayout() {
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    try { const t = sessionStorage.getItem('ADMIN_TOKEN') || ''; if (t) setToken(t) } catch {}
  }, [])
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Admin Dashboard</h2>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Admin API Token</label>
          <input value={token} onChange={(e) => setToken(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="paste admin token" />
        </div>
        <button onClick={() => { setAdminToken(token); setMsg('Admin token set'); }} className="px-3 py-2 text-sm rounded bg-slate-800 text-white">Set Token</button>
      </div>
      {msg && <div className="text-sm text-slate-700 dark:text-slate-300">{msg}</div>}

      <div className="flex gap-2 border-b">
        {[
          { to: '/admin/overview', label: 'OVERVIEW' },
          { to: '/admin/logs', label: 'LOGS' },
          { to: '/admin/countries', label: 'COUNTRIES' },
          { to: '/admin/series', label: 'SERIES' },
          { to: '/admin/danger', label: 'DANGER' },
        ].map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `px-3 py-2 text-sm border-b-2 ${isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600'}`}
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
