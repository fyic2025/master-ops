---
name: ga4-analyst
description: Google Analytics 4 reporting, conversion tracking, user behavior analysis, and e-commerce insights for all 4 stores (BOO, Teelixir, Elevate, RHF). Use for traffic analysis, conversion optimization, and attribution.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# GA4 Analyst Skill

Google Analytics 4 reporting, conversion tracking, user behavior analysis, and e-commerce insights for all 4 stores.

## Businesses Covered

| Business | Property ID (Vault Key) | Platform | Enhanced E-commerce |
|----------|------------------------|----------|---------------------|
| Buy Organics Online | `boo/ga4_property_id` | BigCommerce | Yes |
| Teelixir | `teelixir/ga4_property_id` | Shopify | Yes |
| Elevate Wholesale | `elevate/ga4_property_id` | Shopify | Yes |
| Red Hill Fresh | `redhillfresh/ga4_property_id` | WooCommerce | Yes |

**Note:** Property IDs are stored in the Supabase vault. Add them with:
```bash
node creds.js store boo ga4_property_id "123456789" "BOO GA4 property"
node creds.js store teelixir ga4_property_id "123456790" "Teelixir GA4 property"
node creds.js store elevate ga4_property_id "123456791" "Elevate GA4 property"
node creds.js store redhillfresh ga4_property_id "123456792" "Red Hill Fresh GA4 property"
```

---

## When to Activate This Skill

Activate when the user mentions:
- "google analytics" or "GA4"
- "website traffic" or "sessions"
- "conversions" or "conversion rate"
- "user behavior" or "engagement"
- "bounce rate" or "engagement rate"
- "acquisition" or "traffic sources"
- "e-commerce report" or "revenue"
- "funnel analysis"
- "audience" or "demographics"
- "events" or "event tracking"

---

## Core Capabilities

### 1. Traffic Analysis
Understand where visitors come from:
- **Sessions** - Total website visits
- **Users** - Unique visitors
- **New vs Returning** - User composition
- **Traffic Sources** - Organic, paid, direct, referral, social
- **Campaigns** - UTM tracking effectiveness

### 2. User Behavior
How visitors interact with the site:
- **Engagement Rate** - % sessions with engagement
- **Avg Engagement Time** - Time actively engaged
- **Pages per Session** - Content consumption
- **Events** - Specific interactions
- **Scroll Depth** - Content engagement

### 3. E-commerce Analytics
Transaction and revenue insights:
- **Transactions** - Order count
- **Revenue** - Total and per session
- **AOV** - Average order value
- **Conversion Rate** - % sessions that convert
- **Product Performance** - Top sellers, views

### 4. Funnel Analysis
Conversion path optimization:
- **Purchase Funnel** - View → Cart → Checkout → Purchase
- **Drop-off Points** - Where users abandon
- **Funnel Conversion** - Stage-to-stage rates

### 5. Audience Insights
Who your visitors are:
- **Demographics** - Age, gender
- **Geography** - Location, language
- **Technology** - Device, browser, OS
- **Interests** - Affinity categories

### 6. Custom Reports
Tailored analysis:
- **Landing Page Performance**
- **Product Category Analysis**
- **Campaign ROI**
- **Customer Lifetime Value**

---

## Database Schema

### GA4 Tables (Master Supabase)

