# GDACS Dashboard - Low Level Design Document

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Design](#database-design)
3. [API Specifications](#api-specifications)
4. [Email Processing Engine](#email-processing-engine)
5. [Frontend Components](#frontend-components)
6. [Authentication & Security](#authentication--security)
7. [Caching Strategy](#caching-strategy)
8. [Error Handling](#error-handling)
9. [Monitoring & Logging](#monitoring--logging)
10. [Deployment Pipeline](#deployment-pipeline)
11. [Performance Optimization](#performance-optimization)
12. [Testing Strategy](#testing-strategy)

## System Architecture

### Component Interaction Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GDACS Email   │───▶│  Email Webhook  │───▶│ Email Processor │
│   (Daily 9AM)   │    │   (Zapier/JS)   │    │    (Worker)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │◀───│   API Worker    │◀───│   D1 Database   │
│  (CF Pages)     │    │  (CF Worker)    │    │   (SQLite)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   KV Cache      │    │   Analytics     │    │   Backup Store  │
│  (Response)     │    │  (Monitoring)   │    │   (R2/S3)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV Store
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Headless UI
- **State Management**: React Query + Zustand
- **Maps**: Mapbox GL JS
- **Charts**: Chart.js + React Chart.js 2
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions
- **Monitoring**: Cloudflare Analytics + Sentry

## Database Design

### Schema Definition (D1 SQLite)

#### disasters Table
```sql
CREATE TABLE disasters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE, -- GDACS unique identifier
    disaster_type TEXT NOT NULL, -- 'earthquake', 'cyclone', 'flood', 'wildfire', 'volcano'
    severity TEXT NOT NULL, -- 'RED', 'ORANGE', 'GREEN'
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    country TEXT,
    region TEXT,
    coordinates_lat REAL,
    coordinates_lng REAL,
    magnitude REAL, -- for earthquakes
    wind_speed INTEGER, -- for cyclones (km/h)
    depth_km REAL, -- for earthquakes
    affected_population INTEGER DEFAULT 0,
    affected_radius_km INTEGER DEFAULT 0,
    event_timestamp DATETIME NOT NULL,
    source_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON string for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disasters_severity ON disasters(severity);
CREATE INDEX idx_disasters_type ON disasters(disaster_type);
CREATE INDEX idx_disasters_country ON disasters(country);
CREATE INDEX idx_disasters_active ON disasters(is_active);
CREATE INDEX idx_disasters_event_time ON disasters(event_timestamp);
CREATE INDEX idx_disasters_coordinates ON disasters(coordinates_lat, coordinates_lng);
```

#### processing_logs Table
```sql
CREATE TABLE processing_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_date DATE NOT NULL,
    processing_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    disasters_processed INTEGER DEFAULT 0,
    new_disasters INTEGER DEFAULT 0,
    updated_disasters INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PROCESSING', -- 'SUCCESS', 'ERROR', 'PARTIAL'
    error_details TEXT,
    processing_time_ms INTEGER,
    email_size_bytes INTEGER,
    raw_email_hash TEXT -- MD5 hash to detect duplicates
);

CREATE INDEX idx_processing_logs_date ON processing_logs(email_date);
CREATE INDEX idx_processing_logs_status ON processing_logs(status);
```

#### countries Table
```sql
CREATE TABLE countries (
    code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2
    name TEXT NOT NULL,
    region TEXT,
    subregion TEXT,
    coordinates_lat REAL,
    coordinates_lng REAL,
    population INTEGER,
    vulnerability_score REAL -- 0-1 scale
);

-- Seed data for countries
INSERT INTO countries (code, name, region, coordinates_lat, coordinates_lng) VALUES
('US', 'United States', 'Americas', 39.8283, -98.5795),
('JP', 'Japan', 'Asia', 36.2048, 138.2529),
('IN', 'India', 'Asia', 20.5937, 78.9629),
-- ... more countries
```

#### disaster_history Table (for trends)
```sql
CREATE TABLE disaster_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disaster_id INTEGER REFERENCES disasters(id),
    severity_old TEXT,
    severity_new TEXT,
    affected_population_old INTEGER,
    affected_population_new INTEGER,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT
);
```

## API Specifications

### Base Configuration
```typescript
// types/api.ts
export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    has_more?: boolean;
  };
}

export interface DisasterAPIData {
  id: number;
  external_id: string;
  disaster_type: DisasterType;
  severity: SeverityLevel;
  title: string;
  description: string;
  location: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  magnitude?: number;
  wind_speed?: number;
  depth_km?: number;
  affected_population: number;
  affected_radius_km: number;
  event_timestamp: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}
```

### API Endpoints Implementation

#### 1. GET /api/disasters/current
```typescript
// workers/api/src/handlers/disasters.ts
export async function getCurrentDisasters(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    const severity = url.searchParams.get('severity');
    const disaster_type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Check cache first
    const cacheKey = `disasters:current:${country || 'all'}:${severity || 'all'}:${disaster_type || 'all'}:${limit}:${offset}`;
    const cached = await env.CACHE.get(cacheKey);
    
    if (cached) {
      return new Response(cached, {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5 minutes
        }
      });
    }

    // Build query
    let query = `
      SELECT d.*, c.name as country_name, c.region
      FROM disasters d
      LEFT JOIN countries c ON d.country = c.code
      WHERE d.is_active = 1
    `;
    const params: any[] = [];

    if (country) {
      query += ` AND d.country = ?`;
      params.push(country);
    }

    if (severity) {
      query += ` AND d.severity = ?`;
      params.push(severity.toUpperCase());
    }

    if (disaster_type) {
      query += ` AND d.disaster_type = ?`;
      params.push(disaster_type);
    }

    query += ` ORDER BY d.event_timestamp DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute query
    const stmt = env.DB.prepare(query);
    const results = await stmt.bind(...params).all();

    // Count total for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM disasters d 
      WHERE d.is_active = 1
    `;
    const countParams: any[] = [];

    if (country) {
      countQuery += ` AND d.country = ?`;
      countParams.push(country);
    }
    if (severity) {
      countQuery += ` AND d.severity = ?`;
      countParams.push(severity.toUpperCase());
    }
    if (disaster_type) {
      countQuery += ` AND d.disaster_type = ?`;
      countParams.push(disaster_type);
    }

    const countStmt = env.DB.prepare(countQuery);
    const countResult = await countStmt.bind(...countParams).first();
    const total = countResult?.total || 0;

    const response: APIResponse<DisasterAPIData[]> = {
      success: true,
      data: results.results.map(transformDisasterRecord),
      timestamp: new Date().toISOString(),
      meta: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        has_more: offset + limit < total
      }
    };

    const responseJson = JSON.stringify(response);
    
    // Cache for 5 minutes
    await env.CACHE.put(cacheKey, responseJson, { expirationTtl: 300 });

    return new Response(responseJson, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching current disasters:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function transformDisasterRecord(record: any): DisasterAPIData {
  return {
    id: record.id,
    external_id: record.external_id,
    disaster_type: record.disaster_type,
    severity: record.severity,
    title: record.title,
    description: record.description,
    location: record.location,
    country: record.country,
    coordinates: {
      lat: record.coordinates_lat,
      lng: record.coordinates_lng
    },
    magnitude: record.magnitude,
    wind_speed: record.wind_speed,
    depth_km: record.depth_km,
    affected_population: record.affected_population,
    affected_radius_km: record.affected_radius_km,
    event_timestamp: record.event_timestamp,
    is_active: record.is_active === 1,
    metadata: record.metadata ? JSON.parse(record.metadata) : null
  };
}
```

#### 2. GET /api/disasters/summary
```typescript
// workers/api/src/handlers/summary.ts
export async function getDisasterSummary(request: Request, env: Env): Promise<Response> {
  try {
    const cacheKey = 'disasters:summary';
    const cached = await env.CACHE.get(cacheKey);
    
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get severity counts
    const severityQuery = `
      SELECT 
        severity,
        COUNT(*) as count,
        SUM(affected_population) as total_affected
      FROM disasters 
      WHERE is_active = 1 
      GROUP BY severity
    `;
    const severityResults = await env.DB.prepare(severityQuery).all();

    // Get disaster type counts
    const typeQuery = `
      SELECT 
        disaster_type,
        COUNT(*) as count,
        severity,
        SUM(affected_population) as total_affected
      FROM disasters 
      WHERE is_active = 1 
      GROUP BY disaster_type, severity
      ORDER BY count DESC
    `;
    const typeResults = await env.DB.prepare(typeQuery).all();

    // Get country counts
    const countryQuery = `
      SELECT 
        d.country,
        c.name as country_name,
        COUNT(*) as count,
        SUM(d.affected_population) as total_affected
      FROM disasters d
      LEFT JOIN countries c ON d.country = c.code
      WHERE d.is_active = 1 
      GROUP BY d.country, c.name
      ORDER BY count DESC
      LIMIT 10
    `;
    const countryResults = await env.DB.prepare(countryQuery).all();

    // Recent disasters (last 24 hours)
    const recentQuery = `
      SELECT COUNT(*) as recent_count
      FROM disasters 
      WHERE is_active = 1 
        AND event_timestamp >= datetime('now', '-1 day')
    `;
    const recentResult = await env.DB.prepare(recentQuery).first();

    const summary = {
      severity_breakdown: severityResults.results.reduce((acc: any, row: any) => {
        acc[row.severity.toLowerCase()] = {
          count: row.count,
          affected_population: row.total_affected || 0
        };
        return acc;
      }, { red: { count: 0, affected_population: 0 }, orange: { count: 0, affected_population: 0 }, green: { count: 0, affected_population: 0 } }),
      
      disaster_types: typeResults.results,
      top_affected_countries: countryResults.results,
      recent_24h: recentResult?.recent_count || 0,
      
      totals: {
        active_disasters: severityResults.results.reduce((sum: number, row: any) => sum + row.count, 0),
        total_affected_population: severityResults.results.reduce((sum: number, row: any) => sum + (row.total_affected || 0), 0)
      },
      
      last_updated: new Date().toISOString()
    };

    const response: APIResponse<typeof summary> = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    };

    const responseJson = JSON.stringify(response);
    
    // Cache for 5 minutes
    await env.CACHE.put(cacheKey, responseJson, { expirationTtl: 300 });

    return new Response(responseJson, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching summary:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }), { status: 500 });
  }
}
```

## Email Processing Engine

### GDACS Email Parser Implementation

```typescript
// workers/email-processor/src/parsers/gdacs-parser.ts
export class GDACSParser {
  private static readonly DISASTER_PATTERNS = {
    earthquake: {
      pattern: /earthquake alert.*?Magnitude\s+([\d.]+)M.*?Depth:\s*([\d.]+)km.*?in\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+UTC.*?(\d+(?:\.\d+)?\s*(?:million|thousand|hundred)?)\s+.*?in 100km/gi,
      extractData: (match: RegExpMatchArray) => ({
        disaster_type: 'earthquake' as const,
        magnitude: parseFloat(match[1]),
        depth_km: parseFloat(match[2]),
        location: match[3].trim(),
        date: match[4],
        time: match[5],
        affected_population: this.parseAffectedPopulation(match[6])
      })
    },
    
    cyclone: {
      pattern: /tropical cyclone\s+(\w+-\d+).*?Population affected.*?Category\s+(\d+).*?(\d+)\s+km\/h.*?wind speeds.*?(\d+).*?tropical storm/gi,
      extractData: (match: RegExpMatchArray) => ({
        disaster_type: 'cyclone' as const,
        cyclone_name: match[1],
        category: parseInt(match[2]),
        wind_speed: parseInt(match[3]),
        affected_population: parseInt(match[4])
      })
    },
    
    flood: {
      pattern: /flood.*?affecting\s+(.+?)(?:region|province|state|country)/gi,
      extractData: (match: RegExpMatchArray) => ({
        disaster_type: 'flood' as const,
        location: match[1].trim()
      })
    }
  };

  public static async parseEmail(emailContent: string): Promise<ParsedDisaster[]> {
    const disasters: ParsedDisaster[] = [];
    
    try {
      // Extract severity sections
      const sections = this.extractSeveritySections(emailContent);
      
      for (const [severity, content] of Object.entries(sections)) {
        // Parse earthquakes
        const earthquakes = this.parseEarthquakes(content, severity as SeverityLevel);
        disasters.push(...earthquakes);
        
        // Parse cyclones
        const cyclones = this.parseCyclones(content, severity as SeverityLevel);
        disasters.push(...cyclones);
        
        // Parse floods from daily flash section
        if (content.includes('DAILY FLASH')) {
          const floods = this.parseFlashEvents(content, 'flood');
          disasters.push(...floods);
        }
      }
      
      // Deduplicate and enrich data
      return this.processAndEnrichDisasters(disasters);
      
    } catch (error) {
      console.error('Error parsing GDACS email:', error);
      throw new Error(`Failed to parse GDACS email: ${error.message}`);
    }
  }

  private static extractSeveritySections(emailContent: string): Record<string, string> {
    const sections: Record<string, string> = {};
    
    // Find RED, ORANGE, GREEN sections
    const redMatch = emailContent.match(/RED\s+(.*?)(?=ORANGE|GREEN|DAILY FLASH|$)/s);
    const orangeMatch = emailContent.match(/ORANGE\s+(.*?)(?=GREEN|DAILY FLASH|$)/s);
    const greenMatch = emailContent.match(/GREEN\s+(.*?)(?=DAILY FLASH|$)/s);
    
    sections.RED = redMatch?.[1] || '';
    sections.ORANGE = orangeMatch?.[1] || '';
    sections.GREEN = greenMatch?.[1] || '';
    
    return sections;
  }

  private static parseEarthquakes(content: string, severity: SeverityLevel): ParsedDisaster[] {
    const disasters: ParsedDisaster[] = [];
    const pattern = /earthquake alert.*?Magnitude\s+([\d.]+)M.*?Depth:\s*([\d.]+)km.*?in\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+UTC.*?([\d.,\s]*(?:million|thousand|hundred)?\s*.*?)in 100km/gi;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      try {
        const disaster: ParsedDisaster = {
          external_id: this.generateExternalId('earthquake', match[4], match[5], match[1]),
          disaster_type: 'earthquake',
          severity,
          title: `Magnitude ${match[1]} Earthquake`,
          description: `Earthquake with magnitude ${match[1]}M at depth ${match[2]}km`,
          location: this.cleanLocation(match[3]),
          magnitude: parseFloat(match[1]),
          depth_km: parseFloat(match[2]),
          affected_population: this.parseAffectedPopulation(match[6]),
          event_timestamp: this.parseDateTime(match[4], match[5]),
          coordinates: null // Will be geocoded later
        };
        
        disasters.push(disaster);
      } catch (error) {
        console.warn('Failed to parse earthquake entry:', error);
      }
    }
    
    return disasters;
  }

  private static parseCyclones(content: string, severity: SeverityLevel): ParsedDisaster[] {
    const disasters: ParsedDisaster[] = [];
    const pattern = /tropical cyclone\s+(\w+-\d+).*?maximum wind speed of\s+(\d+)\s+km\/h.*?affects these countries:\s*([^.]+)/gi;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      try {
        const disaster: ParsedDisaster = {
          external_id: this.generateExternalId('cyclone', match[1]),
          disaster_type: 'cyclone',
          severity,
          title: `Tropical Cyclone ${match[1]}`,
          description: `Tropical cyclone with maximum wind speed of ${match[2]} km/h`,
          location: match[3].trim(),
          wind_speed: parseInt(match[2]),
          affected_population: 0, // Will be extracted from additional text
          event_timestamp: new Date().toISOString(),
          coordinates: null
        };
        
        disasters.push(disaster);
      } catch (error) {
        console.warn('Failed to parse cyclone entry:', error);
      }
    }
    
    return disasters;
  }

  private static parseFlashEvents(content: string, eventType: string): ParsedDisaster[] {
    const disasters: ParsedDisaster[] = [];
    
    // Parse flood events from DAILY FLASH section
    const floodPattern = /(\w+)\s+-\s+Floods.*?Over the past week.*?(\d+)\s+people.*?affected/gi;
    
    let match;
    while ((match = floodPattern.exec(content)) !== null) {
      const disaster: ParsedDisaster = {
        external_id: this.generateExternalId('flood', match[1], new Date().toISOString()),
        disaster_type: 'flood',
        severity: 'GREEN', // Flash events are typically green
        title: `Floods in ${match[1]}`,
        description: `Flooding affecting ${match[2]} people`,
        location: match[1],
        affected_population: parseInt(match[2]),
        event_timestamp: new Date().toISOString(),
        coordinates: null
      };
      
      disasters.push(disaster);
    }
    
    return disasters;
  }

  private static parseAffectedPopulation(text: string): number {
    if (!text) return 0;
    
    const cleanText = text.toLowerCase().replace(/[,\s]/g, '');
    
    if (cleanText.includes('million')) {
      const num = parseFloat(cleanText.replace('million', ''));
      return Math.round(num * 1000000);
    } else if (cleanText.includes('thousand')) {
      const num = parseFloat(cleanText.replace('thousand', ''));
      return Math.round(num * 1000);
    } else if (cleanText.includes('hundred')) {
      const num = parseFloat(cleanText.replace('hundred', ''));
      return Math.round(num * 100);
    }
    
    const numMatch = cleanText.match(/(\d+)/);
    return numMatch ? parseInt(numMatch[1]) : 0;
  }

  private static parseDateTime(dateStr: string, timeStr: string): string {
    try {
      // Convert from MM/DD/YYYY to YYYY-MM-DD format
      const [month, day, year] = dateStr.split('/');
      const [hours, minutes] = timeStr.split(':');
      
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours}:${minutes}:00.000Z`).toISOString();
    } catch (error) {
      console.warn('Failed to parse date/time:', dateStr, timeStr);
      return new Date().toISOString();
    }
  }

  private static cleanLocation(location: string): string {
    return location
      .replace(/\[unknown\]/gi, 'Unknown Location')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static generateExternalId(...components: string[]): string {
    return components.join('-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  }

  private static async processAndEnrichDisasters(disasters: ParsedDisaster[]): Promise<ParsedDisaster[]> {
    // Deduplicate based on external_id
    const uniqueDisasters = disasters.filter((disaster, index, self) => 
      index === self.findIndex(d => d.external_id === disaster.external_id)
    );

    // Enrich with geocoding (implement geocoding service)
    for (const disaster of uniqueDisasters) {
      if (disaster.location && disaster.location !== 'Unknown Location') {
        try {
          disaster.coordinates = await this.geocodeLocation(disaster.location);
          disaster.country = await this.getCountryFromLocation(disaster.location);
        } catch (error) {
          console.warn(`Failed to geocode location: ${disaster.location}`, error);
        }
      }
    }

    return uniqueDisasters;
  }

  private static async geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
    // Implement geocoding using a service like Mapbox or Google
    // For now, return null - implement based on your chosen service
    return null;
  }

  private static async getCountryFromLocation(location: string): Promise<string | null> {
    // Simple country extraction - enhance with proper geocoding service
    const countryMappings: Record<string, string> = {
      'Russia': 'RU',
      'Morocco': 'MA',
      'Papua New Guinea': 'PG',
      'Solomon Is.': 'SB',
      'Indonesia': 'ID',
      'Fiji': 'FJ',
      'Afghanistan': 'AF',
      'China': 'CN',
      'Philippines': 'PH',
      'Guam': 'GU',
      'Japan': 'JP'
    };
    
    for (const [country, code] of Object.entries(countryMappings)) {
      if (location.includes(country)) {
        return code;
      }
    }
    
    return null;
  }
}

// Types
interface ParsedDisaster {
  external_id: string;
  disaster_type: 'earthquake' | 'cyclone' | 'flood' | 'wildfire' | 'volcano';
  severity: 'RED' | 'ORANGE' | 'GREEN';
  title: string;
  description: string;
  location: string;
  country?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  magnitude?: number;
  wind_speed?: number;
  depth_km?: number;
  affected_population: number;
  affected_radius_km?: number;
  event_timestamp: string;
  metadata?: Record<string, any>;
}

type SeverityLevel = 'RED' | 'ORANGE' | 'GREEN';
```

## Frontend Components

### Traffic Light Status Panel
```typescript
// dashboard/src/components/dashboard/TrafficLights.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSummary } from '../../hooks/useSummary';

interface TrafficLightProps {
  severity: 'red' | 'orange' | 'green';
  count: number;
  affectedPopulation: number;
  isLoading: boolean;
}

const TrafficLight: React.FC<TrafficLightProps> = ({ severity, count, affectedPopulation, isLoading }) => {
  const colors = {
    red: { bg: 'bg-red-500', text: 'text-red-900', light: 'bg-red-100', border: 'border-red-500' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-900', light: 'bg-orange-100', border: 'border-orange-500' },
    green: { bg: 'bg-green-500', text: 'text-green-900', light: 'bg-green-100', border: 'border-green-500' }
  } as const;

  const formatPopulation = (pop: number): string => {
    if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
    if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
    return pop.toString();
  };

  return (
    <motion.div
      className={`relative p-6 rounded-lg ${colors[severity].light} border-l-4 ${colors[severity].border}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Traffic Light Circle */}
      <div className="flex items-center justify-center mb-4">
        <motion.div
          className={`w-16 h-16 rounded-full ${colors[severity].bg} flex items-center justify-center shadow-lg`}
          animate={count > 0 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="text-white text-2xl font-bold">
            {isLoading ? '...' : count}
          </span>
        </motion.div>
      </div>

      {/* Status Information */}
      <div className="text-center">
        <h3 className={`text-lg font-semibold ${colors[severity].text} uppercase`}>
          {severity} Alerts
        </h3>
        
        {!isLoading && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600">
              {count === 0 ? 'No active alerts' : `${count} active alert${count !== 1 ? 's' : ''}`}
            </p>
            
            {affectedPopulation > 0 && (
              <p className="text-xs text-gray-500">
                {formatPopulation(affectedPopulation)} people affected
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const TrafficLightsPanel: React.FC = () => {
  const { data, isLoading } = useSummary();

  const red = data?.severity_breakdown.red || { count: 0, affected_population: 0 };
  const orange = data?.severity_breakdown.orange || { count: 0, affected_population: 0 };
  const green = data?.severity_breakdown.green || { count: 0, affected_population: 0 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TrafficLight severity="red" count={red.count} affectedPopulation={red.affected_population} isLoading={isLoading} />
      <TrafficLight severity="orange" count={orange.count} affectedPopulation={orange.affected_population} isLoading={isLoading} />
      <TrafficLight severity="green" count={green.count} affectedPopulation={green.affected_population} isLoading={isLoading} />
    </div>
  );
};

export default TrafficLightsPanel;
```

### Interactive World Map
Implementation uses Mapbox GL JS with clustered markers and severity-based styling.

Key behaviors:
- Cluster by proximity; expand clusters on zoom.
- Marker color: red/orange/green by severity; icon by disaster type.
- Clicking a marker opens a details drawer; keyboard accessible.
- Syncs with filters (country, type, severity) and pagination.

Data source: `GET /api/disasters/current` with parameters; debounced to 300ms.

### Recent Disasters List & Timeline
- Virtualized list for performance (e.g., react-virtual).
- Shows title, type icon, severity chip, location, time-ago, affected population.
- Timeline groups by hour/day; supports “last 24h | 7d” toggle using `/api/disasters/history`.

### Hooks and State
- `useSummary`: fetches `/api/disasters/summary`, 5 min stale time, background refetch every 15 min.
- `useDisasters`: query key includes filters; pagination with `limit/offset`.
- Global UI state via Zustand: filters, selected disaster, map viewport.
- Error boundaries at page level with fallback UIs and retry actions.

### Accessibility & i18n
- All interactive elements are focusable; ARIA labels for markers and controls.
- Reduced motion preference respected for animations.
- Copy prepared for future i18n; date/number formatting via Intl.

## Authentication & Security

### API Security
- Public read-only endpoints: CORS restricted to dashboard origin; methods GET only.
- Admin endpoints (`POST /api/process-email`): HMAC signature and API key required.
- Rate limiting middleware at edge: 60 req/min/IP for public endpoints; stricter for admin.
- Input validation with Zod (or lightweight validators) for all query/body params.

### Webhook/Email Verification
- If using webhook: include `X-Signature` header (HMAC-SHA256 over body) with shared secret; verify in worker before processing.
- If polling mailboxes: use OAuth2 (MS Graph/Gmail); store tokens in Cloudflare Secrets, never in code.

### Data Protection
- No PII stored. Email content sanitized; HTML stripped. Only structured disaster info persisted.
- D1 access via Worker bindings; KV namespace scoped per environment.
- Secrets managed via `wrangler secret` per environment.

### CORS
- Allowlist Pages origins per env. Preflight handled; expose only necessary headers.

## Caching Strategy

### Layers
- KV response cache for summary and list endpoints (TTL 300s).
- In-memory cache (Durable Object optional) for hot keys to reduce KV latency (future).

### Keys & TTLs
- `disasters:current:{country|all}:{severity|all}:{type|all}:{limit}:{offset}` -> 300s
- `disasters:summary` -> 300s
- `disasters:history:{days}` -> 300s

### Invalidation
- After successful email processing, delete keys with prefixes `disasters:current:*`, `disasters:summary`, `disasters:history:*`.
- On manual updates (admin), same invalidation.

## Error Handling

### API Error Contract
```json
{
  "success": false,
  "message": "Human-readable error",
  "code": "ERR_CODE",
  "timestamp": "2025-09-03T12:00:00Z",
  "details": {"field": "reason"}
}
```

### Categories
- Validation errors: 400 with details; do not cache.
- Not found: 404 minimal body.
- Rate limited: 429 with `Retry-After` header.
- Server errors: 5xx with correlation ID; safe generic message.

### Retries & Idempotency
- Email processing idempotent via `raw_email_hash` uniqueness; ignore duplicates.
- Transient DB errors retried with exponential backoff (max 3 attempts).

## Monitoring & Logging

### Structured Logging
- JSON logs from Workers with fields: `level`, `event`, `trace_id`, `endpoint`, `status`, `duration_ms`, `db_reads`, `db_writes`, `cache_hit`, `error`.
- Processing logs persisted in `processing_logs` with timing and counters.

### Metrics
- API: p50/p95 latency, error rate, cache hit ratio, requests per endpoint.
- Processing: parse success rate, new vs updated disasters, processing time.
- Dashboard: load time, API call failures (Sentry/browser metrics).

### Alerting
- Threshold-based alerts: error rate > 2% 5m, p95 > 1000ms 10m, processing failure.
- Uptime checks for `/api/health`.

## Deployment Pipeline

### Environments
- dev, staging, production with separate D1 and KV bindings.

### CI/CD (GitHub Actions)
- Lint, type-check, unit tests for workers and dashboard.
- Build Workers; run D1 migrations; deploy via Wrangler with env from secrets.
- Build and deploy dashboard to Cloudflare Pages; attach env vars and API URL per env.
- Post-deploy smoke tests for `/api/health`, `/api/disasters/summary`.

### Configuration
- `wrangler.toml` with `[env.<name>]` sections for `DB`, `CACHE` bindings and vars.
- Secrets via `wrangler secret put` in CI using OIDC or repo secrets.

## Performance Optimization

### Database
- Indexes on `is_active`, `event_timestamp`, `severity`, `disaster_type`, `country` (defined above).
- Pagination by `LIMIT/OFFSET` for small pages; keyset pagination if required later.

### API
- Select only required columns; avoid `SELECT *` in hot paths.
- Cache responses; use ETag and `Cache-Control` for browser caching where safe.
- Avoid N+1 joins; pre-aggregate for summary endpoint.

### Frontend
- Code-splitting by route; lazy-load heavy charts/map.
- Memoize expensive components; virtualization for long lists.
- Debounce filter inputs; minimal re-renders via stable query keys.

## Testing Strategy

### Unit Tests
- Parsers with fixtures (earthquake, cyclone, flood variants; malformed inputs).
- API handlers with mocked `env.DB` and `env.CACHE`.
- Utilities (date, text, geo) with edge cases.

### Integration Tests
- End-to-end email processing: feed sample email text -> assert DB rows, cache invalidation, logs.
- API contract tests comparing snapshots under `tests/fixtures/api-responses`.

### UI Tests
- Component tests for TrafficLights, Map interactions, Filters using React Testing Library.
- Basic Cypress/Playwright flows for dashboard rendering and filtering.

### Performance/Load
- k6 or Artillery scripts hitting summary/current endpoints; assert latency and error rate.

### Quality Gates
- CI must pass: Lint/Typecheck/Unit tests; block deploy on failures.