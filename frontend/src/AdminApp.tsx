import { useEffect, useState } from 'react'
import { AdminLogin } from '@/components/AdminLogin'
import { AdminDashboard } from '@/components/AdminDashboard'

function isLoggedIn() {
  try {
    const t = sessionStorage.getItem('ADMIN_TOKEN')
    const e = sessionStorage.getItem('ADMIN_EMAIL')
    return Boolean(t && e)
  } catch { return false }
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(false)
  useEffect(() => { setAuthed(isLoggedIn()) }, [])
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Flare360 Admin</h1>
        </div>
      </header>
      <main>
        {authed ? <AdminDashboard /> : <AdminLogin onLoggedIn={() => setAuthed(true)} />}
      </main>
    </div>
  )
}