```sql
-- Daily traffic metrics
CREATE TABLE ga4_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,

  -- Traffic
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,

  -- Engagement
  engaged_sessions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  avg_engagement_time_seconds INTEGER,
  bounce_rate DECIMAL(5,4),

  -- E-commerce
  transactions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2),
  conversion_rate DECIMAL(5,4),

  -- Calculated
  pages_per_session DECIMAL(5,2),
  revenue_per_session DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date)
);

CREATE INDEX idx_ga4_daily_business_date ON ga4_daily_metrics(business, date);

-- Traffic by source/medium
CREATE TABLE ga4_traffic_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT,

  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  engaged_sessions INTEGER DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, source, medium, campaign)
);

-- Landing page performance
CREATE TABLE ga4_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,
  landing_page TEXT NOT NULL,

  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  engaged_sessions INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4),
  avg_engagement_time_seconds INTEGER,
  transactions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  bounce_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, landing_page)
);

-- E-commerce product performance
CREATE TABLE ga4_product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT,
  item_category TEXT,

  item_views INTEGER DEFAULT 0,
  add_to_carts INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,

  view_to_cart_rate DECIMAL(5,4),
  cart_to_purchase_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, item_id)
);

-- Conversion funnel snapshots
CREATE TABLE ga4_funnel_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,
  device_category TEXT,  -- 'desktop', 'mobile', 'tablet', 'all'

  -- Funnel stages
  session_start INTEGER DEFAULT 0,
  view_item INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  begin_checkout INTEGER DEFAULT 0,
  purchase INTEGER DEFAULT 0,

  -- Conversion rates (cumulative from session_start)
  view_rate DECIMAL(5,4),
  cart_rate DECIMAL(5,4),
  checkout_rate DECIMAL(5,4),
  purchase_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, device_category)
);

-- Audience demographics
CREATE TABLE ga4_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,

  dimension_type TEXT NOT NULL,  -- 'age', 'gender', 'country', 'city', 'device'
  dimension_value TEXT NOT NULL,

  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  transactions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, dimension_type, dimension_value)
);

-- Custom events tracking
CREATE TABLE ga4_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL,
  date DATE NOT NULL,
  event_name TEXT NOT NULL,

  event_count INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  event_value DECIMAL(12,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business, date, event_name)
);
```

### Key Views

```sql
-- Daily performance summary
CREATE OR REPLACE VIEW v_ga4_daily_summary AS
SELECT
  business,
  date,
  sessions,
  users,
  ROUND(engagement_rate * 100, 1) as engagement_rate_pct,
  transactions,
  revenue,
  ROUND(conversion_rate * 100, 2) as conversion_rate_pct,
  ROUND(avg_order_value, 2) as aov
FROM ga4_daily_metrics
ORDER BY business, date DESC;

-- Week-over-week comparison
CREATE OR REPLACE VIEW v_ga4_wow_comparison AS
WITH this_week AS (
  SELECT
    business,
    SUM(sessions) as sessions,
    SUM(users) as users,
    SUM(transactions) as transactions,
    SUM(revenue) as revenue
  FROM ga4_daily_metrics
  WHERE date >= CURRENT_DATE - 7
  GROUP BY business
),
last_week AS (
  SELECT
    business,
    SUM(sessions) as sessions,
    SUM(users) as users,
    SUM(transactions) as transactions,
    SUM(revenue) as revenue
  FROM ga4_daily_metrics
  WHERE date >= CURRENT_DATE - 14 AND date < CURRENT_DATE - 7
  GROUP BY business
)
SELECT
  tw.business,
  tw.sessions as current_sessions,
  lw.sessions as previous_sessions,
  ROUND(100.0 * (tw.sessions - lw.sessions) / NULLIF(lw.sessions, 0), 1) as sessions_change_pct,
  tw.revenue as current_revenue,
  lw.revenue as previous_revenue,
  ROUND(100.0 * (tw.revenue - lw.revenue) / NULLIF(lw.revenue, 0), 1) as revenue_change_pct
FROM this_week tw
LEFT JOIN last_week lw ON tw.business = lw.business;

-- Top traffic sources
CREATE OR REPLACE VIEW v_ga4_top_sources AS
SELECT
  business,
  source,
  medium,
  SUM(sessions) as sessions,
  SUM(users) as users,
  SUM(transactions) as transactions,
  SUM(revenue) as revenue,
  ROUND(SUM(transactions)::decimal / NULLIF(SUM(sessions), 0) * 100, 2) as conversion_rate_pct
FROM ga4_traffic_sources
WHERE date >= CURRENT_DATE - 28
GROUP BY business, source, medium
ORDER BY business, sessions DESC;

-- Funnel performance
CREATE OR REPLACE VIEW v_ga4_funnel_summary AS
SELECT
  business,
  device_category,
  AVG(session_start) as avg_sessions,
  ROUND(AVG(view_rate) * 100, 1) as view_rate_pct,
  ROUND(AVG(cart_rate) * 100, 1) as cart_rate_pct,
  ROUND(AVG(checkout_rate) * 100, 1) as checkout_rate_pct,
  ROUND(AVG(purchase_rate) * 100, 2) as conversion_rate_pct
FROM ga4_funnel_snapshots
WHERE date >= CURRENT_DATE - 7
GROUP BY business, device_category;

-- Top landing pages
CREATE OR REPLACE VIEW v_ga4_top_landing_pages AS
SELECT
  business,
  landing_page,
  SUM(sessions) as sessions,
  ROUND(AVG(engagement_rate) * 100, 1) as avg_engagement_rate_pct,
  SUM(transactions) as transactions,
  SUM(revenue) as revenue,
  ROUND(SUM(transactions)::decimal / NULLIF(SUM(sessions), 0) * 100, 2) as conversion_rate_pct
FROM ga4_landing_pages
WHERE date >= CURRENT_DATE - 28
GROUP BY business, landing_page
HAVING SUM(sessions) >= 10
ORDER BY business, sessions DESC;
```

