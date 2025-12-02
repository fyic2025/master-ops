---
name: customer-churn-predictor
description: Predicts customer churn risk and recommends retention interventions across all 4 businesses. Uses RFM analysis, behavioral signals, and Klaviyo integration. Use for at-risk customer identification and retention campaigns.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Customer Churn Predictor Skill

Predicts customer churn risk and recommends retention interventions across all 4 businesses.

## Businesses Covered

| Business | Platform | Customer Type | Data Source |
|----------|----------|---------------|-------------|
| Teelixir | Shopify | B2C | tlx_shopify_orders, Klaviyo |
| BOO | BigCommerce | B2C | bc_orders, ecommerce_products |
| Elevate | Shopify | B2B Trial | trial_customers, customer_activity_log |
| RHF | WooCommerce | B2C | wc_customers, wc_orders |

---

## Core Capabilities

### 1. RFM Segmentation
Calculate Recency, Frequency, Monetary scores for all customers.

```sql
-- RFM Score Calculation (Teelixir example)
WITH customer_rfm AS (
  SELECT
    customer_email,
    MAX(processed_at) AS last_order_date,
    COUNT(*) AS order_count,
    SUM(total_price) AS total_spent,
    EXTRACT(DAYS FROM now() - MAX(processed_at)) AS days_since_last_order
  FROM tlx_shopify_orders
  WHERE financial_status IN ('paid', 'partially_paid')
  GROUP BY customer_email
)
SELECT
  customer_email,
  NTILE(5) OVER (ORDER BY days_since_last_order DESC) AS r_score,
  NTILE(5) OVER (ORDER BY order_count) AS f_score,
  NTILE(5) OVER (ORDER BY total_spent) AS m_score
FROM customer_rfm;
```

### 2. Churn Risk Scoring
Predict likelihood of customer churn based on behavioral signals.

**Risk Factors Tracked:**
- Days since last purchase vs expected reorder timing
- Declining order frequency
- Decreasing order values
- Email disengagement (Klaviyo)
- Cart abandonment patterns
- Support ticket sentiment

**Risk Levels:**
| Score | Level | Action |
|-------|-------|--------|
| 0.0-0.3 | Low | Standard communications |
| 0.3-0.6 | Medium | Proactive engagement |
| 0.6-0.8 | High | Retention offer |
| 0.8-1.0 | Critical | Aggressive win-back |

### 3. Customer Health Scoring
Aggregate health score combining multiple signals.

```typescript
interface CustomerHealth {
  email: string;
  business: string;

  // RFM Components
  recency_score: number;      // 1-5
  frequency_score: number;    // 1-5
  monetary_score: number;     // 1-5
  rfm_segment: string;        // 'Champion', 'At Risk', etc.

  // Behavioral
  days_since_last_order: number;
  expected_reorder_days: number;
  reorder_overdue_ratio: number;

  // Engagement
  email_engagement_score: number;
  last_email_open_days: number | null;
  last_email_click_days: number | null;

  // Predictions
  churn_probability: number;  // 0-1
  predicted_ltv: number;
  intervention_urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';

  // Recommendations
  recommended_action: string;
  recommended_offer: string | null;
}
```

### 4. Cohort Analysis
Track customer cohorts by acquisition period.

**Metrics per Cohort:**
- Retention rate at 30/60/90/180/365 days
- Average orders per customer
- Average LTV
- Churn rate by period
- Re-engagement success rate

### 5. Intervention Recommendations
Automated suggestions for at-risk customers.

**Intervention Types:**
| Risk Level | Teelixir | Elevate | BOO | RHF |
|------------|----------|---------|-----|-----|
| Medium | Educational email | Account check-in | Related products | Seasonal reminder |
| High | 15% anniversary offer | Extended trial | Bundle discount | Free delivery |
| Critical | 40% winback | Personal call | 25% site-wide | VIP offer |

---

## Data Sources

### Teelixir (Master Supabase)

```sql
-- Primary tables
tlx_shopify_orders         -- 30,661 orders, 3-year history
tlx_shopify_line_items     -- 62,150 line items
tlx_reorder_timing         -- Product reorder patterns
tlx_klaviyo_unengaged      -- Unengaged customer pool
tlx_winback_emails         -- Winback campaign tracking
tlx_anniversary_discounts  -- Anniversary campaign tracking
```

**Key Fields:**
- `customer_order_sequence` - Order number for customer
- `days_since_previous_order` - Gap between orders
- `is_first_order` - First-time buyer flag

### Elevate Wholesale (Master Supabase)

```sql
-- Primary tables
trial_customers            -- B2B trial accounts
customer_activity_log      -- All customer events
email_queue               -- Scheduled emails
integration_sync_log       -- API activity
```

**Key Fields:**
- `trial_status` - pending/active/logged_in/converted/expired/deactivated
- `login_count` - Engagement metric
- `order_count` - Purchase activity
- `total_order_value` - Monetary value

### BOO (BOO Supabase)

