import React from 'react'
import { useApiStatus } from '@/hooks/useApiStatus'
import { safeToISOString, safeToLocaleTimeString, cleanTimestamp } from '@/lib/dateUtils'

function fmtUTC(ts?: string) {
  if (!ts) return ''
  try {
    const cleaned = cleanTimestamp(ts)
    return safeToLocaleTimeString(cleaned, {
      hour12: false,
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC'
  } catch {
    return ts
  }
}

export function ApiStatus() {
  const { online, lastChecked, latestEventAt, isLoading } = useApiStatus()
  const dot = online ? 'bg-green-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot} animate-pulse`} aria-label={online ? 'Online' : 'Offline'} />
      <span>{isLoading ? 'Checking API…' : online ? 'Live' : 'Offline'}</span>
      {latestEventAt && (
        <span className="opacity-70" title={safeToISOString(cleanTimestamp(latestEventAt))}>• Data {fmtUTC(latestEventAt)}</span>
      )}
      {lastChecked && (
        <span className="opacity-70" title={safeToISOString(cleanTimestamp(lastChecked))}>• API {fmtUTC(lastChecked)}</span>
      )}
    </div>
  )
}
