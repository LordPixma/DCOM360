import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { useCountries } from '@/hooks/useCountries'
import { Filter, X } from 'lucide-react'

const SEVERITIES = [
  { value: '', label: 'All severities' },
  { value: 'red', label: 'Critical', color: 'text-red-600' },
  { value: 'yellow', label: 'Warning', color: 'text-orange-600' },
  { value: 'green', label: 'Monitoring', color: 'text-green-600' },
]

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'flood', label: 'Flood' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'wildfire', label: 'Wildfire' },
  { value: 'cyclone', label: 'Cyclone' },
]

export function Filters() {
  const { data: countries } = useCountries()
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const clearFilters = useAppStore((s) => s.clearFilters)

  const countryOptions = useMemo(() => [
    { value: '', label: 'All countries' },
    ...(countries || []).map((c) => ({ value: c.code, label: c.name })),
  ], [countries])

  const hasActiveFilters = filters.country || filters.severity || filters.type

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Filter className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Filters</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Refine your view</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Country</label>
            <select
              value={filters.country || ''}
              onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              aria-label="Filter by country"
            >
              {countryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Severity</label>
            <select
              value={filters.severity || ''}
              onChange={(e) => setFilters({ ...filters, severity: (e.target.value || undefined) as any })}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              aria-label="Filter by severity"
            >
              {SEVERITIES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
            <select
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              aria-label="Filter by type"
            >
              {TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
              <button
                onClick={() => clearFilters()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-all duration-200"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
