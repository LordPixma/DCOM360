import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDisaster } from '@/hooks/useDisaster'
import { ArrowLeft, ExternalLink, MapPin, Globe2, AlertTriangle, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useEarthquakeReport } from '@/hooks/useEarthquakeReport'

function stripHtmlAndDecode(input?: string): string {
  const text = String(input || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' '
  }
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => entities[m] || m)
}

function extractImageSrcs(input?: string, max = 3): string[] {
  const html = String(input || '')
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && out.length < max) out.push(m[1])
  return out
}

function severityLabel(sev?: string): { label: string } {
  const v = (sev || '').toLowerCase()
  if (v === 'red') return { label: 'Critical' }
  if (v === 'yellow' || v === 'orange') return { label: 'Warning' }
  return { label: 'Monitoring' }
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

function typeIcon(label: string): string {
  const t = label.toLowerCase()
  if (t.includes('earthquake')) return '🌎'
  if (t.includes('volcano')) return '🌋'
  if (t.includes('flood')) return '🌊'
  if (t.includes('cyclone') || t.includes('hurricane') || t.includes('typhoon')) return '🌀'
  if (t.includes('wildfire') || t.includes('bushfire')) return '🔥'
  return '⚠️'
}

function fmtUTC(ts?: string) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('en-GB', { timeZone: 'UTC', hour12: false }) + ' UTC'
  } catch { return ts }
}

