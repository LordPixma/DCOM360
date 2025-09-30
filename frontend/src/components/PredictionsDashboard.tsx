import React, { useState } from 'react'
import { Brain, TrendingUp, AlertTriangle, Calendar, MapPin, Activity, Zap, Target, Eye } from 'lucide-react'
import { useAIPredictionsDashboard } from '../hooks/usePredictions'
import type { RiskAssessment, EarlyWarning, TrendAnalysis, AIInsight } from '../hooks/usePredictions'

interface PredictionsDashboardProps {
  className?: string
}

export function PredictionsDashboard({ className = '' }: PredictionsDashboardProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('NG')
  const [selectedType, setSelectedType] = useState<string>('wildfire')
  const [timeframe, setTimeframe] = useState<string>('6 months')

  const {
    allData,
    isLoading,
    hasError
  } = useAIPredictionsDashboard({
    country: selectedCountry,
    disasterType: selectedType,
    timeframe,
    lookbackDays: 30,
    insightDays: 7
  })

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Predictive Analytics</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Predictive Analytics</h2>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-500">Failed to load AI predictions. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header with Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">AI Predictive Analytics</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              BETA
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="NG">Nigeria</option>
              <option value="US">United States</option>
              <option value="AU">Australia</option>
              <option value="BR">Brazil</option>
              <option value="IN">India</option>
            </select>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="wildfire">Wildfire</option>
              <option value="flood">Flood</option>
              <option value="earthquake">Earthquake</option>
              <option value="cyclone">Cyclone</option>
              <option value="drought">Drought</option>
            </select>
            
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="3 months">3 Months</option>
              <option value="6 months">6 Months</option>
              <option value="1 year">1 Year</option>
              <option value="2 years">2 Years</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={Target}
            title="Risk Score"
            value={allData.riskAssessments[0]?.risk_score?.toString() || 'N/A'}
            subtitle={`${Math.round((allData.riskAssessments[0]?.confidence || 0) * 100)}% confidence`}
            color="red"
            trend={allData.riskAssessments[0]?.risk_score > 70 ? 'high' : allData.riskAssessments[0]?.risk_score > 40 ? 'medium' : 'low'}
          />
          
          <MetricCard
            icon={AlertTriangle}
            title="Active Warnings"
            value={allData.earlyWarnings.length.toString()}
            subtitle="Early alerts"
            color="yellow"
            trend={allData.earlyWarnings.length > 0 ? 'high' : 'low'}
          />
          
          <MetricCard
            icon={TrendingUp}
            title="Trend Direction"
            value={allData.trendAnalyses[0]?.trend_direction || 'Stable'}
            subtitle={`${timeframe} analysis`}
            color="blue"
            trend={allData.trendAnalyses[0]?.trend_direction === 'increasing' ? 'high' : 
                   allData.trendAnalyses[0]?.trend_direction === 'decreasing' ? 'low' : 'medium'}
          />
          
          <MetricCard
            icon={Eye}
            title="AI Insights"
            value={allData.aiInsights.length.toString()}
            subtitle="Recent patterns"
            color="purple"
            trend={allData.aiInsights.length > 2 ? 'high' : 'low'}
          />
        </div>

        {/* Early Warnings Section */}
        {allData.earlyWarnings.length > 0 && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
              Early Warning Alerts
            </h3>
            <div className="space-y-3">
              {allData.earlyWarnings.slice(0, 3).map((warning) => (
                <EarlyWarningCard key={warning.id} warning={warning} />
              ))}
            </div>
          </div>
        )}

        {/* Risk Assessment Section */}
        {allData.riskAssessments.length > 0 && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <Target className="h-4 w-4 text-red-500 mr-2" />
              Risk Assessment
            </h3>
            <div className="space-y-3">
              {allData.riskAssessments.map((assessment, idx) => (
                <RiskAssessmentCard key={idx} assessment={assessment} />
              ))}
            </div>
          </div>
        )}

        {/* Trend Analysis Section */}
        {allData.trendAnalyses.length > 0 && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 text-blue-500 mr-2" />
              Trend Analysis
            </h3>
            <div className="space-y-3">
              {allData.trendAnalyses.map((trend, idx) => (
                <TrendAnalysisCard key={idx} trend={trend} />
              ))}
            </div>
          </div>
        )}

        {/* AI Insights Section */}
        {allData.aiInsights.length > 0 && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <Brain className="h-4 w-4 text-purple-500 mr-2" />
              AI Insights
            </h3>
            <div className="space-y-3">
              {allData.aiInsights.slice(0, 5).map((insight) => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Seasonal Forecast */}
        {allData.seasonalForecasts.length > 0 && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="h-4 w-4 text-green-500 mr-2" />
              Seasonal Forecast
            </h3>
            <div className="space-y-3">
              {allData.seasonalForecasts.map((forecast, idx) => (
                <SeasonalForecastCard key={idx} forecast={forecast} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {Object.values(allData).every(arr => arr.length === 0) && (
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Predictions Available</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Insufficient historical data for {selectedType} disasters in {selectedCountry}. 
              Try selecting a different country or disaster type.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Supporting Components

interface MetricCardProps {
  icon: React.ComponentType<any>
  title: string
  value: string
  subtitle: string
  color: 'red' | 'yellow' | 'blue' | 'purple'
  trend: 'high' | 'medium' | 'low'
}

function MetricCard({ icon: Icon, title, value, subtitle, color, trend }: MetricCardProps) {
  const colorClasses = {
    red: 'text-red-600 bg-red-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50'
  }

  const trendClasses = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendClasses[trend]}`}>
          {trend.toUpperCase()}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

function EarlyWarningCard({ warning }: { warning: EarlyWarning }) {
  const severityColors = {
    red: 'bg-red-100 border-red-200 text-red-800',
    yellow: 'bg-yellow-100 border-yellow-200 text-yellow-800',
    green: 'bg-green-100 border-green-200 text-green-800'
  }

  return (
    <div className={`p-4 rounded-lg border ${severityColors[warning.severity_prediction]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm capitalize">
            {warning.disaster_type} Risk - {warning.regions.join(', ')}
          </h4>
          <p className="text-xs mt-1 opacity-90">
            {Math.round(warning.confidence * 100)}% confidence • {warning.estimated_timeline}
          </p>
          <div className="mt-2">
            <p className="text-xs font-medium">Key Indicators:</p>
            <ul className="text-xs mt-1 space-y-0.5">
              {warning.key_indicators.slice(0, 3).map((indicator, idx) => (
                <li key={idx}>• {indicator}</li>
              ))}
            </ul>
          </div>
        </div>
        <Zap className="h-4 w-4 ml-2 flex-shrink-0" />
      </div>
    </div>
  )
}

function RiskAssessmentCard({ assessment }: { assessment: RiskAssessment }) {
  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${getRiskColor(assessment.risk_score)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm capitalize">
            {assessment.disaster_type} Risk in {assessment.country}
          </h4>
          <p className="text-xs mt-1 opacity-90">
            {Math.round(assessment.confidence * 100)}% confidence • {assessment.time_horizon_days} day horizon
          </p>
          <div className="mt-2">
            <p className="text-xs font-medium">Risk Factors:</p>
            <ul className="text-xs mt-1 space-y-0.5">
              {assessment.factors.slice(0, 3).map((factor, idx) => (
                <li key={idx}>• {factor}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-lg font-bold">{assessment.risk_score}</div>
          <div className="text-xs opacity-75">Risk Score</div>
        </div>
      </div>
    </div>
  )
}

function TrendAnalysisCard({ trend }: { trend: TrendAnalysis }) {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return '📈'
      case 'decreasing': return '📉'
      default: return '➡️'
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'text-red-600 bg-red-50 border-red-200'
      case 'decreasing': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${getTrendColor(trend.trend_direction)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm capitalize flex items-center">
            <span className="mr-2">{getTrendIcon(trend.trend_direction)}</span>
            {trend.disaster_type} Trend Analysis
          </h4>
          <p className="text-xs mt-1 opacity-90">
            {trend.time_period} • {Math.round(trend.significance * 100)}% significance
          </p>
          <div className="mt-2">
            <p className="text-xs font-medium">Contributing Factors:</p>
            <ul className="text-xs mt-1 space-y-0.5">
              {trend.contributing_factors.slice(0, 2).map((factor, idx) => (
                <li key={idx}>• {factor}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="text-right ml-2">
          <div className="text-lg font-bold capitalize">{trend.trend_direction}</div>
          <div className="text-xs opacity-75">{trend.change_rate > 0 ? '+' : ''}{Math.round(trend.change_rate * 100)}%</div>
        </div>
      </div>
    </div>
  )
}

function AIInsightCard({ insight }: { insight: AIInsight }) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return '🔍'
      case 'anomaly': return '⚠️'
      case 'trend': return '📊'
      case 'correlation': return '🔗'
      default: return '💡'
    }
  }

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${getImpactColor(insight.impact_level)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm flex items-center">
            <span className="mr-2">{getInsightIcon(insight.type)}</span>
            {insight.title}
          </h4>
          <p className="text-xs mt-1">{insight.description}</p>
          <p className="text-xs mt-2 opacity-75">
            {Math.round(insight.confidence * 100)}% confidence • {insight.impact_level} impact
          </p>
        </div>
        <Activity className="h-4 w-4 ml-2 flex-shrink-0" />
      </div>
    </div>
  )
}

function SeasonalForecastCard({ forecast }: { forecast: any }) {
  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'extreme': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${getLikelihoodColor(forecast.likelihood)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm capitalize">
            {forecast.season} {forecast.disaster_type} Season
          </h4>
          <p className="text-xs mt-1 opacity-90">
            Peak: {forecast.peak_period} • {Math.round(forecast.confidence * 100)}% confidence
          </p>
          <p className="text-xs mt-1">
            Regions: {forecast.regions.join(', ')}
          </p>
        </div>
        <div className="text-right ml-2">
          <div className="text-sm font-bold capitalize">{forecast.likelihood}</div>
          <div className="text-xs opacity-75">Likelihood</div>
        </div>
      </div>
    </div>
  )
}