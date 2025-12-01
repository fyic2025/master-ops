# Dashboard Architecture

Technical architecture of ops.growthcohq.com dashboard.

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14.x |
| Runtime | Node.js | 20.x |
| Database | Supabase (PostgreSQL) | Latest |
| Hosting | DigitalOcean App Platform | - |
| Auth | Supabase Auth | - |
| Styling | Tailwind CSS | 3.x |

---

## Project Structure

```
master-dashboard/
├── app/
│   ├── api/                    # API routes
│   │   ├── health/            # Health check endpoints
│   │   ├── jobs/              # Job monitoring
│   │   ├── metrics/           # Business metrics
│   │   ├── reports/           # Report generation
│   │   ├── integrations/      # Integration status
│   │   └── alerts/            # Alert management
│   ├── dashboard/             # Dashboard pages
│   │   ├── page.tsx           # Main dashboard
│   │   ├── boo/              # BOO-specific views
│   │   ├── teelixir/         # Teelixir views
│   │   ├── elevate/          # Elevate views
│   │   └── rhf/              # RHF views
│   └── layout.tsx            # Root layout
├── components/
│   ├── widgets/              # Dashboard widgets
│   │   ├── JobMonitoringWidget.tsx
│   │   ├── RevenueWidget.tsx
│   │   ├── IntegrationHealthWidget.tsx
│   │   ├── AlertsWidget.tsx
│   │   └── QuickActionsWidget.tsx
│   ├── charts/               # Chart components
│   └── ui/                   # UI primitives
├── lib/
│   ├── supabase/            # Database clients
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client
│   └── utils/               # Utility functions
└── types/                   # TypeScript definitions
```

---

## Database Schema

### Core Tables

#### dashboard_job_status
Tracks all automated jobs across businesses.

```sql
CREATE TABLE dashboard_job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL,  -- 'cron', 'n8n', 'edge_function', 'script'
  business TEXT NOT NULL,  -- 'boo', 'teelixir', 'elevate', 'rhf', 'infrastructure'
  description TEXT,

  -- Timing
  last_run TIMESTAMPTZ,
  last_success TIMESTAMPTZ,
  last_error TEXT,
  next_expected TIMESTAMPTZ,
  expected_frequency TEXT,  -- 'every_2h', 'every_6h', 'daily', 'weekly'

  -- Status
  status TEXT DEFAULT 'unknown',  -- 'healthy', 'stale', 'failed', 'unknown'
  enabled BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_job_status_business ON dashboard_job_status(business);
CREATE INDEX idx_job_status_status ON dashboard_job_status(status);
```

#### dashboard_business_metrics
Daily business metrics by business.

```sql
CREATE TABLE dashboard_business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  metric_date DATE NOT NULL,

  -- Order metrics
  orders_count INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,

  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,

  -- Financial
  refunds DECIMAL(10,2) DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(business, metric_date)
);

CREATE INDEX idx_metrics_date ON dashboard_business_metrics(metric_date DESC);
CREATE INDEX idx_metrics_business ON dashboard_business_metrics(business);
```

#### dashboard_alerts
System alerts and notifications.

```sql
CREATE TABLE dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,  -- 'job_failed', 'integration_down', 'threshold_exceeded'
  severity TEXT NOT NULL,    -- 'info', 'warning', 'critical'
  business TEXT,

  title TEXT NOT NULL,
  message TEXT,

  -- State
  status TEXT DEFAULT 'active',  -- 'active', 'acknowledged', 'resolved'
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,

  -- Context
  source TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_status ON dashboard_alerts(status);
CREATE INDEX idx_alerts_severity ON dashboard_alerts(severity);
```

#### dashboard_health_checks
Integration health status.

```sql
CREATE TABLE dashboard_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT UNIQUE NOT NULL,
  integration_type TEXT NOT NULL,  -- 'api', 'database', 'external'
  business TEXT,

  -- Status
  status TEXT DEFAULT 'unknown',  -- 'healthy', 'degraded', 'down', 'unknown'
  last_check TIMESTAMPTZ,
  last_success TIMESTAMPTZ,
  response_time_ms INTEGER,

  -- Error tracking
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT,

  -- Config
  check_url TEXT,
  check_interval_minutes INTEGER DEFAULT 5,

  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Routes

### Job Monitoring

```typescript
// GET /api/jobs
// Returns all job statuses with filtering
Response: {
  jobs: JobStatus[];
  summary: {
    total: number;
    healthy: number;
    stale: number;
    failed: number;
  };
}

