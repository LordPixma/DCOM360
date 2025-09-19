import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDisaster } from '@/hooks/useDisaster'
import { ArrowLeft, ExternalLink, MapPin, Globe2, AlertTriangle, Activity } from 'lucide-react'

export function DisasterDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { data, isLoading, error } = useDisaster(id)

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
                    {data.title}
                    {data.source && (
                      <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">{data.source}</span>
                    )}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><Activity className="h-4 w-4" /> {data.type}</span>
                    {data.country && <span className="inline-flex items-center gap-1"><Globe2 className="h-4 w-4" /> {data.country}</span>}
                    <span>{new Date(data.occurred_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border shadow-sm ${data.severity === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' : data.severity === 'yellow' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${data.severity === 'red' ? 'bg-red-500' : data.severity === 'yellow' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                    {data.severity === 'red' ? 'Critical' : data.severity === 'yellow' ? 'Warning' : 'Monitoring'}
                  </div>
                  {data.latitude && data.longitude && (
                    <a target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=6/${data.latitude}/${data.longitude}`} className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      <MapPin className="h-3.5 w-3.5" /> View on map <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              {data.description && (
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                  {data.description}
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
