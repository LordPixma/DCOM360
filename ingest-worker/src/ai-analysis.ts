// Real-time AI analysis for new disaster data in the ingestion pipeline

type Env = {
  DB: D1Database
  CACHE: KVNamespace
  AI?: Ai
  [key: string]: any
}

type DisasterData = {
  external_id: string
  disaster_type: string
  severity: string
  title: string
  country?: string | null
  coordinates_lat?: number | null
  coordinates_lng?: number | null
  event_timestamp: string
  description?: string | null
  affected_population?: number | null
}

/**
 * Generate real-time AI insights for newly ingested disasters
 */
export async function analyzeNewDisaster(env: Env, disaster: DisasterData): Promise<void> {
  if (!env.AI) {
    console.log('AI not available for real-time analysis')
    return
  }

  try {
    // Get recent context data to compare with the new disaster
    const contextDisasters = await getRecentDisastersForContext(env, disaster)
    
    // Generate AI analysis for the new disaster
    const analysis = await generateDisasterAnalysis(env, disaster, contextDisasters)
    
    if (analysis) {
      // Store the analysis insights
      await storeAIAnalysis(env, disaster.external_id, analysis)
      
      // Check for any early warning conditions
      await checkEarlyWarningConditions(env, disaster, analysis)
    }
  } catch (error) {
    console.error('Error in real-time AI analysis:', error)
    // Don't throw - we don't want AI analysis failures to block disaster ingestion
  }
}

/**
 * Get recent disasters for context analysis
 */
async function getRecentDisastersForContext(env: Env, newDisaster: DisasterData): Promise<DisasterData[]> {
  try {
    // Get disasters from the same region and type from the last 30 days
    const contextQuery = `
      SELECT external_id, disaster_type, severity, title, country, 
             coordinates_lat, coordinates_lng, event_timestamp, 
             description, affected_population
      FROM disasters 
      WHERE (disaster_type = ? OR country = ?)
        AND event_timestamp > datetime('now', '-30 days')
        AND external_id != ?
      ORDER BY event_timestamp DESC
      LIMIT 20
    `
    
    const result = await env.DB.prepare(contextQuery)
      .bind(newDisaster.disaster_type, newDisaster.country || '', newDisaster.external_id)
      .all<DisasterData>()
    
    return result.results || []
  } catch (error) {
    console.error('Error fetching context disasters:', error)
    return []
  }
}

/**
 * Generate AI analysis for the new disaster
 */
async function generateDisasterAnalysis(
  env: Env, 
  disaster: DisasterData, 
  context: DisasterData[]
): Promise<any> {
  try {
    const prompt = `
You are a disaster analysis AI. Analyze this new disaster event in the context of recent similar events.

NEW DISASTER:
Type: ${disaster.disaster_type}
Severity: ${disaster.severity}
Location: ${disaster.country || 'Unknown'}
Title: ${disaster.title}
Description: ${disaster.description || 'N/A'}
Timestamp: ${disaster.event_timestamp}
Affected Population: ${disaster.affected_population || 'Unknown'}

RECENT CONTEXT (last 30 days):
${context.map(d => `- ${d.disaster_type} (${d.severity}) in ${d.country}: ${d.title.substring(0, 100)}`).join('\n')}

ANALYSIS TASKS:
1. Pattern Recognition: Does this event fit expected patterns?
2. Anomaly Detection: Is this event unusual compared to recent activity?
3. Escalation Assessment: Could this indicate escalating conditions?
4. Geographic Correlation: Are there related events in nearby areas?
5. Temporal Pattern: Is this part of a concerning trend?

Provide analysis in JSON format:
{
  "is_anomaly": boolean,
  "anomaly_reason": "string or null",
  "pattern_match": "expected|unusual|concerning",
  "escalation_risk": "low|medium|high",
  "related_events": number,
  "geographic_cluster": boolean,
  "temporal_significance": "isolated|part_of_trend|escalating",
  "key_insights": ["insight1", "insight2", ...],
  "recommended_actions": ["action1", "action2", ...],
  "confidence": number between 0 and 1
}

Focus on actionable insights that could inform disaster response.`

    const aiResponse = await env.AI?.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 800
    })

    if (aiResponse?.response) {
      try {
        // Try to parse JSON from the response
        const jsonMatch = aiResponse.response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError)
      }
    }

    return null
  } catch (error) {
    console.error('Error generating AI analysis:', error)
    return null
  }
}

/**
 * Store AI analysis insights in the database
 */