```sql
-- Primary tables
ecommerce_products         -- Product catalog
bc_orders                 -- Order history
automation_logs           -- Job execution logs
```

### RHF (Master Supabase)

```sql
-- Primary tables
wc_customers              -- Customer profiles
wc_orders                 -- Order history
wc_order_line_items       -- Purchase details
```

---

## Scripts

### churn-scorer.ts
Calculate churn risk scores for all customers.

```bash
# Score all Teelixir customers
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --business teelixir

# Score specific customer
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --email customer@example.com

# Score high-risk only
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --min-risk 0.6
```

### rfm-segmentation.ts
Generate RFM segments for customer base.

```bash
# Full RFM analysis
npx tsx .claude/skills/customer-churn-predictor/scripts/rfm-segmentation.ts --business teelixir

# Export segments to CSV
npx tsx .claude/skills/customer-churn-predictor/scripts/rfm-segmentation.ts --export
```

### cohort-analysis.ts
Analyze customer cohorts by acquisition period.

```bash
# Monthly cohort analysis
npx tsx .claude/skills/customer-churn-predictor/scripts/cohort-analysis.ts --period monthly

# Specific cohort deep-dive
npx tsx .claude/skills/customer-churn-predictor/scripts/cohort-analysis.ts --cohort 2024-06
```

### intervention-recommender.ts
Generate intervention recommendations for at-risk customers.

```bash
# Get today's intervention list
npx tsx .claude/skills/customer-churn-predictor/scripts/intervention-recommender.ts

# Generate for specific business
npx tsx .claude/skills/customer-churn-predictor/scripts/intervention-recommender.ts --business elevate
```

---

## Database Views

### v_customer_rfm_scores
Pre-calculated RFM scores by customer.

```sql
CREATE OR REPLACE VIEW v_customer_rfm_scores AS
WITH customer_metrics AS (
  SELECT
    customer_email AS email,
    'teelixir' AS business,
    MAX(processed_at) AS last_order,
    COUNT(*) AS order_count,
    SUM(total_price) AS total_spent,
    AVG(total_price) AS avg_order_value
  FROM tlx_shopify_orders
  WHERE financial_status IN ('paid', 'partially_paid')
  GROUP BY customer_email
)
SELECT
  email,
  business,
  last_order,
  order_count,
  total_spent,
  avg_order_value,
  EXTRACT(DAYS FROM now() - last_order)::int AS days_since_order,
  NTILE(5) OVER (ORDER BY last_order) AS r_score,
  NTILE(5) OVER (ORDER BY order_count) AS f_score,
  NTILE(5) OVER (ORDER BY total_spent) AS m_score
FROM customer_metrics;
```

### v_customer_churn_risk
Real-time churn risk assessment.

```sql
CREATE OR REPLACE VIEW v_customer_churn_risk AS
SELECT
  rfm.email,
  rfm.business,
  rfm.r_score,
  rfm.f_score,
  rfm.m_score,
  rfm.days_since_order,
  COALESCE(rt.avg_days_to_reorder, 60) AS expected_reorder_days,
  CASE
    WHEN rfm.days_since_order > COALESCE(rt.avg_days_to_reorder, 60) * 2 THEN 0.9
    WHEN rfm.days_since_order > COALESCE(rt.avg_days_to_reorder, 60) * 1.5 THEN 0.7
    WHEN rfm.days_since_order > COALESCE(rt.avg_days_to_reorder, 60) THEN 0.5
    WHEN rfm.r_score <= 2 THEN 0.3
    ELSE 0.1
  END AS churn_probability,
  CASE
    WHEN rfm.r_score >= 4 AND rfm.f_score >= 4 THEN 'Champion'
    WHEN rfm.r_score >= 3 AND rfm.f_score >= 3 THEN 'Loyal'
    WHEN rfm.r_score >= 4 AND rfm.f_score <= 2 THEN 'Recent'
    WHEN rfm.r_score <= 2 AND rfm.f_score >= 4 THEN 'At Risk'
    WHEN rfm.r_score <= 2 AND rfm.f_score <= 2 THEN 'Hibernating'
    ELSE 'Promising'
  END AS rfm_segment
FROM v_customer_rfm_scores rfm
LEFT JOIN tlx_reorder_timing rt ON rt.product_type = 'global';
```

### v_elevate_trial_health
Trial customer health for B2B.

```sql
CREATE OR REPLACE VIEW v_elevate_trial_health AS
SELECT
  email,
  trial_status,
  login_count,
  order_count,
  total_order_value,
  EXTRACT(DAYS FROM now() - trial_start_date)::int AS days_in_trial,
  EXTRACT(DAYS FROM trial_end_date - now())::int AS days_remaining,
  CASE
    WHEN trial_status = 'converted' THEN 0.0
    WHEN order_count >= 3 THEN 0.1
    WHEN order_count >= 1 AND login_count >= 5 THEN 0.2
    WHEN login_count >= 3 THEN 0.4
    WHEN login_count >= 1 THEN 0.6
    ELSE 0.8
  END AS churn_probability,
  CASE
    WHEN order_count >= 3 THEN 'High Intent'
    WHEN order_count >= 1 THEN 'Engaged'
    WHEN login_count >= 3 THEN 'Exploring'
    WHEN login_count >= 1 THEN 'Dormant'
    ELSE 'Inactive'
  END AS engagement_segment
FROM trial_customers
WHERE trial_status NOT IN ('deactivated');
```

