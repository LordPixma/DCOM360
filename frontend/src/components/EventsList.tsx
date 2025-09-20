import { useMemo } from 'react'
import { type Disaster } from '@/hooks/useDisasters'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDisastersWithMeta } from '@/hooks/useDisastersWithMeta'
import { ExternalLink, X } from 'lucide-react'

function stripHtmlAndDecode(input: string): string {
  const text = String(input || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Basic HTML entity decode for common entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  }
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => entities[m] || m)
}

function extractFirstImageSrc(input: string): string | undefined {
  const m = String(input || '').match(/<img[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : undefined
}

function severityLabel(sev?: string): { label: string; className: string } {
  const v = (sev || '').toLowerCase()
  if (v === 'red') return { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' }
  if (v === 'yellow' || v === 'orange') return { label: 'Warning', className: 'bg-amber-100 text-amber-700 border-amber-200' }
  return { label: 'Monitoring', className: 'bg-green-100 text-green-700 border-green-200' }
}

function prettyType(t?: string, title?: string): string {
  const raw = (t || '').trim().toLowerCase()
  if (!raw || raw === 'other') {
    const tt = (title || '').toLowerCase()
    if (tt.includes('volcano')) return 'Volcano'
    if (tt.includes('earthquake')) return 'Earthquake'
    if (tt.includes('flood')) return 'Flood'
    if (tt.includes('cyclone') || tt.includes('hurricane') || tt.includes('typhoon')) return 'Cyclone'
    if (tt.includes('wildfire') || tt.includes('bushfire')) return 'Wildfire'
  }
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Event'
}

function formatRelative(dateIso: string): string {
  const now = Date.now()
  const t = new Date(dateIso).getTime()
  if (isNaN(t)) return dateIso
  const diff = Math.max(0, Math.floor((now - t) / 1000))
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

type QuakeEntry = { rank: number; mag: number; title: string; url?: string }

function parseEarthquakeReport(html: string): { totals?: { total?: number; m5?: number; m4?: number; m3?: number; m2?: number }; top?: QuakeEntry[] } {
  const res: { totals?: any; top?: QuakeEntry[] } = {}
  try {
    const safe = String(html || '')
    // Totals: "Summary: 15 quakes 5.0+, 59 quakes 4.0+, 117 quakes 3.0+, 285 quakes 2.0+ (476 total)"
    const sumMatch = safe.match(/Summary:\s*([^<]+)/i)
    if (sumMatch) {
      const s = sumMatch[1]
      const m5 = s.match(/(\d+)\s+quakes?\s+5(?:\.[0-9])?\+/i)
      const m4 = s.match(/(\d+)\s+quakes?\s+4(?:\.[0-9])?\+/i)
      const m3 = s.match(/(\d+)\s+quakes?\s+3(?:\.[0-9])?\+/i)
      const m2 = s.match(/(\d+)\s+quakes?\s+2(?:\.[0-9])?\+/i)
      const total = s.match(/\((\d+)\s+total\)/i)
      res.totals = {
        total: total ? Number(total[1]) : undefined,
        m5: m5 ? Number(m5[1]) : undefined,
        m4: m4 ? Number(m4[1]) : undefined,
        m3: m3 ? Number(m3[1]) : undefined,
        m2: m2 ? Number(m2[1]) : undefined,
      }
    }
    // Top quakes: patterns "#1: Mag 5.9 <a href="...">Location</a>"
    const top: QuakeEntry[] = []
    const re = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(safe)) && top.length < 5) {
      top.push({ rank: Number(m[1]), mag: Number(m[2]), url: m[3], title: m[4] })
    }
    if (top.length) res.top = top
  } catch {}
  return res
}

export default function EventsList() {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const page = Math.max(parseInt(sp.get('page') || '1', 10), 1)
  const q = sp.get('q') || ''
  const type = sp.get('type') || ''
  const severity = sp.get('severity') || ''
  const country = sp.get('country') || ''
  const limit = 20
  const offset = (page - 1) * limit

  // Use hook with meta for total count
  const { data: metaData, isLoading } = useDisastersWithMeta({ q, type, severity, country, limit, offset })
  const items = useMemo<Disaster[]>(() => metaData?.items || [], [metaData])
  const total = metaData?.total || 0

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(sp)
    if (v) next.set(k, v); else next.delete(k)
    if (k !== 'page') next.set('page', '1')
    setSp(next, { replace: true })
  }

  const dotClass = (sev?: string) => {
    const v = (sev || '').toLowerCase()
    if (v === 'red') return 'bg-red-500'
    if (v === 'yellow' || v === 'orange') return 'bg-orange-500'
    return 'bg-green-500'
  }

  const hasActiveFilters = Boolean(q || type || severity || country)
  const clearAll = () => {
    const next = new URLSearchParams(sp)
    next.delete('q'); next.delete('type'); next.delete('severity'); next.delete('country')
    next.set('page', '1')
    setSp(next, { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">All Events</h1>
          <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline">Back</button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Search" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <input value={type} onChange={(e) => setParam('type', e.target.value)} placeholder="Type (earthquake, flood...)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <input value={severity} onChange={(e) => setParam('severity', e.target.value)} placeholder="Severity (red, yellow, green)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
            <input value={country} onChange={(e) => setParam('country', e.target.value)} placeholder="Country code (US, NG, ...)" className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm" />
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center mt-3">
              {q && (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Search: “{q}”
                  <button aria-label="Clear search" onClick={() => setParam('q', '')} className="hover:text-blue-900"><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
              {type && (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Type: {type}
                  <button aria-label="Clear type" onClick={() => setParam('type', '')} className="hover:text-purple-900"><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
              {severity && (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Severity: {severity}
                  <button aria-label="Clear severity" onClick={() => setParam('severity', '')} className="hover:text-amber-900"><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
              {country && (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">
                  Country: {country}
                  <button aria-label="Clear country" onClick={() => setParam('country', '')} className="hover:text-green-900"><X className="h-3.5 w-3.5" /></button>
                </span>
              )}
              <button onClick={clearAll} className="ml-1 text-xs text-slate-600 hover:text-slate-900 underline">Clear all</button>
            </div>
          )}
        </div>

        {/* Results meta */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
          <div>
            {total > 0 ? (
              <span>
                Showing {Math.min(offset + 1, total)}–{Math.min(offset + (items?.length || 0), total)} of {total} results
              </span>
            ) : (
              <span>No results</span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No events found</div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((d) => (
                <li key={d.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 h-3 w-3 rounded-full mt-1.5 ${dotClass(d.severity)}`}></div>
                    {/* Optional thumbnail if embedded img src found in title */}
                    {(() => { const src = extractFirstImageSrc(d.title); return src ? (
                      <img src={src} alt="" className="hidden sm:block w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700" loading="lazy" />
                    ) : null })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <button onClick={() => navigate(`/disaster/${d.id}`)} className="font-semibold text-left text-slate-900 dark:text-white hover:underline line-clamp-2">
                          {stripHtmlAndDecode(d.title)}
                        </button>
                        <span title={new Date(d.occurred_at).toLocaleString()} className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatRelative(d.occurred_at)}</span>
                      </div>
                      <div className="mt-1 flex items-center flex-wrap gap-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{prettyType(d.type, d.title)}{d.country ? ` • ${d.country}` : ''}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${severityLabel(d.severity).className}`}>{severityLabel(d.severity).label}</span>
                        {d.source && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600 uppercase tracking-wide">{d.source}</span>
                        )}
                      </div>
                      {/* Earthquake report summary, if applicable */}
                      {(() => {
                        const titleText = stripHtmlAndDecode(d.title)
                        const isWorldEqReport = /world earthquake report/i.test(titleText) || /earthquake stats/i.test(d.title)
                        if (!isWorldEqReport) return null
                        const parsed = parseEarthquakeReport(d.title)
                        return (
                          <div className="mt-2">
                            {parsed.totals && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {typeof parsed.totals.total === 'number' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">Total: {parsed.totals.total}</span>
                                )}
                                {typeof parsed.totals.m5 === 'number' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 border border-red-200 text-red-700">M5+: {parsed.totals.m5}</span>
                                )}
                                {typeof parsed.totals.m4 === 'number' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 border border-amber-200 text-amber-700">M4+: {parsed.totals.m4}</span>
                                )}
                                {typeof parsed.totals.m3 === 'number' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-50 border border-yellow-200 text-yellow-700">M3+: {parsed.totals.m3}</span>
                                )}
                                {typeof parsed.totals.m2 === 'number' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 border border-green-200 text-green-700">M2+: {parsed.totals.m2}</span>
                                )}
                              </div>
                            )}
                            {parsed.top && parsed.top.length > 0 && (
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                <div className="font-semibold mb-1">Largest quakes (24h)</div>
                                <ul className="space-y-1">
                                  {parsed.top.map(q => (
                                    <li key={q.rank} className="flex items-center gap-1">
                                      <span className="inline-block w-5 text-slate-500">#{q.rank}</span>
                                      <span className="font-medium">M{q.mag.toFixed(1)}</span>
                                      <span className="mx-1">·</span>
                                      {q.url ? (
                                        <a href={q.url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                                          {q.title}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : (
                                        <span>{q.title}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button disabled={page<=1} onClick={() => setParam('page', String(page-1))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50">Prev</button>
          <div className="text-xs text-slate-500">Page {page}</div>
          <button disabled={(items?.length||0) < limit} onClick={() => setParam('page', String(page+1))} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  )
}
