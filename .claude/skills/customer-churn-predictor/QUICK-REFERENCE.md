# Customer Churn Predictor Quick Reference

## Scripts

```bash
# Churn Scoring
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --business teelixir
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --min-risk 0.6
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --email user@example.com

# RFM Segmentation
npx tsx .claude/skills/customer-churn-predictor/scripts/rfm-segmentation.ts
npx tsx .claude/skills/customer-churn-predictor/scripts/rfm-segmentation.ts --export

# Cohort Analysis
npx tsx .claude/skills/customer-churn-predictor/scripts/cohort-analysis.ts
npx tsx .claude/skills/customer-churn-predictor/scripts/cohort-analysis.ts --period weekly

# Interventions
npx tsx .claude/skills/customer-churn-predictor/scripts/intervention-recommender.ts
npx tsx .claude/skills/customer-churn-predictor/scripts/intervention-recommender.ts --export
```

---

## Risk Levels

| Probability | Level | Action |
|-------------|-------|--------|
| 0.8 - 1.0 | Critical | Immediate outreach |
| 0.6 - 0.8 | High | Discount offer |
| 0.3 - 0.6 | Medium | Nurture email |
| 0.0 - 0.3 | Low | Standard comms |

---

## RFM Scores

| Score | Recency | Frequency | Monetary |
|-------|---------|-----------|----------|
| 5 | <30 days | 5+ orders | $500+ |
| 4 | 30-60 days | 4 orders | $300-500 |
| 3 | 60-90 days | 3 orders | $150-300 |
| 2 | 90-180 days | 2 orders | $50-150 |
| 1 | >180 days | 1 order | <$50 |

---

## Key Segments

| Segment | RFM Pattern | Action |
|---------|-------------|--------|
| Champions | R5F5M5 | VIP rewards |
| At Risk | R1-2F4-5 | Urgent winback |
| Hibernating | R1-2F1-2 | Strong offer |
| New | R5F1 | Onboarding |

---

## Intervention Offers

**Teelixir:**
- Critical: MISSYOU40 (40% off)
- High: ANNIV-15 (15% off)

**Elevate:**
- Critical: Extended trial
- High: Free shipping

**BOO:**
- Critical: COMEBACK25 (25% off)
- High: BUNDLE10 (10% bundles)

**RHF:**
- Critical: VIP20 (20% off)
- High: FREEDEL (free delivery)

---

## SQL Queries

```sql
-- High-risk customers
SELECT email, churn_probability, days_since_order
FROM v_customer_churn_risk
WHERE churn_probability >= 0.6
ORDER BY churn_probability DESC;

-- RFM distribution
SELECT rfm_segment, COUNT(*) as count
FROM v_customer_rfm_scores
GROUP BY rfm_segment
ORDER BY count DESC;

-- Cohort retention
SELECT cohort, customers,
  retention_1m, retention_3m, retention_12m
FROM v_cohort_metrics
ORDER BY cohort DESC;
```

---

## Database Tables

| Table | Business | Purpose |
|-------|----------|---------|
| tlx_shopify_orders | Teelixir | Order history |
| tlx_klaviyo_unengaged | Teelixir | Unengaged pool |
| trial_customers | Elevate | Trial accounts |
| customer_activity_log | Elevate | Activity tracking |
| wc_customers | RHF | Customer profiles |
| bc_orders | BOO | Order history |

---

## Churn Probability Formula

```
Churn =
  (Recency Risk × 0.25) +
  (Overdue Ratio × 0.20) +
  (Frequency Decline × 0.15) +
  (Email Disengagement × 0.15) +
  (AOV Decline × 0.10) +
  (Low Diversity × 0.10) +
  (Low Frequency × 0.05)
```

---

## Files

```
.claude/skills/customer-churn-predictor/
├── SKILL.md
├── QUICK-REFERENCE.md
├── scripts/
│   ├── churn-scorer.ts
│   ├── rfm-segmentation.ts
│   ├── cohort-analysis.ts
│   └── intervention-recommender.ts
├── context/
│   └── CUSTOMER-DATA-SOURCES.md
└── playbooks/
    └── RETENTION-PLAYBOOK.md
```
