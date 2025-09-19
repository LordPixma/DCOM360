import { Radio } from 'lucide-react'
import { useState, useEffect } from 'react'

// Placeholder breaking news card – data source (RSS/API) to be integrated later
export function BreakingNews() {
  const [items, setItems] = useState<{ id: string; title: string; ts: string }[]>([])
  useEffect(() => {
    // Placeholder demo content
    setItems([
      { id: 'demo-1', title: 'Breaking: Prototype feed integration pending', ts: new Date().toISOString() },
      { id: 'demo-2', title: 'Live updates will appear here soon', ts: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
    ])
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
          <Radio className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">Breaking News</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">High-priority global alerts</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
        {items.map(it => (
          <li key={it.id} className="p-4 text-sm">
            <div className="font-medium text-slate-900 dark:text-white">{it.title}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(it.ts).toLocaleTimeString()}</div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="p-4 text-sm text-slate-500 dark:text-slate-400">No breaking news yet.</li>
        )}
      </ul>
    </div>
  )
}
