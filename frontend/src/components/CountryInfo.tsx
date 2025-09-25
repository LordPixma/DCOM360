import { Globe2, Users, MapPin } from 'lucide-react'
import { useCountryDetails, formatPopulation, getRegionIcon } from '../hooks/useEnhancedCountries'

interface CountryInfoProps {
  countryCode: string | undefined
}

/**
 * Component to display enriched country information including population, region, and coordinates
 */
export function CountryInfo({ countryCode }: CountryInfoProps) {
  const { data: country, isLoading } = useCountryDetails(countryCode)
  
  if (!countryCode) return null
  
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2 mb-2">
          <Globe2 className="h-4 w-4 text-slate-400" />
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-24 animate-pulse"></div>
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-16 animate-pulse"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    )
  }
  
  if (!country) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300">{countryCode}</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>{getRegionIcon(country.region)}</span>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{country.name}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Globe2 className="h-3 w-3" />
              <span>{country.code}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {country.region && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400 w-12">Region:</span>
            <span className="text-slate-900 dark:text-white font-medium">
              {country.subregion || country.region}
            </span>
          </div>
        )}
        
        {country.population && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 w-12">Pop:</span>
            <span className="text-slate-900 dark:text-white font-medium">
              {formatPopulation(country.population)}
            </span>
          </div>
        )}
        
        {country.coordinates_lat && country.coordinates_lng && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 w-12">Coords:</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${country.coordinates_lat}&mlon=${country.coordinates_lng}#map=6/${country.coordinates_lat}/${country.coordinates_lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
            >
              {country.coordinates_lat.toFixed(2)}, {country.coordinates_lng.toFixed(2)}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}