---

## Scripts

### sync-ga4-data.ts
Sync analytics data from GA4 Data API.

```bash
# Sync all businesses (last 7 days)
npx tsx .claude/skills/ga4-analyst/scripts/sync-ga4-data.ts

# Sync specific business
npx tsx .claude/skills/ga4-analyst/scripts/sync-ga4-data.ts --business teelixir

# Sync date range
npx tsx .claude/skills/ga4-analyst/scripts/sync-ga4-data.ts --start 2024-11-01 --end 2024-11-30
```

### generate-traffic-report.ts
Generate traffic analysis report.

```bash
# Weekly traffic report
npx tsx .claude/skills/ga4-analyst/scripts/generate-traffic-report.ts --weekly

# Monthly report
npx tsx .claude/skills/ga4-analyst/scripts/generate-traffic-report.ts --monthly --business teelixir
```

### analyze-ecommerce.ts
E-commerce performance analysis.

```bash
# E-commerce overview
npx tsx .claude/skills/ga4-analyst/scripts/analyze-ecommerce.ts

# Product performance
npx tsx .claude/skills/ga4-analyst/scripts/analyze-ecommerce.ts --products --top 50

# Funnel analysis
npx tsx .claude/skills/ga4-analyst/scripts/analyze-ecommerce.ts --funnel
```

### compare-periods.ts
Compare performance across time periods.

```bash
# Week over week
npx tsx .claude/skills/ga4-analyst/scripts/compare-periods.ts --wow

# Month over month
npx tsx .claude/skills/ga4-analyst/scripts/compare-periods.ts --mom

# Year over year
npx tsx .claude/skills/ga4-analyst/scripts/compare-periods.ts --yoy
```

### analyze-audience.ts
Audience and demographics analysis.

```bash
# Full audience report
npx tsx .claude/skills/ga4-analyst/scripts/analyze-audience.ts

# Device breakdown
npx tsx .claude/skills/ga4-analyst/scripts/analyze-audience.ts --devices

# Geographic distribution
npx tsx .claude/skills/ga4-analyst/scripts/analyze-audience.ts --geo
```

---

## GA4 Data API Integration

### Authentication Setup

GA4 Data API uses **OAuth 2.0** with the same credentials as Google Ads and Google Search Console.

