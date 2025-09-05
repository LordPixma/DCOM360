import React from 'react'
import { useApiStatus } from '@/hooks/useApiStatus'

export function ApiStatus() {
  const { online, lastChecked, latestEventAt, isLoading } = useApiStatus()
  const dot = online ? 'bg-green-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot} animate-pulse`} aria-label={online ? 'Online' : 'Offline'} />
      <span>{isLoading ? 'Checking API…' : online ? 'Live' : 'Offline'}</span>
      {lastChecked && <span className="opacity-70">• Checked {new Date(lastChecked).toLocaleTimeString()}</span>}
      {latestEventAt && <span className="opacity-70">• Latest {new Date(latestEventAt).toLocaleTimeString()}</span>}
    </div>
  )
}
