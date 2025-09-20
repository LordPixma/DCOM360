import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDisaster } from '@/hooks/useDisaster'
import { ArrowLeft, ExternalLink, MapPin, Globe2, AlertTriangle, Activity } from 'lucide-react'

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

type QuakeEntry = { rank: number; mag: number; title: string; url?: string }
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
    const re = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(safe)) && top.length < 10) top.push({ rank: Number(m[1]), mag: Number(m[2]), url: m[3], title: m[4] })
    if (top.length) res.top = top
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
                <div className="mt-6">
                  {parsed?.totals && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {typeof parsed.totals.total === 'number' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">Total: {parsed.totals.total}</span>
                      )}
                      {typeof parsed.totals.m5 === 'number' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-50 border border-red-200 text-red-700">M5+: {parsed.totals.m5}</span>
                      )}
                      {typeof parsed.totals.m4 === 'number' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-50 border border-amber-200 text-amber-700">M4+: {parsed.totals.m4}</span>
                      )}
                      {typeof parsed.totals.m3 === 'number' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-50 border border-yellow-200 text-yellow-700">M3+: {parsed.totals.m3}</span>
                      )}
                      {typeof parsed.totals.m2 === 'number' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-50 border border-green-200 text-green-700">M2+: {parsed.totals.m2}</span>
                      )}
                    </div>
                  )}
                  {parsed?.top && parsed.top.length > 0 && (
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <div className="font-semibold mb-2">Largest quakes (24h)</div>
                      <ul className="space-y-1.5">
                        {parsed.top.map(q => (
                          <li key={q.rank} className="flex items-center gap-2">
                            <span className="inline-block w-6 text-slate-500">#{q.rank}</span>
                            <span className="font-medium">M{q.mag.toFixed(1)}</span>
                            <span className="mx-1">·</span>
                            {q.url ? (
                              <a href={q.url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                                {q.title}
                                <ExternalLink className="h-3.5 w-3.5" />
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