type QuakeEntry = { rank: number; mag: number; title: string; url?: string; felt?: number }
function parseEarthquakeReport(html?: string): { totals?: { total?: number; m5?: number; m4?: number; m3?: number; m2?: number }; top?: QuakeEntry[]; regions?: { [key: string]: number }; timeline?: { hour: number; count: number }[] } {
  const res: { totals?: any; top?: QuakeEntry[]; regions?: { [key: string]: number }; timeline?: { hour: number; count: number }[] } = {}
  try {
    const safe = String(html || '')
    
    // Enhanced summary parsing - handles both HTML and plain text formats
    const sumMatch = safe.match(/Summary:\s*([^<\n]+)/i)
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
        m2: m2 ? Number(m2[2]) : undefined,
      }
    }
    
    const top: QuakeEntry[] = []
    const regions: { [key: string]: number } = {}
    const timeline: { hour: number; count: number }[] = []
    const hourCounts: { [key: number]: number } = {}
    
    // Pattern 1: HTML anchors (existing format)
    const re1 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re1.exec(safe)) && top.length < 20) {
      const entry = { rank: Number(m[1]), mag: Number(m[2]), url: m[3], title: m[4] }
      top.push(entry)
      
      // Extract region for clustering
      const region = extractRegion(entry.title)
      if (region) regions[region] = (regions[region] || 0) + 1
    }

    // Pattern 2: Raw text format from attachment - handles multi-line entries  
    if (top.length === 0) {
      const rawPattern = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*([^#]+?)(?=\s*#\d+:|$)/gi
      let m2: RegExpExecArray | null
      while ((m2 = rawPattern.exec(safe)) && top.length < 20) {
        const rank = Number(m2[1])
        const mag = Number(m2[2])
        const fullText = m2[3].trim()
        
        // Extract location (everything before the date pattern)
        const dateMatch = fullText.match(/(.+?)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*([^-]+)/i)
        const location = dateMatch ? dateMatch[1].trim().replace(/,\s*$/, '') : fullText.split(',')[0]
        const datetime = dateMatch ? dateMatch[2].trim() : ''
        
        // Extract felt reports if present
        const feltMatch = fullText.match(/(\d+)\s*(?:felt\s*)?reports?/i)
        const felt = feltMatch ? Number(feltMatch[1]) : undefined
        
        // Extract hour for timeline
        const timeMatch = datetime.match(/at\s+(\d+):(\d+)\s*([ap]m)/i)
        if (timeMatch) {
          let hour = Number(timeMatch[1])
          if (timeMatch[3].toLowerCase() === 'pm' && hour !== 12) hour += 12
          if (timeMatch[3].toLowerCase() === 'am' && hour === 12) hour = 0
          hourCounts[hour] = (hourCounts[hour] || 0) + 1
        }
        
        const entry = { 
          rank, 
          mag, 
          title: location,
          felt,
          datetime
        }
        top.push(entry)
        
        // Extract region for clustering
        const region = extractRegion(location)
        if (region) regions[region] = (regions[region] || 0) + 1
      }
    }

    // Pattern 3: Fallback for simple formats
    if (top.length === 0) {
      const re3 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*(?:[-–]\s*)?([^#\n]+?)(?:\s*[-–]\s*(\d+)\s*(?:felt\s*)?reports?)?(?=\s*#|$)/gi
      let m3: RegExpExecArray | null
      while ((m3 = re3.exec(safe)) && top.length < 20) {
        const rank = Number(m3[1])
        const mag = Number(m3[2])
        const title = m3[3].trim()
        const felt = m3[4] ? Number(m3[4]) : undefined
        const entry = { rank, mag, title, felt }
        top.push(entry)
        
        // Extract region for clustering
        const region = extractRegion(title)
        if (region) regions[region] = (regions[region] || 0) + 1
      }
    }
    
    // Build timeline from hour counts
    for (let hour = 0; hour < 24; hour++) {
      timeline.push({ hour, count: hourCounts[hour] || 0 })
    }
    
    if (top.length) res.top = top.sort((a, b) => a.rank - b.rank)
    if (Object.keys(regions).length) res.regions = regions
    if (timeline.some(t => t.count > 0)) res.timeline = timeline
    
  } catch {}
  return res
}

// Helper function to extract region from location string
function extractRegion(location: string): string | null {
  if (!location) return null
  
  // Extract country/region patterns
  const patterns = [
    /,\s*([A-Z][a-zA-Z\s]+)$/,  // "Location, Country"
    /\b(Indonesia|Japan|Chile|Peru|Turkey|Greece|Iran|Philippines|New Zealand|Alaska|California|Mexico)\b/i,
    /\b(Pacific|Atlantic|Indian)\s+Ocean/i,
    /\b(Ring of Fire|Mariana|Caribbean|Mediterranean)\b/i
  ]
  
  for (const pattern of patterns) {
    const match = location.match(pattern)
    if (match) return match[1].trim()
  }
  
  // Fallback: use last part after comma
  const parts = location.split(',')
  if (parts.length > 1) {
    return parts[parts.length - 1].trim()
  }
  
  return null
}

export function DisasterDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { data, isLoading, error } = useDisaster(id)
  const isEqReport = data?.title ? /world earthquake report/i.test(data.title) : false
  const sanitizedTitle = stripHtmlAndDecode(data?.title)
  const images = extractImageSrcs(data?.title, 3)
  const parsed = isEqReport ? parseEarthquakeReport(data?.title) : undefined
  const [expanded, setExpanded] = useState<boolean>(false)
  useEffect(() => {
    // Default collapsed on small screens
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) {
      setExpanded(false)
    } else {
      setExpanded(true)
    }
  }, [id])
  const { data: enriched, isLoading: enrichLoading } = useEarthquakeReport(isEqReport ? id : undefined)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Home</Link>
        </div>
        {isLoading && (
          <div className="p-10 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="animate-spin h-10 w-10 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading details…</p>
          </div>
        )}
        {error && (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-700 shadow-sm">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-600 dark:text-red-400">Unable to load disaster details.</p>
          </div>
        )}
        {data && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start gap-4 justify-between mb-4">
                <div className="space-y-2 max-w-3xl">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-3">
                    {sanitizedTitle}
                    {data.source && (
                      <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{data.source}</span>
                    )}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><Activity className="h-4 w-4" /> <span aria-hidden>{typeIcon(prettyType(data.type, data.title))}</span> {prettyType(data.type, data.title)}</span>
                    {data.country && <span className="inline-flex items-center gap-1"><Globe2 className="h-4 w-4" /> {data.country}</span>}
                    <span title={new Date(data.occurred_at).toISOString()}>{fmtUTC(data.occurred_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border shadow-sm ${data.severity === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' : data.severity === 'yellow' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${data.severity === 'red' ? 'bg-red-500' : data.severity === 'yellow' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                    {severityLabel(data.severity).label}
                  </div>
                  {data.latitude && data.longitude && (
                    <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=6/${data.latitude}/${data.longitude}`} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      <MapPin className="h-3.5 w-3.5" /> View on map <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {data.source && (
                    <a
                      href={data.source === 'gdacs' ? 'https://www.gdacs.org' : (data.source === 'reliefweb' ? 'https://reliefweb.int' : '#')}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:underline"
                      title={data.source === 'gdacs' ? 'Data source: GDACS' : data.source === 'reliefweb' ? 'Data source: ReliefWeb' : 'Data source'}
                    >
                      Source: {data.source}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              {images.length > 0 && (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {images.map((src, i) => (
                    <img key={i} src={src} alt="" className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700" loading="lazy" />
                  ))}
                </div>
              )}
              {data.description && (
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                  {stripHtmlAndDecode(String(data.description))}
                </div>
              )}
              {isEqReport && (
                <div className="mt-8">
                  {/* Title + timestamp */}
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">World Earthquake Report</h2>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <strong>{new Date(data.occurred_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    <span className="mx-1">-</span>
                    <span>{new Date(data.occurred_at).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })} UTC</span>
                  </div>

                  {/* Executive Summary */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                      Worldwide earthquakes above magnitude 3.0 during the past 24 hours (Updated hourly)
                    </p>
                    {parsed?.totals && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          <thead className="bg-slate-50 dark:bg-slate-700/40">
                            <tr>
                              <th className="text-left px-3 py-2 border-b border-slate-200 dark:border-slate-700">Magnitude Range</th>
                              <th className="text-left px-3 py-2 border-b border-slate-200 dark:border-slate-700">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {typeof parsed.totals.m5 === 'number' && (
                              <tr>
                                <td className="px-3 py-2">5.0+</td>
                                <td className="px-3 py-2">{parsed.totals.m5} earthquakes</td>
                              </tr>
                            )}
                            {typeof parsed.totals.m4 === 'number' && (
                              <tr>
                                <td className="px-3 py-2">4.0+</td>
                                <td className="px-3 py-2">{parsed.totals.m4} earthquakes</td>
                              </tr>
                            )}
                            {typeof parsed.totals.m3 === 'number' && (
                              <tr>
                                <td className="px-3 py-2">3.0+</td>
                                <td className="px-3 py-2">{parsed.totals.m3} earthquakes</td>
                              </tr>
                            )}
                            {typeof parsed.totals.m2 === 'number' && (
                              <tr>
                                <td className="px-3 py-2">2.0+</td>
                                <td className="px-3 py-2">{parsed.totals.m2} earthquakes</td>
                              </tr>
                            )}
                            {typeof parsed.totals.total === 'number' && (
                              <tr className="font-semibold">
                                <td className="px-3 py-2">Total</td>
                                <td className="px-3 py-2">{parsed.totals.total} earthquakes</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Note: no M6+ */}
                    {(() => {
                      const hasM6 = Boolean(parsed?.top?.some(q => q.mag >= 6))
                      if (hasM6) return null
                      return (
                        <div className="mt-3 text-sm">⚠️ <strong>No earthquakes of magnitude 6.0 or higher recorded</strong></div>
                      )
                    })()}
                  </div>

                  {/* Regional Distribution Chart */}
                  {parsed?.regions && Object.keys(parsed.regions).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Regional Distribution</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(parsed.regions)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 6)
                          .map(([region, count]) => {
                            const maxCount = Math.max(...Object.values(parsed.regions!))
                            const percentage = (count / maxCount) * 100
                            return (
                              <div key={region} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{region}</span>
                                  <span className="text-sm text-slate-600 dark:text-slate-400">{count}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Timeline Visualization */}
                  {parsed?.timeline && parsed.timeline.some(t => t.count > 0) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">24-Hour Activity Timeline (UTC)</h3>
                      <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                        <div className="flex items-end justify-between gap-1 h-24">
                          {parsed.timeline.map(({ hour, count }) => {
                            const maxCount = Math.max(...parsed.timeline!.map(t => t.count))
                            const height = maxCount > 0 ? (count / maxCount) * 100 : 0
                            return (
                              <div key={hour} className="flex flex-col items-center gap-1 flex-1">
                                <div 
                                  className={`w-full rounded-t ${count > 0 ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-600'} transition-all duration-300`}
                                  style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '2px' }}
                                  title={`${hour.toString().padStart(2, '0')}:00 UTC - ${count} earthquakes`}
                                ></div>
                                {hour % 4 === 0 && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {hour.toString().padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                          Hover over bars to see earthquake counts per hour
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Magnitude Distribution */}
                  {parsed?.totals && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Magnitude Distribution</h3>
                      <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
                        <div className="space-y-3">
                          {[
                            { range: '5.0+', count: parsed.totals.m5, color: 'bg-red-500', label: 'Major' },
                            { range: '4.0+', count: parsed.totals.m4, color: 'bg-orange-500', label: 'Light' },
                            { range: '3.0+', count: parsed.totals.m3, color: 'bg-yellow-500', label: 'Minor' },
                            { range: '2.0+', count: parsed.totals.m2, color: 'bg-green-500', label: 'Micro' }
                          ].map(({ range, count, color, label }) => {
                            if (typeof count !== 'number') return null
                            const maxCount = parsed.totals?.total || 1
                            const percentage = (count / maxCount) * 100
                            return (
                              <div key={range} className="flex items-center gap-3">
                                <div className="w-16 text-sm font-medium text-slate-900 dark:text-white">{range}</div>
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-4 relative overflow-hidden">
                                    <div 
                                      className={`${color} h-full rounded-full transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <div className="w-12 text-sm text-slate-600 dark:text-slate-400 text-right">{count}</div>
                                </div>
                                <div className="w-16 text-xs text-slate-500 dark:text-slate-400">{label}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Largest Quakes */}
                  {parsed?.top && parsed.top.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-lg font-semibold">Top {parsed.top.length} Largest Earthquakes (Past 24 Hours)</h3>
                        <button
                          onClick={() => setExpanded(v => !v)}
                          className="text-sm px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          aria-expanded={expanded}
                          aria-controls="eq-top-list"
                        >
                          {expanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      {!expanded && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">Summary hidden on small screens. Tap “Expand” to view details.</div>
                      )}
                      {/* Group >=5.9 as red */}
                      {expanded && parsed.top.filter(q => q.mag >= 5.9).length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">🔴 Magnitude 5.9 Earthquakes</h4>
                          <ul className="space-y-2 text-sm">
                            {parsed.top.filter(q => q.mag >= 5.9).map(q => (
                              <li key={`r-${q.rank}`} className="leading-snug">
                                <div className="font-medium">#{q.rank}: M{q.mag.toFixed(1)} - {q.title}</div>
                                {/* Enriched details if available */}
                                {enriched && enriched.top && enriched.top.find(e => e.rank === q.rank) && (
                                  (() => {
                                    const e = enriched!.top!.find(e => e.rank === q.rank)!
                                    const where = e.location || e.region || e.country
                                      ? `Location: ${[e.location || null, e.region || null, e.country || null].filter(Boolean)[0]}`
                                      : ''
                                    const local = e.local_time ? `Time: ${e.local_time}` : ''
                                    const felt = typeof e.felt === 'number' ? `Reports: ${e.felt} felt reports` : ''
                                    const parts = [where, local, felt].filter(Boolean)
                                    const map = (typeof e.lat === 'number' && typeof e.lon === 'number')
                                      ? (
                                        <a
                                          key="map"
                                          href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lon}#map=7/${e.lat}/${e.lon}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          View on map <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : null
                                    return (
                                      <div className="text-slate-600 dark:text-slate-400">
                                        {parts.join(' • ')}
                                        {map && (parts.length ? ' • ' : null)}
                                        {map}
                                      </div>
                                    )
                                  })()
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Group 5.0–5.8 */}
                      {expanded && parsed.top.filter(q => q.mag >= 5 && q.mag < 5.9).length > 0 && (
                        <div className="mb-2">
                          <h4 className="font-semibold mb-2">🟠 Magnitude 5.0–5.8 Earthquakes</h4>
                          <ul className="space-y-2 text-sm">
                            {parsed.top.filter(q => q.mag >= 5 && q.mag < 5.9).map(q => (
                              <li key={`o-${q.rank}`} className="leading-snug">
                                <div className="font-medium">#{q.rank}: M{q.mag.toFixed(1)} - {q.title}</div>
                                {enriched && enriched.top && enriched.top.find(e => e.rank === q.rank) && (
                                  (() => {
                                    const e = enriched!.top!.find(e => e.rank === q.rank)!
                                    const where = e.location || e.region || e.country
                                      ? `Location: ${[e.location || null, e.region || null, e.country || null].filter(Boolean)[0]}`
                                      : ''
                                    const local = e.local_time ? `Time: ${e.local_time}` : ''
                                    const felt = typeof e.felt === 'number' ? `Reports: ${e.felt} felt reports` : ''
                                    const parts = [where, local, felt].filter(Boolean)
                                    const map = (typeof e.lat === 'number' && typeof e.lon === 'number')
                                      ? (
                                        <a
                                          key="map"
                                          href={`https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lon}#map=7/${e.lat}/${e.lon}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          View on map <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ) : null
                                    return (
                                      <div className="text-slate-600 dark:text-slate-400">
                                        {parts.join(' • ')}
                                        {map && (parts.length ? ' • ' : null)}
                                        {map}
                                      </div>
                                    )
                                  })()
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {expanded && enrichLoading && (
                        <div className="text-xs text-slate-500">Loading details…</div>
                      )}
                    </div>
                  )}

                  {/* Most Widely Felt (if we parsed felt counts) */}
                  {(() => {
                    const withFelt = (parsed?.top || []).filter(q => typeof q.felt === 'number')
                    if (withFelt.length === 0) return null
                    const topFelt = [...withFelt].sort((a, b) => (b.felt! - a.felt!)).slice(0, 5)
                    return (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Most Widely Felt Earthquakes</h3>
                        <ol className="list-decimal ml-5 space-y-1 text-sm">
                          {topFelt.map(q => (
                            <li key={`felt-${q.rank}`}>
                              <strong>M{q.mag.toFixed(1)} {q.title}</strong> - {q.felt} reports
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  })()}

                  {/* Key Observations */}
                  <div className="mb-2">
                    <h3 className="text-lg font-semibold mb-2">Key Observations</h3>
                    <ul className="list-disc ml-5 text-sm space-y-1">
                      {!(parsed?.top?.some(q => q.mag >= 6)) && (
                        <li><strong>No major earthquakes</strong> (M6.0+) recorded in the past 24 hours</li>
                      )}
                      {(() => {
                        const withFelt = (parsed?.top || []).filter(q => typeof q.felt === 'number')
                        if (!withFelt.length) return null
                        const most = [...withFelt].sort((a, b) => (b.felt! - a.felt!))[0]
                        return (
                          <li><strong>Most felt earthquake</strong>: M{most.mag.toFixed(1)} {most.title} with {most.felt} reports</li>
                        )
                      })()}
                      <li><strong>Global distribution</strong>: Activity spans multiple regions along the Pacific Ring of Fire and beyond</li>
                    </ul>
                  </div>
                </div>
              )}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.magnitude && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-xs uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1">Magnitude</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.magnitude}</div>
                  </div>
                )}
                {data.wind_speed && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-xs uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1">Wind Speed</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.wind_speed} km/h</div>
                  </div>
                )}
                {data.depth_km && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-xs uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1">Depth</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.depth_km} km</div>
                  </div>
                )}
                {data.affected_population && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-xs uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1">Affected Population</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.affected_population.toLocaleString()}</div>
                  </div>
                )}
                {data.affected_radius_km && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
                    <div className="text-xs uppercase font-semibold tracking-wide text-slate-500 dark:text-slate-400 mb-1">Affected Radius</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">{data.affected_radius_km} km</div>
                  </div>
                )}
              </div>
              {data.metadata && (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Additional Metadata</h2>
                  <pre className="text-xs bg-slate-900/90 text-slate-100 p-4 rounded-lg overflow-auto max-h-72">{JSON.stringify(data.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
