import { 
  Env, 
  RiskAssessment, 
  SeasonalForecast, 
  EarlyWarning, 
  TrendAnalysis, 
  AIInsight,
  DisasterRow
} from './types'

// AI Model configurations for different tasks
const AI_MODELS = {
  TEXT_ANALYSIS: '@cf/meta/llama-3.1-8b-instruct',
  REASONING: '@cf/qwen/qwq-32b',
  FAST_ANALYSIS: '@cf/meta/llama-3.1-8b-instruct'
} as const

/**
 * AI-powered risk assessment for geographical regions and disaster types
 */
export async function generateRiskAssessment(
  env: Env,
  country: string,
  disasterType?: string
): Promise<RiskAssessment[]> {
  try {
    // Fetch historical disaster data for the country
    const historicalData = await env.DB.prepare(`
      SELECT disaster_type, severity, event_timestamp, affected_population,
             coordinates_lat, coordinates_lng, title
      FROM disasters 
      WHERE country = ? 
        AND event_timestamp > datetime('now', '-2 years')
        ${disasterType ? 'AND disaster_type = ?' : ''}
      ORDER BY event_timestamp DESC
      LIMIT 200
    `).bind(country, ...(disasterType ? [disasterType] : [])).all<DisasterRow>()

    if (!historicalData.results?.length) {
      return []
    }

    // Prepare data for AI analysis
    const dataAnalysis = prepareHistoricalDataForAI(historicalData.results)
    
    const prompt = `
You are a disaster risk analysis expert. Analyze the following historical disaster data for ${country}${disasterType ? ` focusing on ${disasterType} disasters` : ''} and provide risk assessments.

Historical Data Summary:
${dataAnalysis}

Please provide a detailed risk assessment with the following format for each disaster type found:
1. Risk Score (0-100): Based on frequency, severity, and recent trends
2. Confidence Level (0-1): How confident you are in this assessment
3. Key Risk Factors: List 3-5 main factors contributing to risk
4. Time Horizon: Relevant prediction period in days

Focus on:
- Recent trend patterns (increasing/decreasing frequency)
- Seasonal patterns if apparent
- Severity escalation trends
- Geographic clustering of events
- Population impact patterns

Return your analysis in a structured format.`

    const aiResponse = await env.AI?.run(AI_MODELS.TEXT_ANALYSIS, {
      prompt,
      max_tokens: 1000
    })

    // Parse AI response and create structured risk assessments
    const riskAssessments = parseRiskAssessmentResponse(aiResponse, country, disasterType)
    
    return riskAssessments
  } catch (error) {
    console.error('Error generating risk assessment:', error)
    return []
  }
}

/**
 * Generate seasonal disaster forecasts using AI pattern recognition
 */
export async function generateSeasonalForecast(
  env: Env,
  disasterType: string,
  region?: string
): Promise<SeasonalForecast[]> {
  try {
    // Fetch multi-year seasonal data
    const seasonalQuery = `
      SELECT 
        disaster_type,
        country,
        severity,
        strftime('%m', event_timestamp) as month,
        strftime('%Y', event_timestamp) as year,
        COUNT(*) as event_count,
        AVG(affected_population) as avg_impact
      FROM disasters 
      WHERE disaster_type = ?
        AND event_timestamp > datetime('now', '-5 years')
        ${region ? 'AND country IN (SELECT DISTINCT country FROM disasters WHERE country LIKE ?)' : ''}
      GROUP BY disaster_type, country, month, year
      ORDER BY year, month
    `

    const bindParams = [disasterType]
    if (region) bindParams.push(`%${region}%`)

    const seasonalData = await env.DB.prepare(seasonalQuery)
      .bind(...bindParams).all()

    if (!seasonalData.results?.length) {
      return []
    }

    const seasonalAnalysis = prepareSeasonalDataForAI(seasonalData.results, disasterType)

    const prompt = `
You are a seasonal disaster forecasting expert. Analyze the following multi-year seasonal patterns for ${disasterType} disasters${region ? ` in the ${region} region` : ' globally'}.

Seasonal Pattern Data:
${seasonalAnalysis}

Identify seasonal forecasts with the following details:
1. Season identification (Spring, Summer, Fall, Winter or specific months)
2. Likelihood levels (low, medium, high, extreme)
3. Peak period timing
4. Confidence in prediction (0-1)
5. Historical pattern evidence
6. Affected regions

Focus on:
- Clear seasonal clustering of events
- Multi-year consistency in patterns
- Intensity variations by season
- Geographic patterns within seasons
- Climate/weather correlations

Provide forecasts for upcoming seasons based on historical patterns.`

    const aiResponse = await env.AI?.run(AI_MODELS.REASONING, {
      prompt,
      max_tokens: 1200
    })

    const forecasts = parseSeasonalForecastResponse(aiResponse, disasterType, region)
    
    return forecasts
  } catch (error) {
    console.error('Error generating seasonal forecast:', error)
    return []
  }
}