**Available Credentials (Global Vault):**
- `GOOGLE_ADS_CLIENT_ID` - OAuth2 client ID (reusable for GA4, GSC, Ads)
- `GOOGLE_ADS_CLIENT_SECRET` - OAuth2 client secret (reusable for GA4, GSC, Ads)
- `GOOGLE_GSC_REFRESH_TOKEN` - OAuth2 refresh token (reusable for GA4, GSC, Ads)

**Important:** The same Google OAuth credentials work across:
- Google Analytics 4 (GA4)
- Google Search Console (GSC)
- Google Ads API
- Google Merchant Center

### Getting GA4 Refresh Token

If you don't have `GOOGLE_GSC_REFRESH_TOKEN` yet:

1. **Generate Authorization URL:**
   ```bash
   node creds.js get global google_ads_client_id
   # Use the client ID in this URL:
   https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=https://www.googleapis.com/auth/analytics.readonly%20https://www.googleapis.com/auth/webmasters.readonly&access_type=offline&prompt=consent
   ```

2. **Exchange Code for Refresh Token:**
   ```bash
   curl -d "code=YOUR_AUTH_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=http://localhost&grant_type=authorization_code" https://oauth2.googleapis.com/token
   ```

3. **Store in Vault:**
   ```bash
   node creds.js store global google_gsc_refresh_token "YOUR_REFRESH_TOKEN" "Google OAuth refresh token (GA4, GSC, Ads)"
   ```

### Implementation

```typescript
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { google } from 'googleapis'

const creds = require('../../../../creds')
await creds.load('global')

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,
  process.env.GOOGLE_ADS_CLIENT_SECRET,
  'http://localhost'
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_GSC_REFRESH_TOKEN
})

// Initialize GA4 Data API client
const analyticsDataClient = new BetaAnalyticsDataClient({
  auth: oauth2Client
})
```

### Key API Methods

**Run Report**
```typescript
const [response] = await analyticsDataClient.runReport({
  property: `properties/${propertyId}`,
  dateRanges: [{
    startDate: '2024-11-01',
    endDate: '2024-11-28'
  }],
  dimensions: [
    { name: 'date' },
    { name: 'sessionDefaultChannelGroup' }
  ],
  metrics: [
    { name: 'sessions' },
    { name: 'totalUsers' },
    { name: 'transactions' },
    { name: 'totalRevenue' }
  ]
})
```

**Funnel Report**
```typescript
const [response] = await analyticsDataClient.runFunnelReport({
  property: `properties/${propertyId}`,
  dateRanges: [{
    startDate: '7daysAgo',
    endDate: 'yesterday'
  }],
  funnel: {
    steps: [
      { name: 'First visit', filterExpression: { ... } },
      { name: 'View product', filterExpression: { eventFilter: { eventName: 'view_item' } } },
      { name: 'Add to cart', filterExpression: { eventFilter: { eventName: 'add_to_cart' } } },
      { name: 'Purchase', filterExpression: { eventFilter: { eventName: 'purchase' } } }
    ]
  }
})
```

### Rate Limits
- 10 concurrent requests
- 10,000 tokens per project per day
- Request quotas vary by endpoint

---

## Key Metrics & Benchmarks

### Traffic Metrics

| Metric | Good | Average | Poor |
|--------|------|---------|------|
| Engagement Rate | >60% | 40-60% | <40% |
| Bounce Rate | <40% | 40-60% | >60% |
| Pages/Session | >3 | 2-3 | <2 |
| Avg Session Duration | >3min | 1-3min | <1min |

### E-commerce Metrics

| Metric | Good | Average | Poor |
|--------|------|---------|------|
| Conversion Rate | >3% | 1-3% | <1% |
| Cart Abandonment | <60% | 60-80% | >80% |
| Checkout Abandonment | <30% | 30-50% | >50% |
| AOV Growth | Growing | Stable | Declining |

### Traffic Source Quality

