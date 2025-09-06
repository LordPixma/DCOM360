import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { 
  TrendingUp, 
  AlertTriangle, 
  Brain, 
  Calendar,
  MapPin,
  Activity,
  Zap
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement, 
  Tooltip, 
  Legend, 
  Title, 
  Filler
)

interface RiskPrediction {
  country: string;
  riskScore: number;
  disasterType: string;
  confidence: number;
  factors: string[];
  timeframe: string;
}

function movingAverage(values: number[], window: number) {
  const out: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length)
  }
  return out
}

// Simple linear regression for trend prediction
function linearRegression(x: number[], y: number[]) {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  return { slope, intercept }
}

export function PredictiveAnalytics() {
  const [activeView, setActiveView] = useState<'trends' | 'risk' | 'patterns'>('trends')
  const [predictionDays, setPredictionDays] = useState(14)

  const { data: timeseriesData } = useQuery({
    queryKey: ['timeseries-90'],
    queryFn: async () => {
      const res = await api.get('/api/admin/reports/timeseries?days=90')
      return res.data?.data || []
    },
    staleTime: 10 * 60 * 1000
  })

  const { data: summaryData } = useQuery({
    queryKey: ['disaster-summary'],
    queryFn: async () => {
      const res = await api.get('/api/disasters/summary')
      return res.data || {}
    },
    staleTime: 5 * 60 * 1000
  })

  // Enhanced analytics calculations
  const analytics = useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0) return null

    const labels = timeseriesData.map((d: any) => d.day)
    const values = timeseriesData.map((d: any) => d.count)
    const ma7 = movingAverage(values, 7)
    const ma14 = movingAverage(values, 14)
    
    // Trend prediction using linear regression
    const xValues = values.map((_: number, i: number) => i)
    const regression = linearRegression(xValues, values)
    
    // Predict future values
    const futurePoints: number[] = []
    const lastIndex = values.length - 1
    for (let i = 1; i <= predictionDays; i++) {
      const predicted = Math.max(0, regression.slope * (lastIndex + i) + regression.intercept)
      futurePoints.push(Math.round(predicted))
    }
    
    // Volatility calculation (standard deviation of recent changes)
    const changes = values.slice(1).map((v: number, i: number) => v - values[i])
    const volatility = Math.sqrt(changes.reduce((acc: number, change: number) => acc + change * change, 0) / changes.length)
    
    return {
      labels,
      values,
      ma7,
      ma14,
      futurePoints,
      volatility: Math.round(volatility * 100) / 100,
      trend: regression.slope > 0 ? 'increasing' : 'decreasing',
      confidence: Math.max(20, Math.min(85, 70 - volatility * 5)) // Mock confidence based on volatility
    }
  }, [timeseriesData, predictionDays])

  // Mock risk predictions - in production, this would come from ML models
  const riskPredictions: RiskPrediction[] = useMemo(() => [
    {
      country: 'Philippines',
      riskScore: 82,
      disasterType: 'cyclone',
      confidence: 76,
      factors: ['Seasonal patterns', 'Ocean temperature anomalies', 'Historical cyclone tracks'],
      timeframe: 'Next 30 days'
    },
    {
      country: 'Indonesia',
      riskScore: 74,
      disasterType: 'earthquake',
      confidence: 68,
      factors: ['Tectonic plate movement', 'Recent seismic activity', 'Geological stress indicators'],
      timeframe: 'Next 45 days'
    },
    {
      country: 'Australia',
      riskScore: 71,
      disasterType: 'wildfire',
      confidence: 84,
      factors: ['Drought conditions', 'Temperature forecasts', 'Vegetation dryness index'],
      timeframe: 'Next 21 days'
    },
    {
      country: 'Bangladesh',
      riskScore: 79,
      disasterType: 'flood',
      confidence: 73,
      factors: ['Monsoon intensity', 'River water levels', 'Upstream dam releases'],
      timeframe: 'Next 35 days'
    }
  ], [])

  if (!analytics) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  // Prepare chart data with predictions
  const enhancedLabels = [
    ...analytics.labels,
    ...Array.from({ length: predictionDays }, (_, i) => {
      const lastDate = new Date(analytics.labels[analytics.labels.length - 1])
      lastDate.setDate(lastDate.getDate() + i + 1)
      return lastDate.toISOString().split('T')[0]
    })
  ]

  const chartData = {
    labels: enhancedLabels,
    datasets: [
      {
        label: 'Historical Data',
        data: [...analytics.values, ...Array(predictionDays).fill(null)],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      },
      {
        label: '7-day MA',
        data: [...analytics.ma7, ...Array(predictionDays).fill(null)],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 1
      },
      {
        label: 'Prediction',
        data: [...Array(analytics.values.length).fill(null), ...analytics.futurePoints],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        pointRadius: 3
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Disaster Occurrence Trends & ${predictionDays}-Day Forecast`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Disasters'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'from-red-500 to-red-600'
    if (score >= 60) return 'from-orange-500 to-orange-600'
    return 'from-green-500 to-green-600'
  }

  const getRiskTextColor = (score: number) => {
    if (score >= 80) return 'text-red-700 bg-red-50 border-red-200'
    if (score >= 60) return 'text-orange-700 bg-orange-50 border-orange-200'
    return 'text-green-700 bg-green-50 border-green-200'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Predictive Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400">AI-powered disaster forecasting and risk assessment</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {[
            { key: 'trends', label: 'Trends', icon: TrendingUp },
            { key: 'risk', label: 'Risk Assessment', icon: AlertTriangle },
            { key: 'patterns', label: 'Patterns', icon: Activity }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveView(key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeView === key
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeView === 'trends' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Prediction Period:
                  </label>
                  <select
                    value={predictionDays}
                    onChange={(e) => setPredictionDays(Number(e.target.value))}
                    className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-slate-600 dark:text-slate-400">Historical</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded border-dashed border-2 border-red-500"></div>
                  <span className="text-slate-600 dark:text-slate-400">Predicted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Current Trend</p>
                  <p className={`text-lg font-semibold ${
                    analytics.trend === 'increasing' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {analytics.trend === 'increasing' ? '↗ Increasing' : '↘ Decreasing'}
                  </p>
                </div>
                <TrendingUp className={`w-8 h-8 ${
                  analytics.trend === 'increasing' ? 'text-red-500' : 'text-green-500'
                }`} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Volatility</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {analytics.volatility}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Prediction Confidence</p>
                  <p className="text-lg font-semibold text-blue-600">{analytics.confidence}%</p>
                </div>
                <Brain className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Next {predictionDays} Days</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {analytics.futurePoints.reduce((a, b) => a + b, 0)} predicted
                  </p>
                </div>
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="h-96">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </motion.div>
      )}

      {activeView === 'risk' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-xl border border-purple-200 dark:border-purple-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">High-Risk Regions</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {riskPredictions.map((prediction, index) => (
                <motion.div
                  key={prediction.country}
                  className={`p-5 rounded-xl border-2 ${getRiskTextColor(prediction.riskScore)} shadow-sm hover:shadow-md transition-all`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm">
                        <span className="text-2xl">
                          {prediction.disasterType === 'earthquake' ? '🌍' :
                           prediction.disasterType === 'cyclone' ? '🌪️' :
                           prediction.disasterType === 'flood' ? '🌊' :
                           prediction.disasterType === 'wildfire' ? '🔥' : '⚠️'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{prediction.country}</h3>
                        <p className="text-sm capitalize opacity-75">{prediction.disasterType} risk</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{prediction.riskScore}%</div>
                      <div className="text-xs opacity-75">{prediction.confidence}% confidence</div>
                    </div>
                  </div>
                  
                  {/* Risk Score Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Risk Level</span>
                      <span className="font-medium">{prediction.timeframe}</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-60 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getRiskColor(prediction.riskScore)} transition-all duration-1000`}
                        style={{ width: `${prediction.riskScore}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Risk Factors */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Risk Factors:</p>
                    <div className="flex flex-wrap gap-2">
                      {prediction.factors.map((factor, i) => (
                        <span
                          key={i}
                          className="text-xs bg-white bg-opacity-60 px-3 py-1 rounded-full"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeView === 'patterns' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Seasonal Patterns */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Seasonal Patterns</h3>
              <div className="space-y-3">
                {[
                  { type: 'Cyclones', icon: '🌪️', peak: 'Aug-Oct', intensity: 85 },
                  { type: 'Wildfires', icon: '🔥', peak: 'Jun-Sep', intensity: 78 },
                  { type: 'Floods', icon: '🌊', peak: 'Dec-Feb', intensity: 72 },
                  { type: 'Earthquakes', icon: '🌍', peak: 'Year-round', intensity: 45 }
                ].map((pattern, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{pattern.icon}</span>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{pattern.type}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Peak: {pattern.peak}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{pattern.intensity}%</div>
                      <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-500 rounded-full h-2 transition-all duration-500"
                          style={{ width: `${pattern.intensity}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Hotspots */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Geographic Hotspots</h3>
              <div className="space-y-3">
                {[
                  { region: 'Pacific Ring of Fire', risk: 'Earthquakes & Volcanoes', activity: 92 },
                  { region: 'Caribbean Basin', risk: 'Hurricanes & Floods', activity: 78 },
                  { region: 'Mediterranean', risk: 'Wildfires & Droughts', activity: 65 },
                  { region: 'Sahel Region', risk: 'Droughts & Floods', activity: 58 }
                ].map((hotspot, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-slate-900 dark:text-white">{hotspot.region}</div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{hotspot.activity}%</div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">{hotspot.risk}</div>
                    <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-red-500 rounded-full h-2 transition-all duration-500"
                        style={{ width: `${hotspot.activity}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
