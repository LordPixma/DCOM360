import { useQuery } from '@tanstack/react-query'
import { api, APIResponse } from '../lib/api'

export interface EnhancedCountry {
  code: string
  name: string
  region: string | null
  subregion: string | null
  population: number | null
  coordinates_lat: number | null
  coordinates_lng: number | null
}

/**
 * Hook to fetch enhanced country data with population, coordinates, and regional information
 */
export function useEnhancedCountries() {
  return useQuery<EnhancedCountry[]>({
    queryKey: ['countries', 'enhanced'],
    queryFn: async () => {
      const res = await api.get<APIResponse<EnhancedCountry[]>>('/api/countries/enhanced')
      return res.data.data
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}

/**
 * Hook to fetch detailed information for a specific country
 */
export function useCountryDetails(countryCode: string | undefined) {
  return useQuery<EnhancedCountry>({
    queryKey: ['countries', 'details', countryCode],
    queryFn: async () => {
      if (!countryCode) throw new Error('Country code is required')
      const res = await api.get<APIResponse<EnhancedCountry>>(`/api/countries/${countryCode.toUpperCase()}`)
      return res.data.data
    },
    enabled: !!countryCode,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}

/**
 * Utility function to format population numbers
 */
export function formatPopulation(population: number | null): string {
  if (!population) return 'Unknown'
  
  if (population >= 1_000_000_000) {
    return `${(population / 1_000_000_000).toFixed(1)}B`
  }
  if (population >= 1_000_000) {
    return `${(population / 1_000_000).toFixed(1)}M`
  }
  if (population >= 1_000) {
    return `${(population / 1_000).toFixed(0)}K`
  }
  return population.toLocaleString()
}

/**
 * Utility function to get region emoji/icon
 */
export function getRegionIcon(region: string | null): string {
  if (!region) return '🌍'
  
  switch (region) {
    case 'Africa': return '🌍'
    case 'Americas': return '🌎'
    case 'Asia': return '🌏'  
    case 'Europe': return '🇪🇺'
    case 'Oceania': return '🏝️'
    default: return '🌍'
  }
}