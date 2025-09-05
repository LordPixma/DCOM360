import { useState } from 'react'
import { setAdminEmail, setAdminToken } from '@/lib/adminApi'

export function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setAdminEmail(email)
    setAdminToken(token)
    onLoggedIn()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm border rounded-xl p-6 bg-white dark:bg-slate-800">
        <h2 className="text-lg font-semibold mb-4">Admin Login</h2>
        <label className="block text-sm text-slate-600 mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mb-3" placeholder="you@example.com" />
        <label className="block text-sm text-slate-600 mb-1">Admin Token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} className="w-full border rounded px-3 py-2 text-sm mb-4" placeholder="paste token" />
        <button className="w-full px-3 py-2 text-sm rounded bg-slate-800 text-white">Continue</button>
      </form>
    </div>
  )
}
