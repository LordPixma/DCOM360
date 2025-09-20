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
function parseEarthquakeReport(html?: string): { totals?: { total?: number; m5?: number; m4?: number; m3?: number; m2?: number }; top?: QuakeEntry[] } {
  const res: { totals?: any; top?: QuakeEntry[] } = {}
  try {
    const safe = String(html || '')
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
    const top: QuakeEntry[] = []
    // Pattern 1: HTML anchors (before sanitization)
    const re1 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re1.exec(safe)) && top.length < 10) top.push({ rank: Number(m[1]), mag: Number(m[2]), url: m[3], title: m[4] })

    // Pattern 2: Plain text after sanitization: "#1: Mag 5.9 - Location - 6 felt reports"
    if (top.length < 10) {
      const re2 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*(?:[-–]\s*)?([^#\n]+?)(?:\s*[-–]\s*(\d+)\s*(?:felt\s*)?reports?)?(?=\s*#|$)/gi
      let m2: RegExpExecArray | null
      while ((m2 = re2.exec(safe)) && top.length < 10) {
        const rank = Number(m2[1])
        const mag = Number(m2[2])
        const title = m2[3].trim()
        const felt = m2[4] ? Number(m2[4]) : undefined
        top.push({ rank, mag, title, felt })
      }
    }
    if (top.length) res.top = top.sort((a, b) => a.rank - b.rank)
  } catch {}
  return res
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

                  {/* Top Largest Quakes */}
                  {parsed?.top && parsed.top.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-lg font-semibold">Top 10 Largest Earthquakes (Past 24 Hours)</h3>
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
                                  <div className="text-slate-600 dark:text-slate-400">
                                    {(() => {
                                      const e = enriched!.top!.find(e => e.rank === q.rank)!
              const where = e.location || e.region || e.country ? `Location: ${[e.location || null, e.region || null, e.country || null].filter(Boolean)[0]}` : ''
              const local = e.local_time ? `Time: ${e.local_time}` : ''
              const felt = typeof e.felt === 'number' ? `Reports: ${e.felt} felt reports` : ''
              return [where, local, felt].filter(Boolean).join(' • ')
                                    })()}
                                  </div>
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
                                  <div className="text-slate-600 dark:text-slate-400">
                                    {(() => {
                                      const e = enriched!.top!.find(e => e.rank === q.rank)!
              const where = e.location || e.region || e.country ? `Location: ${[e.location || null, e.region || null, e.country || null].filter(Boolean)[0]}` : ''
              const local = e.local_time ? `Time: ${e.local_time}` : ''
              const felt = typeof e.felt === 'number' ? `Reports: ${e.felt} felt reports` : ''
              return [where, local, felt].filter(Boolean).join(' • ')
                                    })()}
                                  </div>
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