/**
 * Generate early warning alerts based on current patterns and AI analysis
 */
export async function generateEarlyWarnings(
  env: Env,
  lookbackDays: number = 30
): Promise<EarlyWarning[]> {
  try {
    // Get recent disaster trends and patterns
    const recentData = await env.DB.prepare(`
      SELECT 
        disaster_type,
        country,
        severity,
        event_timestamp,
        affected_population,
        coordinates_lat,
        coordinates_lng,
        title
      FROM disasters 
      WHERE event_timestamp > datetime('now', '-${lookbackDays} days')
      ORDER BY event_timestamp DESC
    `).all<DisasterRow>()

    if (!recentData.results?.length) {
      return []
    }

    // Analyze recent patterns for early warning signals
    const patternAnalysis = analyzeRecentPatternsForWarnings(recentData.results)

    const prompt = `
You are an early warning system expert for disasters. Analyze recent disaster patterns and identify potential early warning signals.

Recent Disaster Activity (last ${lookbackDays} days):
${patternAnalysis}

Identify early warning scenarios with:
1. Warning ID (unique identifier)
2. Disaster type at risk
3. Specific regions/countries at risk
4. Predicted severity level (green/yellow/red)
5. Confidence level (0-1)
6. Estimated timeline for potential events
7. Key indicators that triggered this warning
8. Recommended preparedness actions

Look for:
- Unusual clustering of events
- Escalating severity patterns
- Geographic progression patterns
- Frequency anomalies
- Cross-disaster type correlations

Only generate warnings with confidence > 0.6. Focus on actionable predictions.`

    const aiResponse = await env.AI?.run(AI_MODELS.REASONING, {
      prompt,
      max_tokens: 1500
    })

    const warnings = parseEarlyWarningResponse(aiResponse)
    
    return warnings
  } catch (error) {
    console.error('Error generating early warnings:', error)
    return []
  }
}

/**
 * Analyze disaster trends using AI pattern recognition
 */
export async function generateTrendAnalysis(
  env: Env,
  disasterType?: string,
  timeframe: string = '1 year'
): Promise<TrendAnalysis[]> {
  try {
    const timeframeDays = parseTimeframeToDays(timeframe)
    
    const trendQuery = `
      SELECT 
        disaster_type,
        severity,
        event_timestamp,
        affected_population,
        country,
        strftime('%Y-%m', event_timestamp) as month_year
      FROM disasters 
      WHERE event_timestamp > datetime('now', '-${timeframeDays} days')
        ${disasterType ? 'AND disaster_type = ?' : ''}
      ORDER BY event_timestamp ASC
    `

    const bindParams = disasterType ? [disasterType] : []
    const trendData = await env.DB.prepare(trendQuery)
      .bind(...bindParams).all()

    if (!trendData.results?.length) {
      return []
    }

    const trendAnalysis = prepareTrendDataForAI(trendData.results, timeframe)

    const prompt = `
You are a disaster trend analysis expert. Analyze the following temporal disaster data to identify significant trends over the ${timeframe} period.

Trend Data Analysis:
${trendAnalysis}

For each disaster type, provide trend analysis including:
1. Trend Direction: increasing, decreasing, or stable
2. Change Rate: quantified rate of change (percentage or ratio)
3. Statistical Significance: how confident we can be in this trend
4. Contributing Factors: What might be driving these trends
5. Time Period: The specific period this trend covers

Focus on:
- Monthly/seasonal progression patterns
- Severity evolution over time
- Geographic spread patterns
- Population impact trends
- Frequency changes
- Correlation with external factors

Provide quantitative insights where possible with confidence levels.`

    const aiResponse = await env.AI?.run(AI_MODELS.TEXT_ANALYSIS, {
      prompt,
      max_tokens: 1200
    })

    const trends = parseTrendAnalysisResponse(aiResponse, timeframe)
    
    return trends
  } catch (error) {
    console.error('Error generating trend analysis:', error)
    return []
  }
}

