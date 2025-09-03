# GDACS Dashboard - Application File Structure

```
gdacs-dashboard/
│
├── README.md
├── LICENSE
├── .gitignore
├── package.json
├── package-lock.json
├── .env.example
├── .env.local
│
├── docs/
│   ├── README.md
│   ├── high-level-design.md
│   ├── api-documentation.md
│   ├── deployment-guide.md
│   └── user-guide.md
│
├── infrastructure/
│   ├── README.md
│   ├── cloudflare/
│   │   ├── wrangler.toml
│   │   ├── d1-schema.sql
│   │   ├── d1-migrations/
│   │   │   ├── 0001_initial_schema.sql
│   │   │   ├── 0002_add_indexes.sql
│   │   │   └── 0003_add_processing_logs.sql
│   │   └── kv-namespaces.json
│   │
│   ├── terraform/ (optional)
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars.example
│   │
│   └── scripts/
│       ├── deploy.sh
│       ├── setup-d1.sh
│       ├── backup-database.sh
│       └── restore-database.sh
│
├── workers/ (Cloudflare Workers)
│   ├── README.md
│   ├── package.json
│   ├── wrangler.toml
│   ├── tsconfig.json
│   │
│   ├── email-processor/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── handlers/
│   │   │   │   ├── email-webhook.ts
│   │   │   │   ├── process-email.ts
│   │   │   │   └── health-check.ts
│   │   │   ├── parsers/
│   │   │   │   ├── gdacs-parser.ts
│   │   │   │   ├── earthquake-parser.ts
│   │   │   │   ├── cyclone-parser.ts
│   │   │   │   ├── flood-parser.ts
│   │   │   │   └── base-parser.ts
│   │   │   ├── services/
│   │   │   │   ├── database.ts
│   │   │   │   ├── cache.ts
│   │   │   │   ├── geocoding.ts
│   │   │   │   └── notification.ts
│   │   │   ├── types/
│   │   │   │   ├── disaster.ts
│   │   │   │   ├── email.ts
│   │   │   │   └── api.ts
│   │   │   ├── utils/
│   │   │   │   ├── validation.ts
│   │   │   │   ├── date-utils.ts
│   │   │   │   ├── geo-utils.ts
│   │   │   │   └── text-utils.ts
│   │   │   └── config/
│   │   │       ├── constants.ts
│   │   │       └── patterns.ts
│   │   ├── test/
│   │   │   ├── parsers/
│   │   │   │   ├── gdacs-parser.test.ts
│   │   │   │   ├── earthquake-parser.test.ts
│   │   │   │   └── cyclone-parser.test.ts
│   │   │   ├── handlers/
│   │   │   │   └── email-webhook.test.ts
│   │   │   ├── fixtures/
│   │   │   │   ├── sample-gdacs-email.txt
│   │   │   │   ├── sample-earthquake-data.json
│   │   │   │   └── sample-cyclone-data.json
│   │   │   └── utils/
│   │   │       └── test-helpers.ts
│   │   └── wrangler.toml
│   │
│   └── api/
│       ├── src/
│       │   ├── index.ts
│       │   ├── handlers/
│       │   │   ├── disasters.ts
│       │   │   ├── summary.ts
│       │   │   ├── history.ts
│       │   │   ├── countries.ts
│       │   │   └── health.ts
│       │   ├── middleware/
│       │   │   ├── cors.ts
│       │   │   ├── auth.ts
│       │   │   ├── rate-limit.ts
│       │   │   └── error-handler.ts
│       │   ├── services/
│       │   │   ├── disaster-service.ts
│       │   │   ├── cache-service.ts
│       │   │   └── analytics-service.ts
│       │   ├── types/
│       │   │   ├── api-types.ts
│       │   │   └── database-types.ts
│       │   └── utils/
│       │       ├── response-builder.ts
│       │       ├── query-builder.ts
│       │       └── validation.ts
│       ├── test/
│       │   ├── handlers/
│       │   │   ├── disasters.test.ts
│       │   │   └── summary.test.ts
│       │   └── services/
│       │       └── disaster-service.test.ts
│       └── wrangler.toml
│
├── dashboard/ (Frontend React App)
│   ├── README.md
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   ├── manifest.json
│   │   └── robots.txt
│   │
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   │
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── StatusPanel.tsx
│   │   │   │   ├── TrafficLights.tsx
│   │   │   │   ├── SummaryCards.tsx
│   │   │   │   ├── RecentDisasters.tsx
│   │   │   │   ├── DisasterMap.tsx
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── Statistics.tsx
│   │   │   │   ├── CountryFilter.tsx
│   │   │   │   └── SearchFilter.tsx
│   │   │   ├── charts/
│   │   │   │   ├── DisasterChart.tsx
│   │   │   │   ├── TrendChart.tsx
│   │   │   │   ├── PieChart.tsx
│   │   │   │   └── BarChart.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Select.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Tooltip.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DisasterDetails.tsx
│   │   │   ├── History.tsx
│   │   │   ├── About.tsx
│   │   │   └── NotFound.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDisasters.ts
│   │   │   ├── useSummary.ts
│   │   │   ├── useHistory.ts
│   │   │   ├── useCountries.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── websocket.ts
│   │   │   └── storage.ts
│   │   │
│   │   ├── types/
│   │   │   ├── disaster.ts
│   │   │   ├── api.ts
│   │   │   ├── chart.ts
│   │   │   └── global.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── date.ts
│   │   │   ├── format.ts
│   │   │   ├── geo.ts
│   │   │   ├── color.ts
│   │   │   ├── constants.ts
│   │   │   └── validation.ts
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── components.css
│   │   │   └── utilities.css
│   │   │
│   │   └── assets/
│   │       ├── images/
│   │       │   ├── logo.png
│   │       │   ├── disaster-icons/
│   │       │   │   ├── earthquake.svg
│   │       │   │   ├── cyclone.svg
│   │       │   │   ├── flood.svg
│   │       │   │   ├── wildfire.svg
│   │       │   │   └── volcano.svg
│   │       │   └── markers/
│   │       │       ├── red-marker.svg
│   │       │       ├── orange-marker.svg
│   │       │       └── green-marker.svg
│   │       └── fonts/
│   │           └── inter/
│   │
│   ├── test/
│   │   ├── __mocks__/
│   │   │   ├── api.ts
│   │   │   └── websocket.ts
│   │   ├── components/
│   │   │   ├── StatusPanel.test.tsx
│   │   │   ├── TrafficLights.test.tsx
│   │   │   └── DisasterMap.test.tsx
│   │   ├── hooks/
│   │   │   ├── useDisasters.test.ts
│   │   │   └── useSummary.test.ts
│   │   ├── utils/
│   │   │   ├── date.test.ts
│   │   │   └── format.test.ts
│   │   └── setup.ts
│   │
│   └── dist/ (build output - gitignored)
│
├── shared/
│   ├── README.md
│   ├── types/
│   │   ├── disaster.ts
│   │   ├── api.ts
│   │   ├── database.ts
│   │   └── email.ts
│   ├── constants/
│   │   ├── disaster-types.ts
│   │   ├── severity-levels.ts
│   │   ├── countries.ts
│   │   └── patterns.ts
│   └── utils/
│       ├── validation.ts
│       ├── date-utils.ts
│       └── geo-utils.ts
│
├── scripts/
│   ├── README.md
│   ├── setup/
│   │   ├── init-project.sh
│   │   ├── setup-cloudflare.sh
│   │   └── create-env.sh
│   ├── development/
│   │   ├── start-dev.sh
│   │   ├── test-email-processing.sh
│   │   └── seed-database.sh
│   ├── deployment/
│   │   ├── deploy-workers.sh
│   │   ├── deploy-dashboard.sh
│   │   ├── deploy-all.sh
│   │   └── rollback.sh
│   ├── maintenance/
│   │   ├── backup-data.sh
│   │   ├── cleanup-old-data.sh
│   │   ├── health-check.sh
│   │   └── update-dependencies.sh
│   └── testing/
│       ├── run-all-tests.sh
│       ├── integration-tests.sh
│       └── load-test.sh
│
├── config/
│   ├── README.md
│   ├── environments/
│   │   ├── development.json
│   │   ├── staging.json
│   │   └── production.json
│   ├── cloudflare/
│   │   ├── wrangler-dev.toml
│   │   ├── wrangler-staging.toml
│   │   └── wrangler-prod.toml
│   └── monitoring/
│       ├── alerts.yml
│       └── dashboards.json
│
├── tests/
│   ├── README.md
│   ├── integration/
│   │   ├── email-processing.test.js
│   │   ├── api-endpoints.test.js
│   │   ├── dashboard-loading.test.js
│   │   └── end-to-end.test.js
│   ├── performance/
│   │   ├── load-test.js
│   │   ├── stress-test.js
│   │   └── api-performance.test.js
│   ├── fixtures/
│   │   ├── gdacs-emails/
│   │   │   ├── sample-1.txt
│   │   │   ├── sample-2.txt
│   │   │   └── sample-with-errors.txt
│   │   ├── api-responses/
│   │   │   ├── disasters-response.json
│   │   │   ├── summary-response.json
│   │   │   └── error-response.json
│   │   └── database/
│   │       ├── seed-data.sql
│   │       └── test-data.sql
│   └── utils/
│       ├── test-helpers.js
│       ├── mock-data.js
│       └── setup-teardown.js
│
├── monitoring/
│   ├── README.md
│   ├── grafana/
│   │   ├── dashboards/
│   │   │   ├── system-overview.json
│   │   │   ├── api-metrics.json
│   │   │   └── disaster-tracking.json
│   │   └── alerts/
│   │       ├── email-processing.yml
│   │       ├── api-health.yml
│   │       └── database-performance.yml
│   ├── logs/
│   │   ├── log-queries.txt
│   │   └── error-patterns.txt
│   └── scripts/
│       ├── setup-monitoring.sh
│       ├── check-health.sh
│       └── generate-reports.sh
│
└── .github/ (or .gitlab/ for GitLab)
    ├── workflows/ (or .gitlab-ci.yml for GitLab)
    │   ├── ci.yml
    │   ├── deploy-staging.yml
    │   ├── deploy-production.yml
    │   ├── test.yml
    │   └── security-scan.yml
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   ├── feature_request.md
    │   └── question.md
    ├── PULL_REQUEST_TEMPLATE.md
    ├── CODEOWNERS
    └── dependabot.yml
```

