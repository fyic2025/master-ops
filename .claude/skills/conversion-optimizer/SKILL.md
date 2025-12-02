---
name: conversion-optimizer
description: A/B testing and conversion rate optimization for email campaigns, landing pages, and marketing content. Analyzes performance data, calculates statistical significance, identifies winners, and provides optimization recommendations.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Conversion Optimizer Skill

Optimize marketing conversion rates through testing and data analysis.

## When to Activate This Skill

Activate this skill when the user mentions:
- "A/B test" or "split test"
- "conversion rate" or "optimize conversion"
- "test winner" or "winning variant"
- "statistical significance"
- "optimize campaign"
- "improve performance"
- "test analysis"

## Core Capabilities

### 1. A/B Test Setup
- Create test variants
- Define success metrics
- Set traffic allocation
- Configure test duration

### 2. Statistical Analysis
- Calculate statistical significance
- Determine sample size requirements
- Identify winning variants
- Confidence interval calculation

### 3. Performance Analysis
- Conversion funnel analysis
- Open/click/conversion tracking
- Revenue attribution
- Cohort analysis

### 4. Optimization Recommendations
- Data-driven suggestions
- Best practice guidance
- Historical pattern analysis
- Benchmarking

## Test Types

### Subject Line Tests
```typescript
{
  testType: 'subject_line',
  variants: [
    { name: 'A', subject: 'Save 15% on your favorite products' },
    { name: 'B', subject: '🎁 Your exclusive 15% discount inside' }
  ],
  metric: 'open_rate',
  minimumSampleSize: 1000
}
```

### CTA Tests
```typescript
{
  testType: 'cta',
  variants: [
    { name: 'A', cta: 'Shop Now' },
    { name: 'B', cta: 'Claim My Discount' }
  ],
  metric: 'click_rate',
  minimumSampleSize: 500
}
```

### Template Tests
```typescript
{
  testType: 'template',
  variants: [
    { name: 'A', templateId: 'template-a-uuid' },
    { name: 'B', templateId: 'template-b-uuid' }
  ],
  metric: 'conversion_rate',
  minimumSampleSize: 2000
}
```

## Statistical Significance Calculator

### Minimum Sample Size Formula
```typescript
function calculateSampleSize(params: {
  baselineConversion: number;  // Current conversion rate (0.03 = 3%)
  minimumDetectableEffect: number;  // MDE (0.2 = 20% improvement)
  significanceLevel: number;  // 0.05 = 95% confidence
  power: number;  // 0.8 = 80% power
}): number {
  // Returns required sample size per variant
}
```

### Significance Test
```typescript
function isStatisticallySignificant(params: {
  controlConversions: number;
  controlTotal: number;
  variantConversions: number;
  variantTotal: number;
  significanceLevel?: number;  // Default 0.05
}): {
  isSignificant: boolean;
  pValue: number;
  confidenceInterval: [number, number];
  improvement: number;  // Percentage improvement
}
```

## Database Views

### v_unified_conversions
```sql
SELECT campaign_type, business_slug, event_date, converted, revenue
FROM v_unified_conversions
WHERE business_slug = 'teelixir'
  AND event_date >= NOW() - INTERVAL '30 days';
```

### Conversion Funnel
```sql
WITH funnel AS (
  SELECT
    COUNT(*) as sent,
    SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opened,
    SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicked,
    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
  FROM tlx_winback_emails
  WHERE sent_at >= NOW() - INTERVAL '30 days'
)
SELECT
  sent,
  opened,
  clicked,
  converted,
  ROUND(100.0 * opened / NULLIF(sent, 0), 2) as open_rate,
  ROUND(100.0 * clicked / NULLIF(opened, 0), 2) as click_rate,
  ROUND(100.0 * converted / NULLIF(clicked, 0), 2) as conversion_rate
FROM funnel;
```

## Optimization Recommendations

### By Open Rate
| Current | Action |
|---------|--------|
| <15% | Test subject lines, check deliverability |
| 15-25% | Test send times, preview text |
| 25-35% | Good performance, test incremental improvements |
| >35% | Excellent, maintain and monitor |

### By Click Rate
| Current | Action |
|---------|--------|
| <2% | Redesign CTA, improve offer clarity |
| 2-5% | Test CTA copy, button design |
| 5-10% | Good performance, test layout |
| >10% | Excellent, maintain and monitor |

### By Conversion Rate
| Current | Action |
|---------|--------|
| <1% | Review landing page, offer value |
| 1-3% | Test urgency, social proof |
| 3-5% | Good performance, test personalization |
| >5% | Excellent, maintain and monitor |

## API Reference

### Create A/B Test
```typescript
async function createABTest(params: {
  businessSlug: BusinessSlug;
  testName: string;
  testType: 'subject_line' | 'cta' | 'template' | 'send_time';
  variants: Variant[];
  metric: 'open_rate' | 'click_rate' | 'conversion_rate';
  trafficAllocation: number[];  // [50, 50] for even split
}): Promise<ABTest>
```

### Analyze Test Results
```typescript
async function analyzeTest(testId: string): Promise<{
  winner: string | null;
  isSignificant: boolean;
  variants: VariantResult[];
  recommendation: string;
}>
```

### Get Optimization Suggestions
```typescript
async function getSuggestions(params: {
  businessSlug: BusinessSlug;
  campaignType: string;
}): Promise<Suggestion[]>
```

## Integration Points

- **email-template-designer**: Template variants for testing
- **marketing-copywriter**: Copy variants for testing
- **marketing-analytics-reporter**: Performance data source
- **email-campaign-manager**: Test execution

## Benchmarks

### Industry Averages (E-commerce)
| Metric | Average | Good | Excellent |
|--------|---------|------|-----------|
| Open Rate | 18% | 25% | 35%+ |
| Click Rate | 2.5% | 5% | 8%+ |
| Conversion Rate | 2% | 3.5% | 5%+ |

### Our Targets (from plan)
| Metric | Current | Target |
|--------|---------|--------|
| Open Rate | ~20% | 35%+ |
| Click Rate | ~3% | 8%+ |
| Conversion Rate | ~2% | 5%+ |
