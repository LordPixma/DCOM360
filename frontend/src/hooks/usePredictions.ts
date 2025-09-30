import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// Types for AI predictions (matching backend types)
export interface RiskAssessment {
  country: string
  disaster_type: string
  risk_score: number // 0-100
  confidence: number // 0-1
  factors: string[]
  time_horizon_days: number
  last_updated: string
}

export interface SeasonalForecast {
  season: string
  disaster_type: string
  regions: string[]
  likelihood: 'low' | 'medium' | 'high' | 'extreme'
  peak_period: string
  confidence: number
  historical_patterns: string[]
}

export interface EarlyWarning {
  id: string
  disaster_type: string
  regions: string[]
  severity_prediction: 'green' | 'yellow' | 'red'
  confidence: number
  warning_issued: string
  estimated_timeline: string
  key_indicators: string[]
  recommended_actions: string[]
}

export interface TrendAnalysis {
  disaster_type: string
  trend_direction: 'increasing' | 'decreasing' | 'stable'
  change_rate: number
  time_period: string
  significance: number
  contributing_factors: string[]
}

export interface AIInsight {
  id: string
  type: 'pattern' | 'anomaly' | 'trend' | 'correlation'
  title: string
  description: string
  confidence: number
  impact_level: 'low' | 'medium' | 'high'
  created_at: string
  data_points: Record<string, any>
}

/**
 * Hook to fetch AI-powered risk assessments for a specific country
 */
export function useRiskAssessment(country: string, disasterType?: string) {
  return useQuery({
    queryKey: ['risk-assessment', country, disasterType],
    queryFn: async (): Promise<RiskAssessment[]> => {
      const params = new URLSearchParams({ country })
      if (disasterType) {
        params.append('type', disasterType)
      }
      
      const response = await api.get(`/predictions/risk-assessment?${params}`)
      return response.data
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!country
  })
}

/**
 * Hook to fetch seasonal disaster forecasts
 */
export function useSeasonalForecast(disasterType: string, region?: string) {
  return useQuery({
    queryKey: ['seasonal-forecast', disasterType, region],
    queryFn: async (): Promise<SeasonalForecast[]> => {
      const params = new URLSearchParams({ type: disasterType })
      if (region) {
        params.append('region', region)
      }
      
      const response = await api.get(`/predictions/seasonal-forecast?${params}`)
      return response.data
    },
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
    enabled: !!disasterType
  })
}

/**
 * Hook to fetch early warning alerts
 */
export function useEarlyWarnings(lookbackDays: number = 30) {
  return useQuery({
    queryKey: ['early-warnings', lookbackDays],
    queryFn: async (): Promise<EarlyWarning[]> => {
      const params = new URLSearchParams({ lookback: lookbackDays.toString() })
      const response = await api.get(`/predictions/early-warnings?${params}`)
      return response.data
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 30 // Auto-refresh every 30 minutes
  })
}

/**
 * Hook to fetch disaster trend analysis
 */
export function useTrendAnalysis(disasterType?: string, timeframe: string = '1 year') {
  return useQuery({
    queryKey: ['trend-analysis', disasterType, timeframe],
    queryFn: async (): Promise<TrendAnalysis[]> => {
      const params = new URLSearchParams({ timeframe })
      if (disasterType) {
        params.append('type', disasterType)
      }
      
      const response = await api.get(`/predictions/trends?${params}`)
      return response.data
    },
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
  })
}

/**
 * Hook to fetch AI insights from recent disasters
 */
export function useAIInsights(days: number = 7) {
  return useQuery({
    queryKey: ['ai-insights', days],
    queryFn: async (): Promise<AIInsight[]> => {
      const params = new URLSearchParams({ days: days.toString() })
      const response = await api.get(`/predictions/insights?${params}`)
      return response.data
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 60 * 60 // Auto-refresh every hour
  })
}

/**
 * Combined hook that fetches all AI predictions for a comprehensive dashboard
 */
export function useAIPredictionsDashboard(options: {
  country?: string
  disasterType?: string
  region?: string
  timeframe?: string
  lookbackDays?: number
  insightDays?: number
}) {
  const {
    country,
    disasterType,
    region,
    timeframe = '1 year',
    lookbackDays = 30,
    insightDays = 7
  } = options

  const riskAssessment = useRiskAssessment(country || '', disasterType)
  const seasonalForecast = useSeasonalForecast(disasterType || 'wildfire', region)
  const earlyWarnings = useEarlyWarnings(lookbackDays)
  const trendAnalysis = useTrendAnalysis(disasterType, timeframe)
  const aiInsights = useAIInsights(insightDays)

  return {
    riskAssessment,
    seasonalForecast,
    earlyWarnings,
    trendAnalysis,
    aiInsights,
    isLoading: riskAssessment.isLoading || seasonalForecast.isLoading || 
               earlyWarnings.isLoading || trendAnalysis.isLoading || 
               aiInsights.isLoading,
    hasError: riskAssessment.isError || seasonalForecast.isError || 
              earlyWarnings.isError || trendAnalysis.isError || 
              aiInsights.isError,
    allData: {
      riskAssessments: riskAssessment.data || [],
      seasonalForecasts: seasonalForecast.data || [],
      earlyWarnings: earlyWarnings.data || [],
      trendAnalyses: trendAnalysis.data || [],
      aiInsights: aiInsights.data || []
    }
  }
}