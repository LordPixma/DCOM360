export type ParsedEmail = {
  external_id: string
  disaster_type: string
  severity: 'RED' | 'ORANGE' | 'GREEN'
  title: string
  country?: string
  coordinates_lat?: number
  coordinates_lng?: number
  event_timestamp: string
  description?: string
  metadata?: Record<string, unknown>
}

// Very lightweight parser that expects simple GDACS-like lines.
// This can be expanded to robust MIME parsing or HTML when needed.
function normalizeTypeRaw(type: string | undefined, title?: string): string {
  const v = (type || '').toLowerCase().trim()
  const t = (title || '').toLowerCase()
  if (/earth\s*quake|\bquake\b|m\s*\d+(?:\.\d+)?\s*earth/.test(v + ' ' + t)) return 'earthquake'
  if (/tropical[_\s-]*cyclone|\bcyclone\b|\btyphoon\b|\bhurricane\b|\btc[-_\s]?\d*/.test(v + ' ' + t)) return 'cyclone'
  if (/\bflood|flooding/.test(v + ' ' + t)) return 'flood'
  if (/wild\s*fire|forest\s*fire|\bwildfire\b|fire alert/.test(v + ' ' + t)) return 'wildfire'
  return 'other'
}

export function parseEmail(subject: string, body: string): ParsedEmail {
  const text = `${subject}\n${body}`
  const get = (re: RegExp) => text.match(re)?.[1]?.trim()

  const id = get(/ID:\s*(.+)/i) || (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const type = normalizeTypeRaw((get(/Type:\s*(.+)/i) || 'unknown').toLowerCase(), subject)
  const sevText = (get(/Severity:\s*(.+)/i) || 'GREEN').toUpperCase()
  const severity = (sevText.includes('RED') ? 'RED' : sevText.includes('ORANGE') || sevText.includes('YELLOW') ? 'ORANGE' : 'GREEN') as ParsedEmail['severity']
  const title = get(/Title:\s*(.+)/i) || subject || `${type} event`
  const country = get(/Country:\s*([A-Z]{2})/i)
  const lat = parseFloat(get(/Lat:\s*([-+]?\d+\.\d+)/i) || '')
  const lng = parseFloat(get(/Lng:\s*([-+]?\d+\.\d+)/i) || '')
  const ts = get(/Date:\s*([^\n]+)/i) || new Date().toISOString()
  const description = get(/Description:\s*([\s\S]+)/i)

  return {
    external_id: id,
    disaster_type: type,
    severity,
    title,
    country: country?.toUpperCase(),
    coordinates_lat: isFinite(lat) ? lat : undefined,
    coordinates_lng: isFinite(lng) ? lng : undefined,
    event_timestamp: new Date(ts).toISOString(),
    description: description?.slice(0, 2000),
  }
}

// Parse GDACS daily newsletter that lists multiple events (earthquakes, tropical cyclones) in sections by severity.
export function parseEmailMulti(subject: string, body: string): ParsedEmail[] {
  const text = `${subject}\n${body}`
  const results: ParsedEmail[] = []

  // Quick heuristic to detect newsletter
  const isNewsletter = /Global Disaster Alert and Coordination System/i.test(text) && /Disaster events in the last 24 hours/i.test(text)
  if (!isNewsletter) {
    return [parseEmail(subject, body)]
  }

  const norm = body.replace(/\r\n/g, '\n')
  const sevMap = (s: string): ParsedEmail['severity'] => (s.toUpperCase().startsWith('RED') ? 'RED' : s.toUpperCase().startsWith('ORANGE') ? 'ORANGE' : 'GREEN')

  // Earthquakes pattern example:
  // "Green earthquake alert (Magnitude 4.5M, Depth:59.47km) in Russian Federation 04/09/2025 06:34 UTC, Few people affected in 100km."
  const eqRe = /\b(Green|Orange|Red)\s+earthquake\s+alert\s*\(Magnitude\s*([\d.]+)M,\s*Depth:([\d.]+)km\)\s+in\s+([^\n]+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*UTC/gi
  let m: RegExpExecArray | null
  while ((m = eqRe.exec(norm))) {
    const sev = sevMap(m[1])
    const mag = m[2]
    const depthKm = m[3]
    const countryRaw = m[4].trim().replace(/[.,]$/, '')
    const dateStr = m[5]
    const timeStr = m[6]
    const iso = toIsoFromEuropean(dateStr, timeStr)
    const countryName = sanitizeCountry(countryRaw)
    const countryIso = countryName ? resolveCountryIso2(countryName) : null

    const title = `${capitalize(sev.toLowerCase())} earthquake M${mag} ${countryName ? 'in ' + countryName : ''}`.trim()
    const external_id = `gdacs:earthquake:${countryIso || countryName || 'unknown'}:${iso}:${mag}:${depthKm}`

    results.push({
      external_id,
      disaster_type: 'earthquake',
      severity: sev,
      title,
      country: countryIso || undefined,
      event_timestamp: iso,
      description: `Magnitude ${mag} at depth ${depthKm}km`,
      metadata: { magnitude: parseFloat(mag), depth_km: parseFloat(depthKm), original_country_name: countryName || undefined }
    })
  }

  // Tropical cyclone pattern header line:
  // "Green alert for tropical cyclone PEIPAH-25. Population affected by Category 1 ..."
  const tcRe = /\b(Green|Orange|Red)\s+alert\s+for\s+tropical\s+cyclone\s+([A-Z0-9\-\.]+)\./gi
  while ((m = tcRe.exec(norm))) {
    const sev = sevMap(m[1])
    const name = m[2]
    // Look ahead within next few lines for date range and countries line
    const tail = norm.slice(tcRe.lastIndex, tcRe.lastIndex + 800)
    const range = /From\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(tail)
    const endIso = range ? toIsoFromEuropean(range[2], '00:00') : new Date().toISOString()
    const countriesMatch = /The cyclone affects these countries:\s*([^\.\n]+)/i.exec(tail)
    const firstCountry = countriesMatch ? countriesMatch[1].split(',')[0].trim() : undefined
    const countryName = firstCountry ? sanitizeCountry(firstCountry.replace(/\(.*?\)/, '').trim()) : undefined
    const countryIso = countryName ? resolveCountryIso2(countryName) : undefined

    // Try to extract category and max wind speed (km/h)
    const catMatch = /Category\s*([1-5])/i.exec(tail)
    const windMatches = Array.from(tail.matchAll(/(\d{2,3})\s*(?:km\/?h|kph)/gi))
    const maxWind = windMatches.length ? Math.max(...windMatches.map((w) => parseInt(w[1], 10))) : undefined

    const title = `${capitalize(sev.toLowerCase())} tropical cyclone ${name}`
    const external_id = `gdacs:cyclone:${name}:${endIso}`
    results.push({
      external_id,
      disaster_type: 'cyclone',
      severity: sev,
      title,
      country: countryIso || undefined,
      event_timestamp: endIso,
      description: `GDACS tropical cyclone ${name}`,
      metadata: { name, category: catMatch ? parseInt(catMatch[1], 10) : undefined, max_wind_kmh: maxWind, original_country_name: countryName }
    })
  }

  // If nothing matched, fall back to single-event parsing
  return results.length ? results : [parseEmail(subject, body)]
}

function toIsoFromEuropean(dateDDMMYYYY: string, timeHHMM: string): string {
  // Accepts dd/mm/yyyy or d/m/yyyy
  const [d, m, y] = dateDDMMYYYY.split('/').map((s) => parseInt(s, 10))
  const [hh, mm] = timeHHMM.split(':').map((s) => parseInt(s, 10))
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00.000Z`
}

function sanitizeCountry(raw: string): string | null {
  const c = raw.replace(/\[unknown\]/i, '').replace(/\s{2,}/g, ' ').trim()
  if (!c || /unknown/i.test(raw)) return null
  return c
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Basic country name to ISO2 normalization. Fallback returns undefined.
function resolveCountryIso2(name: string): string | undefined {
  const n = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const map: Record<string, string> = {
    'russian federation': 'RU',
    russia: 'RU',
    'united states': 'US',
    'united states of america': 'US',
    usa: 'US',
    america: 'US',
    canada: 'CA',
    mexico: 'MX',
    brazil: 'BR',
    chile: 'CL',
    peru: 'PE',
    argentina: 'AR',
    colombia: 'CO',
    ecuador: 'EC',
    bolivia: 'BO',
    'dominican republic': 'DO',
    haiti: 'HT',
    jamaica: 'JM',
    cuba: 'CU',
    'puerto rico': 'PR',
    iceland: 'IS',
    greenland: 'GL',
    ireland: 'IE',
    'united kingdom': 'GB',
    uk: 'GB',
    england: 'GB',
    scotland: 'GB',
    wales: 'GB',
    france: 'FR',
    spain: 'ES',
    portugal: 'PT',
    germany: 'DE',
    italy: 'IT',
    switzerland: 'CH',
    austria: 'AT',
    netherlands: 'NL',
    belgium: 'BE',
    luxembourg: 'LU',
    norway: 'NO',
    sweden: 'SE',
    finland: 'FI',
    denmark: 'DK',
    estonia: 'EE',
    latvia: 'LV',
    lithuania: 'LT',
    poland: 'PL',
    czechia: 'CZ',
    'czech republic': 'CZ',
    slovakia: 'SK',
    hungary: 'HU',
    greece: 'GR',
    turkey: 'TR',
    cyprus: 'CY',
    romania: 'RO',
    bulgaria: 'BG',
    serbia: 'RS',
    croatia: 'HR',
    slovenia: 'SI',
    albania: 'AL',
    macedonia: 'MK',
    kosovo: 'XK',
    montenegro: 'ME',
    bosnia: 'BA',
    'bosnia and herzegovina': 'BA',
    ukraine: 'UA',
    belarus: 'BY',
    moldova: 'MD',
    rwanda: 'RW',
    uganda: 'UG',
    kenya: 'KE',
    tanzania: 'TZ',
    somalia: 'SO',
    ethiopia: 'ET',
    sudan: 'SD',
    'south sudan': 'SS',
    egypt: 'EG',
    libya: 'LY',
    tunisia: 'TN',
    algeria: 'DZ',
    morocco: 'MA',
    'western sahara': 'EH',
    nigeria: 'NG',
    niger: 'NE',
    ghana: 'GH',
    benin: 'BJ',
    togo: 'TG',
    'cote d ivoire': 'CI',
    'cote divoire': 'CI',
    "cote d'ivoire": 'CI',
    'ivory coast': 'CI',
    senegal: 'SN',
    mali: 'ML',
    'burkina faso': 'BF',
    guinea: 'GN',
    liberia: 'LR',
    sierra: 'SL',
    'sierra leone': 'SL',
    cameroon: 'CM',
    gabon: 'GA',
    congo: 'CG',
    'republic of the congo': 'CG',
    'democratic republic of the congo': 'CD',
    drc: 'CD',
    angola: 'AO',
    zambia: 'ZM',
    zimbabwe: 'ZW',
    botswana: 'BW',
    namibia: 'NA',
    mozambique: 'MZ',
    madagascar: 'MG',
    'south africa': 'ZA',
    lesotho: 'LS',
    swaziland: 'SZ',
    eswatini: 'SZ',
    china: 'CN',
    mongolia: 'MN',
    japan: 'JP',
    korea: 'KR',
    'south korea': 'KR',
    'north korea': 'KP',
    taiwan: 'TW',
    india: 'IN',
    pakistan: 'PK',
    bangladesh: 'BD',
    nepal: 'NP',
    bhutan: 'BT',
    sri: 'LK',
    'sri lanka': 'LK',
    maldives: 'MV',
    myanmar: 'MM',
    'myanmar burma': 'MM',
    burma: 'MM',
    thailand: 'TH',
    laos: 'LA',
    'lao pdr': 'LA',
    cambodia: 'KH',
    vietnam: 'VN',
    'viet nam': 'VN',
    malaysia: 'MY',
    singapore: 'SG',
    philippines: 'PH',
    indonesia: 'ID',
    brunei: 'BN',
    timor: 'TL',
    'timor leste': 'TL',
    australia: 'AU',
    'papua new guinea': 'PG',
    new: 'NZ',
    'new zealand': 'NZ',
    fiji: 'FJ',
    vanuatu: 'VU',
    tonga: 'TO',
    samoa: 'WS',
    'solomon islands': 'SB',
    'marshall islands': 'MH',
    kiribati: 'KI',
    micronesia: 'FM',
    palau: 'PW',
    philippinessea: 'PH',
    iran: 'IR',
    iraq: 'IQ',
    syria: 'SY',
    lebanon: 'LB',
    jordan: 'JO',
    israel: 'IL',
    palestine: 'PS',
    'saudi arabia': 'SA',
    yemen: 'YE',
    oman: 'OM',
    uae: 'AE',
    'united arab emirates': 'AE',
    qatar: 'QA',
    bahrain: 'BH',
    kuwait: 'KW'
  }
  return map[n]
}
