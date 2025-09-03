# GDACS Live Dashboard - High Level Design Document

## Executive Summary

This document outlines the high-level design for a live disaster monitoring dashboard that processes Global Disaster Alert and Coordination System (GDACS) daily newsletters and presents real-time disaster information through a traffic light alerting system hosted on Cloudflare.

## System Overview

The solution transforms daily GDACS email newsletters into a real-time, visual dashboard that categorizes disasters by severity (Red, Orange, Green) and provides actionable insights for emergency management.

### Key Requirements
- **Real-time Processing**: Automated email processing and dashboard updates
- **Traffic Light System**: Visual severity indicators (Red, Orange, Green)
- **Cloudflare Hosting**: Scalable, global edge deployment
- **Automated Updates**: No manual intervention required
- **Data Persistence**: Historical disaster tracking

## Architecture Overview

```
GDACS Email → Email Processor → Data Store → Dashboard API → Live Dashboard
     ↓              ↓              ↓            ↓              ↓
   Gmail/O365    Cloudflare    D1 Database   Workers API   Pages/React
```

## Core Components

### 1. Email Ingestion Layer

**Primary Option: Email Forwarding Service**
- **Service**: EmailJS, Zapier Email Parser, or custom IMAP client
- **Function**: Receive forwarded GDACS emails
- **Trigger**: Cloudflare Worker via webhook
- **Backup**: Manual email upload interface

**Alternative: Direct Email Integration**
- **Service**: Microsoft Graph API (Office 365) or Gmail API
- **Function**: Poll for new GDACS emails
- **Trigger**: Scheduled Cloudflare Worker (daily at 9 AM UTC)

### 2. Email Processing Engine (Cloudflare Workers)

**Core Functions:**
- **Email Parser**: Extract structured data from GDACS newsletter
- **Data Validation**: Ensure data integrity and completeness  
- **Categorization Engine**: Classify disasters by type and severity
- **Geolocation Processing**: Parse location data for mapping
- **Change Detection**: Identify new/updated disasters

**Processing Logic:**
```javascript
// Pseudo-code structure
async function processGDACSEmail(emailContent) {
  const parsedData = extractDisasterData(emailContent);
  const categorizedData = categorizeDisasters(parsedData);
  const geoData = enrichWithGeolocation(categorizedData);
  await updateDatabase(geoData);
  await invalidateCache();
  return processingSummary;
}
```

### 3. Data Storage Layer (Cloudflare D1)

**Database Schema:**

**disasters** table:
```sql
CREATE TABLE disasters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disaster_type TEXT NOT NULL, -- earthquake, flood, cyclone, etc.
  severity TEXT NOT NULL, -- RED, ORANGE, GREEN
  magnitude REAL,
  location TEXT NOT NULL,
  country TEXT,
  coordinates TEXT, -- lat,lng
  affected_population INTEGER,
  timestamp DATETIME NOT NULL,
  description TEXT,
  source_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**processing_logs** table:
```sql
CREATE TABLE processing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_date DATE NOT NULL,
  processing_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  disasters_processed INTEGER,
  status TEXT, -- SUCCESS, ERROR, PARTIAL
  error_details TEXT
);
```

### 4. API Layer (Cloudflare Workers)

**Endpoints:**

- `GET /api/disasters/current` - Active disasters with severity
- `GET /api/disasters/summary` - Dashboard summary statistics
- `GET /api/disasters/history?days=7` - Historical disaster data
- `GET /api/disasters/by-country?country=X` - Country-specific data
- `GET /api/health` - System health check
- `POST /api/process-email` - Manual email processing trigger

**Response Format:**
```json
{
  "timestamp": "2025-09-03T10:00:00Z",
  "summary": {
    "red_alerts": 0,
    "orange_alerts": 0,
    "green_alerts": 25,
    "total_affected": 15340000
  },
  "disasters": [
    {
      "id": 123,
      "type": "earthquake",
      "severity": "GREEN",
      "magnitude": 5.3,
      "location": "Russia",
      "coordinates": "55.7558,37.6176",
      "affected_population": 0,
      "timestamp": "2025-09-03T03:38:19Z"
    }
  ]
}
```

### 5. Frontend Dashboard (Cloudflare Pages)

**Technology Stack:**
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query for API data
- **Mapping**: Mapbox GL JS or Leaflet
- **Charts**: Chart.js or D3.js
- **Build**: Vite
- **Deployment**: Cloudflare Pages

**Dashboard Features:**

**Traffic Light Status Panel:**
```
🔴 RED ALERTS: 0     🟠 ORANGE ALERTS: 0     🟢 GREEN ALERTS: 25
```

**Core Sections:**
1. **Global Status Overview**: Traffic light summary with counts
2. **Interactive World Map**: Disasters plotted by location and severity
3. **Recent Disasters Timeline**: Chronological list of recent events
4. **Statistics Dashboard**: Charts showing trends and patterns
5. **Country/Region Filter**: Focus on specific geographical areas
6. **Search & Filter**: Find specific disaster types or locations

## Data Flow Architecture

### Primary Flow: Automated Email Processing

```
1. GDACS Newsletter Email Arrives (Daily ~9 AM UTC)
   ↓
2. Email Forwarding Service Triggers Webhook
   ↓
3. Cloudflare Worker Receives Email Content
   ↓
4. Email Parser Extracts Disaster Information
   ↓
5. Data Validation and Categorization
   ↓
6. D1 Database Updated with New/Changed Disasters
   ↓
7. Cache Invalidation (KV Store cleared)
   ↓