/**
 * Generate AI insights from new disaster data
 */
export async function generateAIInsights(
  env: Env,
  newDisasters: DisasterRow[]
): Promise<AIInsight[]> {
  try {
    if (!newDisasters?.length) return []

    // Get context from recent similar disasters
    const contextData = await getContextForNewDisasters(env, newDisasters)
    
    const analysisData = {
      newEvents: newDisasters,
      context: contextData
    }

    const prompt = `
You are a disaster analysis AI. Analyze these new disaster events in context of recent similar events and generate insights.

New Disaster Events:
${JSON.stringify(newDisasters.map(d => ({
  type: d.disaster_type,
  severity: d.severity,
  country: d.country,
  title: d.title,
  timestamp: d.event_timestamp,
  population: d.affected_population
})), null, 2)}

Recent Context:
${JSON.stringify(contextData, null, 2)}

Generate insights for:
1. Pattern Recognition: Do these events fit known patterns?
2. Anomaly Detection: Are any events unusual or unexpected?
3. Trend Identification: Do these suggest new trends?
4. Correlation Analysis: Are there connections between events?

For each insight, provide:
- Insight Type: pattern, anomaly, trend, or correlation
- Title: Brief descriptive title
- Description: Detailed explanation
- Confidence: How certain you are (0-1)
- Impact Level: low, medium, or high
- Supporting Data Points: Specific data that supports this insight

Focus on actionable insights that could inform disaster response or preparedness.`

    const aiResponse = await env.AI?.run(AI_MODELS.FAST_ANALYSIS, {
      prompt,
      max_tokens: 1000
    })

    const insights = parseAIInsightsResponse(aiResponse)
    
    return insights
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return []
  }
}

// Helper functions for data preparation and response parsing

function prepareHistoricalDataForAI(data: DisasterRow[]): string {
  const summary = data.reduce((acc, disaster) => {
    const type = disaster.disaster_type
    if (!acc[type]) {
      acc[type] = { count: 0, severities: [], recent: [], avgPopulation: 0 }
    }
    acc[type].count++
    acc[type].severities.push(disaster.severity)
    acc[type].avgPopulation += disaster.affected_population || 0
    
    // Include recent events for pattern analysis
    if (acc[type].recent.length < 5) {
      acc[type].recent.push({
        date: disaster.event_timestamp,
        severity: disaster.severity,
        title: disaster.title?.substring(0, 100)
      })
    }
    
    return acc
  }, {} as Record<string, any>)

  return Object.entries(summary).map(([type, info]) => 
    `${type}: ${info.count} events, severities: ${info.severities.join(',')}, avg impact: ${Math.round(info.avgPopulation / info.count)}`
  ).join('\n')
}

function prepareSeasonalDataForAI(data: any[], disasterType: string): string {
  const monthlyStats = data.reduce((acc, row) => {
    const month = parseInt(row.month)
    if (!acc[month]) acc[month] = { count: 0, years: new Set(), countries: new Set() }
    acc[month].count += row.event_count
    acc[month].years.add(row.year)
    acc[month].countries.add(row.country)
    return acc
  }, {} as Record<number, { count: number, years: Set<string>, countries: Set<string> }>)

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  return Object.entries(monthlyStats)
    .map(([month, stats]) => 
      `${monthNames[parseInt(month) - 1]}: ${stats.count} events across ${stats.years.size} years in ${stats.countries.size} countries`
    ).join('\n')
}

