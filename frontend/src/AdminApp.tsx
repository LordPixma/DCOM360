import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminLogin } from '@/components/AdminLogin'
import { AdminDashboard } from '@/components/AdminDashboard'
import { clearAdminEmail, clearAdminToken } from '@/lib/adminApi'

function isLoggedIn() {
  try {
    const t = sessionStorage.getItem('ADMIN_TOKEN')
    const e = sessionStorage.getItem('ADMIN_EMAIL')
    return Boolean(t && e)
  } catch { return false }
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(false)
  const nav = useNavigate()
  useEffect(() => { setAuthed(isLoggedIn()) }, [])
  function logout() {
    clearAdminEmail(); clearAdminToken(); setAuthed(false); nav('/admin/login', { replace: true })
  }
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Flare360 Admin</h1>
          <div className="flex items-center gap-2">
            <Link to="/" className="px-3 py-2 text-sm rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">Back to App</Link>
            {authed && <button onClick={logout} className="px-3 py-2 text-sm rounded bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white">Logout</button>}
          </div>
        </div>
      </header>
      <main>
        {authed ? <AdminDashboard /> : <AdminLogin onLoggedIn={() => setAuthed(true)} />}
      </main>
    </div>
  )
}
