# Teelixir Anniversary Email System

**Created:** 2025-12-01
**Status:** Database ready, awaiting email sending script

## Overview

Data-driven anniversary email campaign targeting first-time Shopify buyers who haven't reordered. Emails are sent with unique 15% discount codes timed to arrive just before the customer's expected reorder date.

## Key Features

- **Adaptive Timing**: Email send day calculated from historical reorder patterns
- **Hierarchical Fallbacks**: Product+size → Size-only → Global timing
- **Unique Discount Codes**: Format `ANNIV-XXXXXX-XXX` (e.g., ANNIV-A1B2C3-789)
- **Monthly Learning**: Timing automatically adjusts as reorder patterns change

## Configuration

| Setting | Value |
|---------|-------|
| Discount | 15% off |
| Code Expiry | 14 days |
| Lead Time | 5 days before expected reorder |
| Daily Limit | 50 emails/day |
| Send Window | 9AM - 7PM AEST |
| Sender | Colette from Teelixir <colette@teelixir.com> |
| Min Sample Size | 15 reorders for timing data |

## Timing Data (as of 2025-12-01)

### Product + Size Specific (24 rules)

| Product | Size | Samples | Email Day | Confidence |
|---------|------|---------|-----------|------------|
| Lions Mane Pure | 100g | 79 | Day 76 | High |
| Pearl | 50g | 69 | Day 80 | High |
| Lions Mane | 100g | 68 | Day 78 | High |
| Pine Pollen | 50g | 46 | Day 48 | Medium |
| Lions Mane | 50g | 45 | Day 51 | Medium |
| Immunity | 100g | 40 | Day 61 | Medium |
| Cordyceps | 100g | 40 | Day 99 | Medium |
| Turkey Tail | 50g | 36 | Day 45 | Medium |
| Cordyceps | 50g | 35 | Day 65 | Medium |
| Reishi | 50g | 35 | Day 56 | Medium |
| Reishi | 100g | 34 | Day 80 | Medium |
| Lions Mane | 250g | 30 | Day 84 | Medium |
| Ashwagandha | 50g | 29 | Day 40 | Medium |
| Bee Pollen | 100g | 28 | Day 38 | Medium |
| Chaga | 100g | 28 | Day 98 | Medium |
| Ashwagandha | 100g | 28 | Day 72 | Medium |
| Tremella | 50g | 25 | Day 65 | Medium |
| Schizandra | 50g | 23 | Day 52 | Medium |
| Chaga | 50g | 23 | Day 41 | Medium |
| Immunity | 50g | 23 | Day 66 | Medium |
| Pearl | 100g | 22 | Day 54 | Medium |
| Maitake | 50g | 21 | Day 36 | Medium |
| Latte - Cacao Rose | 100g | 18 | Day 54 | Low |
| Resveratrol | 50g | 15 | Day 47 | Low |

### Size-Only Fallbacks (4 rules)

| Size | Samples | Email Day | Confidence |
|------|---------|-----------|------------|
| 50g | 441 | Day 51 | High |
| 100g | 416 | Day 76 | High |
| 250g | 110 | Day 84 | High |
| 500g | 22 | Day 54 | Medium |

### Global Fallback

| Samples | Email Day | Confidence |
|---------|-----------|------------|
| 989 | Day 65 | Low |

## Database Schema

### Tables

1. **tlx_anniversary_discounts** - Tracks generated discount codes and conversions
2. **tlx_shopify_orders** - Synced Shopify order data (30,661 orders)
3. **tlx_shopify_line_items** - Order line items with product classification (62,150 items)
4. **tlx_reorder_timing** - Product/size timing lookup table
5. **tlx_automation_config** - Campaign configuration (automation_type: 'anniversary_15')

### Views

1. **tlx_anniversary_stats** - Campaign performance metrics
2. **v_tlx_anniversary_candidates** - Customers due for anniversary email
3. **v_tlx_first_order_no_reorder** - First-time buyers without reorder
4. **v_tlx_reorder_timing_analysis** - Reorder pattern analysis

### Functions

1. **expire_anniversary_codes()** - Marks expired codes
2. **get_anniversary_email_day(product_type, product_size)** - Returns email send day

## Candidate Pool

As of 2025-12-01:
- **12,405 customers** eligible for anniversary emails
- 7 customers at 30-60 days
- 6 customers at 60-90 days
- 6 customers at 90-120 days
- 973+ customers at 120+ days (dormant, lower priority)

## Scripts

### Daily Operations

| Script | Schedule | Purpose |
|--------|----------|---------|
| `sync-shopify-orders.ts` | Daily 4AM AEST | Sync recent orders |
| `send-anniversary-emails.ts` | Daily 9AM AEST | Send anniversary emails (TO BE CREATED) |

### Monthly Operations

| Script | Schedule | Purpose |
|--------|----------|---------|
| `refresh-reorder-timing.ts` | 1st of month 5AM AEST | Recalculate timing from latest data |

### Analysis/Utility

| Script | Purpose |
|--------|---------|
| `analyze-reorder-timing.ts` | Full timing analysis with reporting |
| `review-anniversary-schedule.ts` | Display current timing schedule |
| `check-sample-sizes.ts` | Check sample thresholds |

## Timing Logic

```
1. Look for product_type + product_size match (e.g., "Lions Mane" + 100g)
   → If found with n >= 15: use that email_send_day

2. Fall back to size-only match (e.g., any product + 100g)
   → If found with n >= 15: use that email_send_day

3. Fall back to global (any product + any size)
   → Use global email_send_day (Day 65)
```

## API Endpoints (TO BE CREATED)

```
POST /api/automations/anniversary/generate-code
- Generates unique Shopify discount code
- Records in tlx_anniversary_discounts

POST /api/automations/anniversary/send-email
- Sends email via configured email provider
- Updates status to 'sent'

GET /api/automations/anniversary/stats
- Returns campaign performance metrics
```

## Next Steps

1. [ ] Create `send-anniversary-emails.ts` script
2. [ ] Create discount code generation API route
3. [ ] Create email template (Colette voice)
4. [ ] Schedule daily job in n8n
5. [ ] Enable automation (`enabled: true` in config)
6. [ ] Monitor first week of sends
7. [ ] Schedule monthly timing refresh in n8n

## Data Sync Details

- **Historical Sync**: 3 years (1095 days)
- **Orders Synced**: 30,661
- **Line Items**: 62,150
- **Sync Duration**: ~92 minutes (full sync)
- **Daily Sync**: Last 7 days (incremental)

## Exclusions

Customers excluded from anniversary emails:
1. Already received anniversary email (in `tlx_anniversary_discounts`)
2. Currently in winback campaign (in `tlx_winback_emails`)
3. Unsubscribed from marketing (via Klaviyo integration - future)
