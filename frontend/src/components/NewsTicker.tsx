import { useEffect, useMemo, useRef, useState } from 'react'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { Pause, Play, Radio } from 'lucide-react'

export function NewsTicker() {
  const filters = useAppStore((s) => s.filters)
  const { data } = useDisasters({ limit: 50, ...filters })
  const items: Disaster[] = useMemo(() => data || [], [data])
  // Only show red and orange (yellow) alerts
  const criticalItems = useMemo(
    () => (items || []).filter((d) => d.severity === 'red' || d.severity === 'yellow'),
    [items]
  )

  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const onEnter = () => setPaused(true)
    const onLeave = () => setPaused(false)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave) }
  }, [])

  // Cycle items with fade transition
  useEffect(() => {
    if (paused || criticalItems.length <= 1) return
    const id = setInterval(() => {
      setFading(true)
      // Wait for fade-out then switch item and fade back in
      const to = setTimeout(() => {
        setIndex((i) => (i + 1) % criticalItems.length)
        setFading(false)
      }, 300)
      return () => clearTimeout(to)
    }, 4000)
    return () => clearInterval(id)
  }, [paused, criticalItems.length])

  return (
    <div className="w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="px-4 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Radio className="h-4 w-4 text-rose-500" /> Live Updates
        </div>
        <button
          onClick={() => setPaused(p => !p)}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
          aria-label={paused ? 'Resume ticker' : 'Pause ticker'}
        >
          {paused ? <><Play className="h-3.5 w-3.5"/> Resume</> : <><Pause className="h-3.5 w-3.5"/> Pause</>}
        </button>
      </div>
      <div ref={containerRef} className="relative h-12 sm:h-14 overflow-hidden flex items-center px-3" aria-live="polite" role="status">
        {criticalItems.length === 0 ? (
          <span className="inline-block text-sm text-slate-500 dark:text-slate-400">No critical updates</span>
        ) : (
          (() => {
            const d = criticalItems[Math.min(index, criticalItems.length - 1)]
            return (
              <span className={`inline-flex items-center gap-2 text-sm leading-6 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
                <span className={`h-2 w-2 rounded-full ${d.severity === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                <span className="text-slate-900 dark:text-slate-200 font-medium">{d.title}</span>
                <span className="text-slate-500 dark:text-slate-400">{d.type}{d.country ? ` • ${d.country}` : ''}</span>
              </span>
            )
          })()
        )}
      </div>
    </div>
  )
}
