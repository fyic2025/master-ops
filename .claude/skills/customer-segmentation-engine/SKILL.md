---
name: customer-segmentation-engine
description: Customer segmentation using RFM analysis, behavioral data, and lifecycle stages. Creates dynamic segments for targeted marketing, syncs to Klaviyo, and provides segment recommendations for campaigns.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Customer Segmentation Engine Skill

Build and manage customer segments for targeted marketing across all businesses.

## When to Activate This Skill

Activate this skill when the user mentions:
- "customer segment" or "segment customers"
- "RFM analysis" or "RFM score"
- "customer cohort" or "audience segment"
- "target audience" or "customer targeting"
- "high-value customers" or "at-risk customers"
- "Klaviyo segment" or "sync segment"

## Core Capabilities

### 1. RFM Segmentation
- Recency scoring (when did they last buy?)
- Frequency scoring (how often do they buy?)
- Monetary scoring (how much do they spend?)
- Automatic segment assignment

### 2. Behavioral Segments
- Purchase behavior patterns
- Engagement levels
- Product preferences
- Channel preferences

### 3. Lifecycle Stages
- New customers
- Active customers
- At-risk customers
- Churned customers

### 4. Klaviyo Sync
- Create segments in Klaviyo
- Two-way sync
- Automated refresh

## RFM Scoring

### Score Definitions (1-5 scale)

#### Recency Score
| Score | Days Since Purchase |
|-------|-------------------|
| 5 | 0-30 days |
| 4 | 31-60 days |
| 3 | 61-90 days |
| 2 | 91-180 days |
| 1 | 180+ days |

#### Frequency Score
| Score | Orders Per Year |
|-------|-----------------|
| 5 | 12+ orders |
| 4 | 8-11 orders |
| 3 | 4-7 orders |
| 2 | 2-3 orders |
| 1 | 1 order |

#### Monetary Score
| Score | Total Spend |
|-------|-------------|
| 5 | $500+ |
| 4 | $300-499 |
| 3 | $150-299 |
| 2 | $50-149 |
| 1 | <$50 |

### RFM Segments

| Segment | RFM Range | Description | Action |
|---------|-----------|-------------|--------|
| Champions | 555, 554, 545, 544 | Best customers | Reward, upsell |
| Loyal Customers | 443-454 | Consistent buyers | Loyalty programs |
| Potential Loyalist | 532-543 | Recent with potential | Nurture relationship |
| New Customers | 511-521 | Just started | Welcome series |
| Promising | 412-432 | Recent but low spend | Encourage repeat |
| Need Attention | 332-343 | Above avg, slipping | Re-engage |
| About to Sleep | 221-232 | Low activity | Win-back campaign |
| At Risk | 244-255 | Spent big, gone quiet | Urgent re-engage |
| Can't Lose Them | 155-255 | Highest value at risk | Priority outreach |
| Hibernating | 211-222 | Very low activity | Last chance offer |
| Lost | 111-122 | Inactive | Archive or remove |

## Database Schema

### customer_segments table
```sql
SELECT segment_name, rules, member_count, klaviyo_segment_id
FROM customer_segments
WHERE business_slug = 'teelixir'
  AND is_active = TRUE;
```

### customer_rfm_scores table
```sql
SELECT
  customer_email,
  recency_score,
  frequency_score,
  monetary_score,
  rfm_segment,
  total_spent,
  last_order_date
FROM customer_rfm_scores
WHERE business_slug = 'teelixir'
  AND rfm_segment = 'Champions'
ORDER BY total_spent DESC;
```

### Segment Distribution
```sql
SELECT
  rfm_segment,
  COUNT(*) as customer_count,
  ROUND(AVG(total_spent), 2) as avg_spend,
  ROUND(AVG(total_orders), 1) as avg_orders
FROM customer_rfm_scores
WHERE business_slug = 'teelixir'
GROUP BY rfm_segment
ORDER BY avg_spend DESC;
```

## API Reference

### Compute RFM Scores
```typescript
async function computeRfmScores(businessSlug: BusinessSlug): Promise<{
  customersScored: number;
  segmentDistribution: Record<string, number>;
}>
```

### Create Custom Segment
```typescript
async function createSegment(params: {
  businessSlug: BusinessSlug;
  segmentName: string;
  rules: SegmentRule[];
  syncToKlaviyo?: boolean;
}): Promise<Segment>
```

### Get Segment Members
```typescript
async function getSegmentMembers(
  segmentId: string,
  options?: { limit?: number; offset?: number }
): Promise<SegmentMember[]>
```

### Sync to Klaviyo
```typescript
async function syncToKlaviyo(segmentId: string): Promise<{
  klaviyoSegmentId: string;
  membersSynced: number;
}>
```

## Segment Rules Syntax

```json
{
  "rules": [
    {
      "field": "rfm_segment",
      "operator": "in",
      "value": ["Champions", "Loyal Customers"]
    },
    {
      "field": "total_spent",
      "operator": "gte",
      "value": 200
    },
    {
      "field": "last_order_date",
      "operator": "gte",
      "value": "90_days_ago"
    }
  ],
  "logic": "AND"
}
```

## Pre-Built Segments

### By Business

**Teelixir Segments:**
- Anniversary Candidates: First-order customers, 365 days ago
- Winback Eligible: 90+ days since last order, >$50 LTV
- VIP Customers: Champions + Loyal, $500+ LTV
- Subscription Candidates: Purchased same product 3+ times

**BOO Segments:**
- High-Value Organics: Champions, $300+ LTV
- Category Enthusiasts: 5+ orders in same category
- Multi-Category: Purchased from 3+ categories

## Integration Points

- **email-campaign-manager**: Provides segments for campaigns
- **marketing-analytics-reporter**: Segment performance metrics
- **klaviyo-expert**: Two-way segment sync
- **customer-churn-predictor**: Churn risk scoring

## Quick Commands

```bash
# Compute RFM scores
npx tsx scripts/rfm-scorer.ts compute teelixir

# List segments
npx tsx scripts/segment-calculator.ts list teelixir

# Get segment members
npx tsx scripts/segment-calculator.ts members teelixir "Champions"

# Sync segment to Klaviyo
npx tsx scripts/segment-calculator.ts sync teelixir "VIP Customers"
```
