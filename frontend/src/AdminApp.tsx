import { Suspense, lazy, useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminLogin } from '@/components/AdminLogin'
const AdminLayout = lazy(() => import('@/admin/AdminLayout').then(m => ({ default: m.AdminLayout })))
const OverviewTab = lazy(() => import('@/admin/tabs/OverviewTab').then(m => ({ default: m.OverviewTab })))
const LogsTab = lazy(() => import('@/admin/tabs/LogsTab').then(m => ({ default: m.LogsTab })))
const CountriesTab = lazy(() => import('@/admin/tabs/CountriesTab').then(m => ({ default: m.CountriesTab })))
const SeriesTab = lazy(() => import('@/admin/tabs/SeriesTab').then(m => ({ default: m.SeriesTab })))
const DangerTab = lazy(() => import('@/admin/tabs/DangerTab').then(m => ({ default: m.DangerTab })))
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
        {authed ? (
          <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading admin…</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/overview" element={<AdminLayout />}>
                <Route index element={<OverviewTab />} />
              </Route>
              <Route path="/logs" element={<AdminLayout />}>
                <Route index element={<LogsTab />} />
              </Route>
              <Route path="/countries" element={<AdminLayout />}>
                <Route index element={<CountriesTab />} />
              </Route>
              <Route path="/series" element={<AdminLayout />}>
                <Route index element={<SeriesTab />} />
              </Route>
              <Route path="/danger" element={<AdminLayout />}>
                <Route index element={<DangerTab />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin/overview" replace />} />
            </Routes>
          </Suspense>
        ) : (
          <AdminLogin onLoggedIn={() => setAuthed(true)} />
        )}
      </main>
    </div>
  )
}