8. Dashboard Auto-refreshes with New Data
```

### Secondary Flow: Real-time Dashboard Updates

```
1. User Opens Dashboard
   ↓
2. React App Calls API Endpoints
   ↓
3. Cloudflare Worker Queries D1 Database
   ↓
4. Data Served from Cache (KV Store) if Available
   ↓
5. Dashboard Renders Traffic Light Status
   ↓
6. Auto-refresh Every 15 Minutes
```

## Technical Implementation Details

### Cloudflare Services Utilized

1. **Cloudflare Workers**: Email processing and API endpoints
2. **Cloudflare D1**: SQLite database for disaster data storage
3. **Cloudflare KV**: Caching layer for API responses
4. **Cloudflare Pages**: Static site hosting for React dashboard
5. **Cloudflare Queues**: Email processing job queue (optional)
6. **Cloudflare Analytics**: Usage monitoring and performance tracking

### Email Processing Strategy

**Parsing Approach:**
```javascript
const DISASTER_PATTERNS = {
  earthquake: /earthquake alert.*Magnitude ([\d.]+)M.*in (.*?) \d/gi,
  cyclone: /tropical cyclone (\w+-\d+).*Population affected.*?(\d+)/gi,
  flood: /flood.*?affecting (.*?) region/gi
};

function extractDisasters(emailContent) {
  const disasters = [];
  // Pattern matching and extraction logic
  return disasters;
}
```

### Caching Strategy

- **API Response Caching**: 5-minute TTL in KV Store
- **Static Asset Caching**: Cloudflare CDN handles automatically
- **Database Query Optimization**: Indexed queries on timestamp and severity

### Error Handling & Monitoring

- **Email Processing Failures**: Logged to D1, admin alerts via email
- **API Failures**: Graceful degradation, cached responses served
- **Database Issues**: Retry logic with exponential backoff
- **Monitoring**: Cloudflare Analytics + custom error tracking

## Security Considerations

### Data Protection
- **Email Content**: Sanitized and validated before processing
- **API Access**: Rate limiting via Cloudflare
- **Database Access**: Worker-to-D1 authentication
- **No PII Storage**: Only aggregated disaster information

### Access Control
- **Dashboard**: Public read-only access
- **Admin Endpoints**: API key authentication
- **Processing Triggers**: Webhook signature verification

## Deployment Strategy

### Phase 1: Core Infrastructure (Week 1-2)
- Set up Cloudflare Workers for email processing
- Configure D1 database with schema
- Implement basic email parsing logic
- Create API endpoints for disaster data

### Phase 2: Dashboard Development (Week 3-4)
- Build React dashboard with traffic light system
- Implement interactive world map
- Add real-time data refresh capabilities
- Deploy to Cloudflare Pages

### Phase 3: Integration & Testing (Week 5)
- Connect email forwarding service
- End-to-end testing with sample GDACS emails
- Performance optimization and caching
- Monitoring and alerting setup

### Phase 4: Production Launch (Week 6)
- Go live with real GDACS email processing
- Monitor system performance and reliability
- Gather user feedback and iterate

## Monitoring & Maintenance

### Key Metrics
- **Email Processing Success Rate**: Target 99.5%
- **Dashboard Load Time**: Target <2 seconds
- **API Response Time**: Target <500ms
- **Data Freshness**: Maximum 30 minutes delay

### Alerting
- **Failed Email Processing**: Immediate alert to admin
- **API Downtime**: Automated monitoring with Uptime Robot
- **High Error Rates**: Cloudflare Analytics thresholds
- **Database Issues**: Custom health checks

## Cost Estimation (Monthly)

### Cloudflare Services
- **Workers**: $0 (within free tier limits)
- **D1**: $0 (within free tier: 5GB, 25M reads)
- **KV Store**: $0 (within free tier: 1GB, 10M reads)
- **Pages**: $0 (free tier sufficient)
- **Total Cloudflare**: ~$0-10/month

### Third-party Services
- **Email Processing**: $10-25/month (Zapier/EmailJS)
- **Monitoring**: $5-15/month (optional)
- **Domain**: $10-15/year
- **Total Monthly**: ~$15-40/month

## Risk Mitigation

### Technical Risks
- **Email Format Changes**: Flexible parsing with fallbacks
- **Cloudflare Service Limits**: Monitor usage, scale plan if needed
- **Data Loss**: Regular D1 backups and disaster recovery plan

### Operational Risks
- **GDACS Email Delays**: Historical data serves as fallback
- **Processing Failures**: Manual override capabilities
- **High Traffic**: Cloudflare's global CDN handles scaling

## Success Criteria

1. **Reliability**: 99%+ uptime with automated disaster data updates
2. **Performance**: Dashboard loads in <2 seconds globally
3. **Accuracy**: 100% of GDACS disasters correctly categorized
4. **Usability**: Clear traffic light system enables quick threat assessment
5. **Scalability**: System handles increased data volume and user traffic

## Future Enhancements

### Phase 2 Features
- **Mobile App**: React Native version for mobile users
- **Alert Subscriptions**: Email/SMS notifications for specific regions
- **Historical Analysis**: Trend analysis and predictive insights
- **Multi-language Support**: International accessibility
- **API for Third Parties**: External system integration

### Advanced Features
- **Machine Learning**: Improved disaster impact prediction
- **Social Media Integration**: Real-time disaster reports from Twitter/news
- **Satellite Imagery**: Integration with Earth observation data
- **Emergency Response Tools**: Coordination features for responders

This high-level design provides a robust foundation for transforming GDACS email newsletters into a real-time, actionable disaster monitoring dashboard leveraging Cloudflare's edge computing platform.