## Key File Descriptions

### Root Level Configuration
- **package.json**: Main project dependencies and scripts
- **.env.example**: Environment variables template
- **wrangler.toml**: Cloudflare Workers configuration

### Workers Directory
Contains all Cloudflare Workers code:
- **email-processor**: Handles incoming GDACS emails
- **api**: Serves data to the dashboard

### Dashboard Directory
React application with:
- **components**: Reusable UI components
- **pages**: Route-based page components
- **hooks**: Custom React hooks for data fetching
- **services**: API and external service integrations

### Infrastructure Directory
- **d1-schema.sql**: Database schema definition
- **d1-migrations**: Database migration files
- **scripts**: Deployment and maintenance scripts

### Shared Directory
Common types, constants, and utilities used across workers and dashboard

### Tests Directory
Comprehensive testing setup:
- **integration**: End-to-end tests
- **performance**: Load and stress tests
- **fixtures**: Test data and mock responses

### Key Configuration Files

#### `wrangler.toml` (Workers configuration)
```toml
name = "gdacs-email-processor"
main = "src/index.ts"
compatibility_date = "2024-09-01"

[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.d1_databases]]
binding = "DB"
database_name = "gdacs-disasters"
database_id = "your-d1-database-id"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

#### `package.json` (Root level)
```json
{
  "name": "gdacs-dashboard",
  "version": "1.0.0",
  "scripts": {
    "dev": "npm run dev --workspaces",
    "build": "npm run build --workspaces",
    "test": "npm test --workspaces",
    "deploy": "./scripts/deployment/deploy-all.sh"
  },
  "workspaces": [
    "workers/email-processor",
    "workers/api",
    "dashboard"
  ]
}
```
