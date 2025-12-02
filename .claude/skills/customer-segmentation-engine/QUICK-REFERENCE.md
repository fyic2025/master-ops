# Customer Segmentation Engine - Quick Reference

## RFM Scoring

### Score Definitions
| Score | Recency | Frequency | Monetary |
|-------|---------|-----------|----------|
| 5 | 0-30 days | 10+ orders | $500+ |
| 4 | 31-60 days | 5-9 orders | $250-499 |
| 3 | 61-90 days | 3-4 orders | $100-249 |
| 2 | 91-180 days | 2 orders | $50-99 |
| 1 | 180+ days | 1 order | <$50 |

### Segment Mapping
| Segment | R | F | M | Description |
|---------|---|---|---|-------------|
| Champions | 5 | 5 | 5 | Best customers |
| Loyal | 4-5 | 4-5 | 4-5 | High value, regular |
| Potential | 4-5 | 1-2 | 1-3 | Recent, low frequency |
| At Risk | 2-3 | 3-5 | 3-5 | Were good, slipping |
| Hibernating | 1-2 | 1-2 | 1-3 | Long time no purchase |
| Lost | 1 | 1-2 | 1-2 | Very old, low value |

## Quick Queries

### Get Customer Segments
```sql
SELECT
  segment_name,
  COUNT(*) as customer_count,
  AVG(total_spent) as avg_ltv,
  AVG(order_count) as avg_orders
FROM customer_rfm_scores
WHERE business_slug = 'teelixir'
GROUP BY segment_name
ORDER BY avg_ltv DESC;
```

### Find Champions
```sql
SELECT email, total_spent, order_count, last_order_date
FROM customer_rfm_scores
WHERE business_slug = 'teelixir'
  AND segment_name = 'Champion'
ORDER BY total_spent DESC
LIMIT 100;
```

### At-Risk Customers
```sql
SELECT email, last_order_date, total_spent
FROM customer_rfm_scores
WHERE business_slug = 'teelixir'
  AND segment_name = 'At Risk'
  AND last_order_date < CURRENT_DATE - INTERVAL '60 days'
ORDER BY total_spent DESC;
```

## Segment Actions

| Segment | Email Campaign | Offer |
|---------|---------------|-------|
| Champions | VIP early access | Exclusive new products |
| Loyal | Loyalty rewards | Free shipping |
| Potential | Welcome series | 10% first order |
| At Risk | Win-back | 20% discount |
| Hibernating | Re-engagement | 30% + free gift |
| Lost | Hail Mary | 40% last chance |

## CLI Commands

```bash
# Calculate RFM scores
npx tsx scripts/segment-calculator.ts calculate teelixir

# Get segment counts
npx tsx scripts/segment-calculator.ts summary teelixir

# Export segment for campaign
npx tsx scripts/segment-calculator.ts export teelixir "At Risk"
```

## Predictive Metrics

### Churn Risk Score
```sql
SELECT
  email,
  segment_name,
  CASE
    WHEN last_order_date < CURRENT_DATE - INTERVAL '90 days' THEN 'High'
    WHEN last_order_date < CURRENT_DATE - INTERVAL '60 days' THEN 'Medium'
    ELSE 'Low'
  END as churn_risk
FROM customer_rfm_scores
WHERE business_slug = 'teelixir';
```

### Customer Lifetime Value
```sql
SELECT
  AVG(total_spent) as avg_ltv,
  AVG(order_count) as avg_orders,
  AVG(total_spent / NULLIF(order_count, 0)) as avg_order_value
FROM customer_rfm_scores
WHERE business_slug = 'teelixir'
  AND segment_name = 'Champion';
```