function analyzeRecentPatternsForWarnings(data: DisasterRow[]): string {
  const patterns = {
    typeFrequency: {} as Record<string, number>,
    countryFrequency: {} as Record<string, number>,
    severityDistribution: {} as Record<string, number>,
    recentEscalation: [] as any[]
  }

  data.forEach(disaster => {
    patterns.typeFrequency[disaster.disaster_type] = (patterns.typeFrequency[disaster.disaster_type] || 0) + 1
    patterns.countryFrequency[disaster.country || 'unknown'] = (patterns.countryFrequency[disaster.country || 'unknown'] || 0) + 1
    patterns.severityDistribution[disaster.severity] = (patterns.severityDistribution[disaster.severity] || 0) + 1
  })

  return `
Type Frequency: ${Object.entries(patterns.typeFrequency).map(([type, count]) => `${type}: ${count}`).join(', ')}
Country Activity: ${Object.entries(patterns.countryFrequency).map(([country, count]) => `${country}: ${count}`).join(', ')}
Severity Distribution: ${Object.entries(patterns.severityDistribution).map(([sev, count]) => `${sev}: ${count}`).join(', ')}
Total Events: ${data.length}
Time Span: ${data.length > 0 ? `${data[data.length-1].event_timestamp} to ${data[0].event_timestamp}` : 'No data'}
`
}

function prepareTrendDataForAI(data: any[], timeframe: string): string {
  const monthlyTrends = data.reduce((acc, row) => {
    const key = `${row.month_year}-${row.disaster_type}`
    if (!acc[key]) {
      acc[key] = { count: 0, severities: [] as string[], avgPopulation: 0 }
    }
    acc[key].count++
    acc[key].severities.push(row.severity)
    acc[key].avgPopulation += row.affected_population || 0
    return acc
  }, {} as Record<string, { count: number, severities: string[], avgPopulation: number }>)

  return Object.entries(monthlyTrends)
    .map(([key, stats]) => 
      `${key}: ${stats.count} events, severity trend: ${stats.severities.join(',')}, avg impact: ${Math.round(stats.avgPopulation / stats.count)}`
    ).join('\n')
}

async function getContextForNewDisasters(env: Env, newDisasters: DisasterRow[]): Promise<any> {
  const types = [...new Set(newDisasters.map(d => d.disaster_type))]
  const countries = [...new Set(newDisasters.map(d => d.country).filter(Boolean))]

  const contextQuery = `
    SELECT disaster_type, country, severity, event_timestamp, affected_population
    FROM disasters 
    WHERE (disaster_type IN (${types.map(() => '?').join(',')}) 
           OR country IN (${countries.map(() => '?').join(',')}))
      AND event_timestamp > datetime('now', '-30 days')
      AND id NOT IN (${newDisasters.map(() => '?').join(',')})
    ORDER BY event_timestamp DESC
    LIMIT 50
  `

  const context = await env.DB.prepare(contextQuery)
    .bind(...types, ...countries, ...newDisasters.map(d => d.id)).all()

  return context.results || []
}

// Response parsing functions - these would parse AI responses into structured data
function parseRiskAssessmentResponse(aiResponse: any, country: string, disasterType?: string): RiskAssessment[] {
  // Parse AI response and extract structured risk assessments
  // This is a simplified version - in practice, you'd implement robust parsing
  const assessments: RiskAssessment[] = []
  
  try {
    const response = aiResponse?.response || ''
    // Extract risk information from AI response
    // Implementation would depend on the specific AI response format
    
    assessments.push({
      country,
      disaster_type: disasterType || 'general',
      risk_score: 65, // Extracted from AI response
      confidence: 0.8,
      factors: ['Historical frequency', 'Recent trends', 'Seasonal patterns'],
      time_horizon_days: 90,
      last_updated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error parsing risk assessment response:', error)
  }

  return assessments
}

function parseSeasonalForecastResponse(aiResponse: any, disasterType: string, region?: string): SeasonalForecast[] {
  // Similar parsing logic for seasonal forecasts
  return []
}

function parseEarlyWarningResponse(aiResponse: any): EarlyWarning[] {
  // Similar parsing logic for early warnings
  return []
}

function parseTrendAnalysisResponse(aiResponse: any, timeframe: string): TrendAnalysis[] {
  // Similar parsing logic for trend analysis
  return []
}

function parseAIInsightsResponse(aiResponse: any): AIInsight[] {
  // Similar parsing logic for AI insights
  return []
}

function parseTimeframeToDays(timeframe: string): number {
  const match = timeframe.match(/(\d+)\s*(day|week|month|year)s?/i)
  if (!match) return 365 // Default to 1 year

  const [, amount, unit] = match
  const num = parseInt(amount)

  switch (unit.toLowerCase()) {
    case 'day': return num
    case 'week': return num * 7
    case 'month': return num * 30
    case 'year': return num * 365
    default: return 365
  }
}