---

## Churn Prediction Model

### Input Features

| Feature | Source | Weight |
|---------|--------|--------|
| Days since last order | Orders | 0.25 |
| Reorder overdue ratio | Timing | 0.20 |
| Order frequency trend | Orders | 0.15 |
| Email engagement | Klaviyo | 0.15 |
| Average order value trend | Orders | 0.10 |
| Support interactions | Tickets | 0.10 |
| Product diversity | Line items | 0.05 |

### Calculation Formula

```typescript
function calculateChurnProbability(customer: CustomerData): number {
  const weights = {
    recencyRisk: 0.25,
    overdueRatio: 0.20,
    frequencyDecline: 0.15,
    emailDisengagement: 0.15,
    aovDecline: 0.10,
    supportNegative: 0.10,
    lowDiversity: 0.05
  };

  // Recency risk (0-1)
  const expectedDays = customer.expectedReorderDays || 60;
  const recencyRisk = Math.min(1, customer.daysSinceOrder / (expectedDays * 2));

  // Overdue ratio
  const overdueRatio = Math.max(0, (customer.daysSinceOrder - expectedDays) / expectedDays);

  // Frequency decline (comparing last 90 days to previous 90 days)
  const frequencyDecline = customer.recentOrderRate < customer.previousOrderRate ?
    (customer.previousOrderRate - customer.recentOrderRate) / customer.previousOrderRate : 0;

  // Email disengagement (days since open/click)
  const emailDisengagement = customer.daysSinceEmailEngagement > 30 ?
    Math.min(1, customer.daysSinceEmailEngagement / 90) : 0;

  // AOV decline
  const aovDecline = customer.recentAOV < customer.historicalAOV * 0.8 ? 0.5 : 0;

  // Support sentiment (if available)
  const supportNegative = customer.negativeTickets > 0 ? 0.5 : 0;

  // Product diversity (single product buyers more likely to churn)
  const lowDiversity = customer.uniqueProducts <= 1 ? 0.3 : 0;

  return (
    recencyRisk * weights.recencyRisk +
    Math.min(1, overdueRatio) * weights.overdueRatio +
    frequencyDecline * weights.frequencyDecline +
    emailDisengagement * weights.emailDisengagement +
    aovDecline * weights.aovDecline +
    supportNegative * weights.supportNegative +
    lowDiversity * weights.lowDiversity
  );
}
```

---

## Intervention Strategy

### Automated Triggers

```typescript
const interventionRules = {
  teelixir: [
    { riskMin: 0.8, action: 'winback_40', offer: 'MISSYOU40' },
    { riskMin: 0.6, action: 'anniversary_15', offer: 'ANNIV-XXX' },
    { riskMin: 0.4, action: 'educational_email', offer: null }
  ],
  elevate: [
    { riskMin: 0.8, action: 'personal_outreach', offer: 'extended_trial' },
    { riskMin: 0.6, action: 'reminder_email', offer: 'free_shipping' },
    { riskMin: 0.4, action: 'feature_highlight', offer: null }
  ],
  boo: [
    { riskMin: 0.8, action: 'winback_25', offer: 'COMEBACK25' },
    { riskMin: 0.6, action: 'related_products', offer: 'BUNDLE10' },
    { riskMin: 0.4, action: 'newsletter_feature', offer: null }
  ],
  rhf: [
    { riskMin: 0.8, action: 'vip_offer', offer: 'VIP20' },
    { riskMin: 0.6, action: 'delivery_reminder', offer: 'FREEDEL' },
    { riskMin: 0.4, action: 'seasonal_promo', offer: null }
  ]
};
```

---

## Environment Variables

```env
# Master Supabase
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# BOO Supabase
BOO_SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
BOO_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Klaviyo (for engagement data)
TEELIXIR_KLAVIYO_API_KEY=pk_xxx

# Shopify (for real-time order checks)
TEELIXIR_SHOPIFY_DOMAIN=teelixir.myshopify.com
TEELIXIR_SHOPIFY_ACCESS_TOKEN=shpat_xxx
ELEVATE_SHOPIFY_DOMAIN=elevate-wholesale.myshopify.com
ELEVATE_SHOPIFY_ACCESS_TOKEN=shpat_xxx
```

---

## Integration Points

### Existing Automations
- **Anniversary emails**: Uses reorder timing prediction
- **Winback emails**: Targets unengaged segment
- **Trial reminders**: Based on trial status progression

### Dashboard Widgets
- Customer health overview
- At-risk customer alerts
- Cohort retention charts
- Intervention effectiveness

### Alerting
- Daily high-risk customer report
- Weekly churn trend analysis
- Monthly cohort performance