async function storeAIAnalysis(env: Env, disasterId: string, analysis: any): Promise<void> {
  try {
    // Create a simple analysis log table if it doesn't exist
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS ai_analysis_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        disaster_external_id TEXT NOT NULL,
        analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_anomaly BOOLEAN,
        pattern_match TEXT,
        escalation_risk TEXT,
        confidence REAL,
        insights TEXT,
        recommended_actions TEXT
      )
    `).run()

    // Insert the analysis
    await env.DB.prepare(`
      INSERT INTO ai_analysis_log 
      (disaster_external_id, is_anomaly, pattern_match, escalation_risk, confidence, insights, recommended_actions)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      disasterId,
      analysis.is_anomaly || false,
      analysis.pattern_match || 'unknown',
      analysis.escalation_risk || 'low',
      analysis.confidence || 0,
      JSON.stringify(analysis.key_insights || []),
      JSON.stringify(analysis.recommended_actions || [])
    ).run()

  } catch (error) {
    console.error('Error storing AI analysis:', error)
  }
}

/**
 * Check for early warning conditions based on AI analysis
 */
async function checkEarlyWarningConditions(env: Env, disaster: DisasterData, analysis: any): Promise<void> {
  try {
    // Check if this disaster triggers any early warning conditions
    const shouldTriggerWarning = (
      analysis.is_anomaly ||
      analysis.escalation_risk === 'high' ||
      analysis.pattern_match === 'concerning' ||
      (analysis.confidence > 0.7 && analysis.temporal_significance === 'escalating')
    )

    if (shouldTriggerWarning) {
      // Create or update early warning in database
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS ai_early_warnings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          disaster_type TEXT NOT NULL,
          country TEXT,
          severity_prediction TEXT,
          confidence REAL,
          warning_issued DATETIME DEFAULT CURRENT_TIMESTAMP,
          trigger_disaster_id TEXT,
          key_indicators TEXT,
          recommended_actions TEXT,
          is_active BOOLEAN DEFAULT 1
        )
      `).run()

      const keyIndicators = [
        ...(analysis.is_anomaly ? ['Anomalous event detected'] : []),
        ...(analysis.escalation_risk === 'high' ? ['High escalation risk'] : []),
        ...(analysis.geographic_cluster ? ['Geographic clustering observed'] : []),
        ...(analysis.key_insights || [])
      ]

      await env.DB.prepare(`
        INSERT INTO ai_early_warnings 
        (disaster_type, country, severity_prediction, confidence, trigger_disaster_id, key_indicators, recommended_actions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        disaster.disaster_type,
        disaster.country || null,
        predictSeverityEscalation(disaster.severity, analysis),
        analysis.confidence || 0,
        disaster.external_id,
        JSON.stringify(keyIndicators),
        JSON.stringify(analysis.recommended_actions || [])
      ).run()

      console.log(`Early warning triggered for ${disaster.disaster_type} in ${disaster.country}`)
    }

  } catch (error) {
    console.error('Error checking early warning conditions:', error)
  }
}

/**
 * Predict potential severity escalation
 */
function predictSeverityEscalation(currentSeverity: string, analysis: any): string {
  if (analysis.escalation_risk === 'high') {
    switch (currentSeverity.toUpperCase()) {
      case 'GREEN': return 'yellow'
      case 'ORANGE': return 'red'
      case 'YELLOW': return 'red'
      default: return 'red'
    }
  }
  
  if (analysis.escalation_risk === 'medium') {
    switch (currentSeverity.toUpperCase()) {
      case 'GREEN': return 'yellow'
      default: return currentSeverity.toLowerCase()
    }
  }
  
  return currentSeverity.toLowerCase()
}

/**
 * Generate AI insights for batch of disasters (for RSS feeds)
 */
export async function analyzeBatchDisasters(env: Env, disasters: DisasterData[]): Promise<void> {
  if (!env.AI || disasters.length === 0) {
    return
  }

  try {
    // Analyze up to 5 disasters at once to avoid overwhelming the AI
    const batch = disasters.slice(0, 5)
    
    const prompt = `
You are a disaster pattern analyst. Analyze this batch of new disaster events for patterns and correlations.

NEW DISASTERS:
${batch.map((d, i) => `${i+1}. ${d.disaster_type} (${d.severity}) in ${d.country}: ${d.title.substring(0, 80)}`).join('\n')}

ANALYSIS TASKS:
1. Cross-Event Patterns: Are these events related or independent?
2. Geographic Patterns: Is there geographic clustering?
3. Temporal Patterns: Is this normal activity or unusual?
4. Escalation Indicators: Do these suggest escalating conditions?

Provide brief analysis focusing on:
- Overall pattern assessment
- Any concerning correlations
- Recommended monitoring priorities

Keep response under 500 characters.`

    const aiResponse = await env.AI?.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 300
    })

    if (aiResponse?.response) {
      // Log the batch analysis
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS ai_batch_analysis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          analysis_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          disaster_count INTEGER,
          analysis_summary TEXT,
          disaster_ids TEXT
        )
      `).run()

      await env.DB.prepare(`
        INSERT INTO ai_batch_analysis (disaster_count, analysis_summary, disaster_ids)
        VALUES (?, ?, ?)
      `).bind(
        batch.length,
        aiResponse.response.substring(0, 500),
        JSON.stringify(batch.map(d => d.external_id))
      ).run()
    }

  } catch (error) {
    console.error('Error in batch disaster analysis:', error)
  }
}