import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function ComparativeAnalysis() {
  const [a, setA] = useState('US')
  const [b, setB] = useState('NG')
  const [dataA, setDataA] = useState<any[]>([])
  const [dataB, setDataB] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [ra, rb] = await Promise.all([
        api.get(`/api/disasters/current?country=${a}&limit=200`),
        api.get(`/api/disasters/current?country=${b}&limit=200`)
      ])
      setDataA(ra.data?.data || [])
      setDataB(rb.data?.data || [])
    }
    load()
  }, [a, b])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Comparative Analysis</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Compare two regions side by side.</p>
      <div className="flex items-center gap-3 mb-4">
        <input value={a} onChange={(e) => setA(e.target.value.toUpperCase())} className="border rounded px-3 py-2" placeholder="Country A (code)" />
        <input value={b} onChange={(e) => setB(e.target.value.toUpperCase())} className="border rounded px-3 py-2" placeholder="Country B (code)" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{code: a, items: dataA}, {code: b, items: dataB}].map((col) => (
          <div key={col.code} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="font-semibold mb-2">{col.code} — {col.items.length} events</div>
            <ul className="space-y-2 text-sm max-h-[65vh] overflow-auto">
              {col.items.map((d: any) => (
                <li key={d.id} className="flex items-start gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full mt-1 ${d.severity==='red'?'bg-red-500':d.severity==='yellow'?'bg-orange-500':'bg-green-500'}`}></span>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{d.title}</div>
                    <div className="text-slate-600 dark:text-slate-400">{d.type} • {d.country || 'Unknown'}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