// POST /api/jobs/refresh
// Triggers job status refresh from sources
Response: {
  refreshed: number;
  errors: string[];
}
```

### Metrics

```typescript
// GET /api/metrics?business=boo&days=7
// Returns business metrics for date range
Response: {
  business: string;
  metrics: DailyMetric[];
  totals: {
    orders: number;
    revenue: number;
    avgOrderValue: number;
  };
}

// POST /api/metrics/populate?date=2024-12-01
// Triggers metric population for date
```

### Health Checks

```typescript
// GET /api/health
// Returns all integration health statuses
Response: {
  integrations: HealthCheck[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

// POST /api/health/check?integration=shopify-teelixir
// Triggers health check for specific integration
```

### Alerts

```typescript
// GET /api/alerts?status=active
// Returns alerts with optional filtering
Response: {
  alerts: Alert[];
  counts: {
    active: number;
    critical: number;
    warning: number;
  };
}

// PATCH /api/alerts/:id
// Update alert status (acknowledge/resolve)
Body: { status: 'acknowledged' | 'resolved' }
```

---

## Environment Variables

### Required for Dashboard

```env
# Supabase (Master)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# BOO Supabase (for automation_logs sync)
BOO_SUPABASE_URL=https://usibnyxxx.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# E-commerce APIs (for metrics)
BC_STORE_HASH=xxx
BC_ACCESS_TOKEN=xxx
TEELIXIR_SHOPIFY_DOMAIN=teelixir.myshopify.com
TEELIXIR_SHOPIFY_ACCESS_TOKEN=xxx
ELEVATE_SHOPIFY_DOMAIN=elevate-wholesale.myshopify.com
ELEVATE_SHOPIFY_ACCESS_TOKEN=xxx
RHF_WC_URL=https://www.redhillfresh.com.au
RHF_WC_CONSUMER_KEY=xxx
RHF_WC_CONSUMER_SECRET=xxx

# n8n (for workflow sync)
N8N_BASE_URL=https://n8n.xxx.com
N8N_API_KEY=xxx
```

---

## Widget Components

### JobMonitoringWidget
Displays job status grid with health indicators.

Features:
- Color-coded status (green/yellow/red)
- Last run timestamps
- Click to expand for details
- Copy button for fix commands

### RevenueWidget
Shows revenue trends across businesses.

Features:
- Daily/weekly/monthly views
- Business breakdown
- Comparison to previous period
- Trend indicators

### IntegrationHealthWidget
Real-time integration status.

Features:
- Status indicators per integration
- Response time graphs
- Alert on degradation
- Manual check trigger

### AlertsWidget
Active alerts with management.

Features:
- Severity-based sorting
- Acknowledge/resolve actions
- Filter by business/type
- Link to relevant dashboard section

---

## Data Flow

```
[External Sources]
     │
     ├── BOO automation_logs ──────────┐
     ├── n8n workflow executions ──────┤
     ├── Shopify API ──────────────────┤
     ├── BigCommerce API ──────────────┤
     └── WooCommerce API ──────────────┤
                                       │
                                       ▼
                            [Sync Scripts]
                                       │
                                       ▼
                            [Master Supabase]
                                       │
                                       ▼
                            [Dashboard API Routes]
                                       │
                                       ▼
                            [Dashboard Widgets]
```

---

## Cron Jobs

| Job | Schedule | Script |
|-----|----------|--------|
| Sync Job Status | Every 2 hours | sync-job-status.ts |
| Populate Metrics | 6:00 AM AEST | populate-metrics.ts |
| Generate Daily Report | 7:00 AM AEST | generate-daily-report.ts |
| Health Checks | Every 5 minutes | (edge function) |
| Alert Cleanup | Daily midnight | (database function) |

---

## Security

### Authentication
- Supabase Auth with email/password
- Row Level Security on all tables
- Admin-only access to dashboard

### API Protection
- Service role key for backend operations
- Anon key for authenticated users only
- Rate limiting on public endpoints

### Data Access
- Metrics read-only for non-admin
- Job management requires admin role
- Alert management requires admin role
