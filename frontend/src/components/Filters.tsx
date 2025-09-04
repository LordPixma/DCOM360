import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { useCountries } from '@/hooks/useCountries'

const SEVERITIES = [
  { value: '', label: 'All severities' },
  { value: 'red', label: 'High (Red)' },
  { value: 'yellow', label: 'Medium (Yellow)' },
  { value: 'green', label: 'Low (Green)' },
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

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4">
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <select
          value={filters.country || ''}
          onChange={(e) => setFilters({ ...filters, country: e.target.value || undefined })}
          className="border rounded-full px-3 py-2 text-sm hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          aria-label="Filter by country"
        >
          {countryOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.severity || ''}
          onChange={(e) => setFilters({ ...filters, severity: (e.target.value || undefined) as any })}
          className="border rounded-full px-3 py-2 text-sm hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          aria-label="Filter by severity"
        >
          {SEVERITIES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filters.type || ''}
          onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
          className="border rounded-full px-3 py-2 text-sm hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          aria-label="Filter by type"
        >
          {TYPES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-xs text-gray-600">Results update live</div>
          <button
            onClick={() => clearFilters()}
            className="text-sm text-brand-primary hover:opacity-80 font-medium"
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  )
}
