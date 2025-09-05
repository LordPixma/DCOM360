import { useEffect, useMemo, useRef, useState } from 'react'
import { useDisasters, type Disaster } from '@/hooks/useDisasters'
import { useAppStore } from '@/store/appStore'
import { Pause, Play, Radio } from 'lucide-react'

export function NewsTicker() {
  const filters = useAppStore((s) => s.filters)
  const { data } = useDisasters({ limit: 50, ...filters })
  const items: Disaster[] = useMemo(() => data || [], [data])

  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const onEnter = () => setPaused(true)
    const onLeave = () => setPaused(false)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    return () => { el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave) }
  }, [])

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
  <div ref={containerRef} className="relative h-12 sm:h-14 overflow-hidden" aria-live="polite">
        {/* Marquee wrapper centered vertically */}
        <div
      className={`absolute left-0 top-1/2 -translate-y-1/2 will-change-transform px-2 sm:px-3 ${paused ? '' : 'animate-marquee'}`}
      style={{ animationDuration: `${Math.max(20, items.length * 2)}s` }}
        >
          {/* Track A */}
      <div className="inline-flex items-center whitespace-nowrap pr-8">
            {items.length === 0 ? (
              <span className="inline-block px-4 text-sm text-slate-500 dark:text-slate-400">No recent updates</span>
            ) : (
              items.map((d, i) => (
        <span key={d.id ?? i} className="inline-flex items-center gap-2 px-4 text-sm leading-6">
                  <span className={`h-2 w-2 rounded-full ${d.severity === 'red' ? 'bg-red-500' : d.severity === 'yellow' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                  <span className="text-slate-900 dark:text-slate-200 font-medium">{d.title}</span>
                  <span className="text-slate-500 dark:text-slate-400">{d.type}{d.country ? ` • ${d.country}` : ''}</span>
                </span>
              ))
            )}
          </div>
          {/* Track B (duplicate for seamless loop) */}
          {items.length > 0 && (
    <div className="inline-flex items-center whitespace-nowrap pr-8" aria-hidden="true">
      {items.map((d, i) => (
        <span key={`dup-${d.id ?? i}`} className="inline-flex items-center gap-2 px-4 text-sm leading-6">
                  <span className={`h-2 w-2 rounded-full ${d.severity === 'red' ? 'bg-red-500' : d.severity === 'yellow' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                  <span className="text-slate-900 dark:text-slate-200 font-medium">{d.title}</span>
                  <span className="text-slate-500 dark:text-slate-400">{d.type}{d.country ? ` • ${d.country}` : ''}</span>
                </span>
              ))}
            </div>
          )}
      {/* Edge fade masks */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-10 sm:w-14 bg-gradient-to-r from-white dark:from-slate-800 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-10 sm:w-14 bg-gradient-to-l from-white dark:from-slate-800 to-transparent" />
        </div>
      </div>
    </div>
  )
}