| Source | Expected CVR | Notes |
|--------|--------------|-------|
| Organic Search | 2-4% | High intent |
| Paid Search (Brand) | 5-10% | Highest intent |
| Paid Search (Generic) | 1-2% | Lower intent |
| Email | 3-6% | Warm audience |
| Social (Organic) | 0.5-1% | Discovery |
| Social (Paid) | 1-2% | Targeted |
| Direct | 3-5% | Brand awareness |
| Referral | 1-3% | Varies by source |

---

## Common Events to Track

### Standard E-commerce Events
- `view_item` - Product page view
- `add_to_cart` - Add to cart
- `remove_from_cart` - Remove from cart
- `view_cart` - Cart page view
- `begin_checkout` - Start checkout
- `add_payment_info` - Payment step
- `add_shipping_info` - Shipping step
- `purchase` - Completed purchase
- `refund` - Refund processed

### Enhanced Events
- `view_item_list` - Collection/category view
- `select_item` - Click on product
- `view_promotion` - Promo banner view
- `select_promotion` - Click on promo
- `search` - Site search

### Custom Events (Recommended)
- `newsletter_signup` - Email capture
- `wishlist_add` - Wishlist addition
- `share` - Social sharing
- `review_submit` - Product review
- `live_chat_start` - Chat initiation

---

## Credentials Required

All credentials stored in Supabase vault (`creds.js`):

### Global Credentials
```bash
# OAuth2 credentials (reusable for GA4, GSC, Ads, Merchant Center)
node creds.js get global google_ads_client_id
node creds.js get global google_ads_client_secret
node creds.js get global google_gsc_refresh_token
```

### Business-Specific Credentials
```bash
# GA4 Property IDs
node creds.js store boo ga4_property_id "123456789"
node creds.js store teelixir ga4_property_id "123456790"
node creds.js store elevate ga4_property_id "123456791"
node creds.js store redhillfresh ga4_property_id "123456792"
```

### Supabase (Auto-loaded)
The master Supabase instance is automatically configured:
- URL: `https://qcvfxxsnqvdfmpbcgdni.supabase.co`
- Service role key loaded from vault

### Loading Credentials in Scripts
```typescript
const creds = require('../../../../creds')

// Load global credentials (OAuth2)
await creds.load('global')

// Load business-specific credentials (includes global)
await creds.load('boo')
await creds.load('teelixir')
await creds.load('elevate')
await creds.load('redhillfresh')

// Access via environment variables
const propertyId = process.env.BOO_GA4_PROPERTY_ID
const clientId = process.env.GOOGLE_ADS_CLIENT_ID
```

---

## Automation Schedule

| Task | Frequency | Time (AEST) |
|------|-----------|-------------|
| Daily Metrics Sync | Daily | 8:00 AM |
| Traffic Sources Sync | Daily | 8:15 AM |
| E-commerce Sync | Daily | 8:30 AM |
| Weekly Report | Weekly | Monday 9:00 AM |
| Monthly Report | Monthly | 1st 9:00 AM |
| Anomaly Detection | Daily | 9:00 AM |

---

## Alert Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| Traffic -20% DoD | Warning | Monitor |
| Traffic -30% WoW | Critical | Investigate |
| Conversion -20% WoW | Warning | Review funnel |
| Revenue -30% WoW | Critical | Immediate review |
| Bounce rate +20% | Warning | Check landing pages |
| Cart abandonment +10% | Warning | Review checkout |

---

## Integration Points

### Dashboard
- Traffic overview widgets
- Conversion funnel visualization
- Revenue trends
- Source/medium breakdown

### Google Ads Manager
- ROAS calculation
- Campaign performance correlation
- Conversion tracking verification

### GSC Expert
- Organic traffic correlation
- Landing page performance

### Email Campaign Manager
- Email traffic attribution
- Campaign performance

---

## Success Criteria

A successful GA4 analysis session should:
- Sync all traffic and e-commerce data daily
- Track key conversion funnels
- Identify traffic source performance
- Detect anomalies within 24 hours
- Provide actionable insights for optimization
- Compare performance across periods
- Segment analysis by device and audience
- Generate comprehensive reports on demand
