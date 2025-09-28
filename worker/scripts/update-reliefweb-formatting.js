/**
 * Script to update existing ReliefWeb reports with new visual formatting
 * This applies emoji prefixes to titles to match the new parser enhancements
 */

// Beautify title function (extracted from reliefweb.ts)
function beautifyTitle(title) {
  if (!title) return title

  // Clean HTML from title
  let cleaned = title.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, '')
  
  // Handle "World Earthquake Report" specially
  if (cleaned.toLowerCase().includes('world earthquake report')) {
    return `🌍📊 ${cleaned}`
  }
  
  // Add emoji prefixes based on content
  const lowerTitle = cleaned.toLowerCase()
  
  if (lowerTitle.includes('earthquake')) {
    return `🌍 ${cleaned}`
  } else if (lowerTitle.includes('volcanic') || lowerTitle.includes('volcano')) {
    return `🌋 ${cleaned}`
  } else if (lowerTitle.includes('flood') || lowerTitle.includes('flooding')) {
    return `🌊 ${cleaned}`
  } else if (lowerTitle.includes('cyclone') || lowerTitle.includes('hurricane') || lowerTitle.includes('typhoon') || lowerTitle.includes('storm')) {
    return `🌀 ${cleaned}`
  } else if (lowerTitle.includes('wildfire') || lowerTitle.includes('wild fire') || lowerTitle.includes('fire')) {
    return `🔥 ${cleaned}`
  } else if (lowerTitle.includes('drought') || lowerTitle.includes('heat wave') || lowerTitle.includes('heatwave')) {
    return `🌡️ ${cleaned}`
  } else if (lowerTitle.includes('landslide') || lowerTitle.includes('avalanche')) {
    return `🏔️ ${cleaned}`
  } else if (lowerTitle.includes('severe weather') || lowerTitle.includes('thunderstorm')) {
    return `⛈️ ${cleaned}`
  } else if (lowerTitle.includes('tornado') || lowerTitle.includes('strong wind')) {
    return `💨 ${cleaned}`
  } else if (lowerTitle.includes('outbreak') || lowerTitle.includes('epidemic') || lowerTitle.includes('pandemic')) {
    return `🦠 ${cleaned}`
  } else {
    // Generic disaster
    return `⚠️ ${cleaned}`
  }
}

// Disaster type to emoji mapping
const disasterTypeToEmoji = {
  'earthquake': '🌍',
  'volcanic': '🌋',
  'flood': '🌊',
  'cyclone': '🌀',
  'wildfire': '🔥',
  'drought': '🌡️',
  'landslide': '🏔️',
  'other': '⚠️'
}

// Example update queries for different disaster types
const updateQueries = [
  // Earthquakes
  `UPDATE disasters SET title = '🌍 ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'earthquake' AND title NOT LIKE '🌍%';`,
  
  // Floods
  `UPDATE disasters SET title = '🌊 ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'flood' AND title NOT LIKE '🌊%';`,
  
  // Wildfires
  `UPDATE disasters SET title = '🔥 ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'wildfire' AND title NOT LIKE '🔥%';`,
  
  // Droughts (includes heat waves)
  `UPDATE disasters SET title = '🌡️ ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'drought' AND title NOT LIKE '🌡️%';`,
  
  // Cyclones
  `UPDATE disasters SET title = '🌀 ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'cyclone' AND title NOT LIKE '🌀%';`,
  
  // Landslides
  `UPDATE disasters SET title = '🏔️ ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'landslide' AND title NOT LIKE '🏔️%';`,
  
  // Other disasters (outbreaks, etc.)
  `UPDATE disasters SET title = '🦠 ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'other' AND (title LIKE '%outbreak%' OR title LIKE '%epidemic%' OR title LIKE '%pandemic%') AND title NOT LIKE '🦠%';`,
  
  // Generic other disasters
  `UPDATE disasters SET title = '⚠️ ' || title WHERE external_id LIKE 'reliefweb:%' AND disaster_type = 'other' AND title NOT LIKE '🦠%' AND title NOT LIKE '⚠️%';`
]

console.log('ReliefWeb Formatting Update Queries:')
console.log('=====================================')
updateQueries.forEach((query, index) => {
  console.log(`Query ${index + 1}:`)
  console.log(query)
  console.log('')
})

console.log('To apply these updates, run each query using:')
console.log('npx wrangler d1 execute dcom360-db --env production --remote --command "[QUERY]"')