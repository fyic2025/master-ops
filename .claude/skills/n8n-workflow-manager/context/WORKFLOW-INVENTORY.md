# Workflow Inventory - n8n Workflow Manager

> Complete catalog of all n8n workflows across all 4 businesses.

---

## Inventory Overview

| Business | Active Workflows | Templates | Status |
|----------|-----------------|-----------|--------|
| BOO | 50+ | 3 | Active |
| Teelixir | 60+ | 4 | Active |
| Elevate | 40+ | 2 | Active |
| RHF | 10+ | 2 | Pending |
| Shared | 40+ | 5 | Active |

**Total Workflows:** 200+ active
**n8n Instance:** `automation.growthcohq.com`

> **Note:** This inventory shows key documented workflows from local templates.
> The live n8n instance at `automation.growthcohq.com` contains 200+ workflows.
> Run `npm run list-n8n-workflows` or query the API to get the complete list.

### Query Live Inventory
```bash
# List all workflows
npx tsx list-n8n-workflows.ts

# Or via curl
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data | length'
```

---

## 1. BOO - BUY ORGANICS ONLINE

### 1.1 BigCommerce Product Sync
```
ID:          boo-bc-product-sync
Trigger:     Cron (daily 3:00 AM AEST)
Status:      Active
Complexity:  Moderate (8 nodes)
```

**Purpose:** Sync all BigCommerce products to Supabase `bc_products` table

**Flow:**
```
Schedule Trigger (3 AM)
    ↓
Get Products from BC API (paginated)
    ↓
Loop Over Pages
    ↓
Transform Data
    ↓
Upsert to Supabase
    ↓
Log Success/Failure
```

**Key Nodes:**
- HTTP Request: BC API with OAuth
- Code: Transform BC → Supabase format
- Supabase: Upsert with ON CONFLICT
- Slack: Error notifications

**Dependencies:**
- BigCommerce API credentials
- Supabase credentials
- 11,357 products to sync

---

### 1.2 Checkout Error Email Sender
```
ID:          boo-checkout-error-email
Trigger:     Webhook
Status:      Active
Complexity:  Simple (5 nodes)
Template:    infra/n8n-workflows/templates/checkout-error-email-sender.json
```

**Purpose:** Send email alerts when checkout errors occur

**Flow:**
```
Webhook (POST /checkout-error)
    ↓
Parse Error Data
    ↓
Format Email Template
    ↓
Send via Gmail/SMTP
    ↓
Log to Supabase
```

**Webhook URL:** `https://n8n.growthcohq.com/webhook/checkout-error`

---

### 1.3 Supplier Stock Sync
```
ID:          boo-supplier-sync
Trigger:     Cron (every 2 hours)
Status:      Active
Complexity:  Complex (15 nodes)
```

**Purpose:** Sync stock levels from 4 suppliers

**Flow:**
```
Schedule Trigger (every 2h)
    ↓
Parallel: Fetch from 4 suppliers
    ├── Oborne (FTP)
    ├── UHP (HTTP scrape)
    ├── Kadac (API)
    └── GlobalNature (API)
    ↓
Merge Results
    ↓
Upsert to supplier_products
    ↓
Log sync status
```

**Suppliers:**
| Supplier | Method | Products | Timeout |
|----------|--------|----------|---------|
| Oborne | FTP download | 1,823 | 60s |
| UHP | HTTP + parse | 1,102 | 30s |
| Kadac | REST API | 945 | 30s |
| GlobalNature | REST API | Variable | 30s |

---

### 1.4 GSC Issues Tracker
```
ID:          boo-gsc-tracker
Trigger:     Cron (daily 6 AM)
Status:      Active
Complexity:  Moderate (7 nodes)
```

**Purpose:** Sync Google Search Console issues to Supabase

---

### 1.5 GMC Feed Monitor
```
ID:          boo-gmc-monitor
Trigger:     Cron (daily 5 AM)
Status:      Active
Complexity:  Moderate (6 nodes)
```

**Purpose:** Monitor Google Merchant Center disapprovals

---

## 2. TEELIXIR

### 2.1 Smartlead-HubSpot Sync
```
ID:          tlx-smartlead-hubspot
Trigger:     Cron (every 30 min)
Status:      Active
Complexity:  Complex (18 nodes)
Template:    infra/n8n-workflows/templates/smartlead-hubspot-sync.json
```

**Purpose:** Sync Smartlead email engagement to HubSpot contacts

**Flow:**
```
Schedule Trigger (30 min)
    ↓
Get Recent Engagement from Smartlead API
    ↓
Loop Over Leads
    ↓
Find/Create HubSpot Contact
    ↓
Update Properties (44 custom)
    ↓
Log to smartlead_engagement
```

**HubSpot Properties Updated:**
- `last_smartlead_activity`
- `smartlead_campaign`
- `smartlead_email_status`
- `smartlead_reply_status`
- + 40 more custom properties

**Rate Limits:**
- Smartlead: 100 req/min
- HubSpot: 100 req/10s (add 200ms delay)

---

### 2.2 Unleashed Order Sync
```
ID:          tlx-unleashed-orders
Trigger:     Cron (every 15 min)
Status:      Active
Complexity:  Complex (14 nodes)
Template:    infra/n8n-workflows/templates/unleashed-order-sync.json
```

**Purpose:** Sync Unleashed sales orders to Supabase

**Flow:**
```
Schedule Trigger (15 min)
    ↓
Generate HMAC Signature (Code node)
    ↓
Get Orders from Unleashed API
    ↓
Loop Over Orders
    ↓
Extract Line Items
    ↓
Detect OOS Notes
    ↓
Upsert to tlx_distributor_orders
    ↓
Upsert to tlx_order_line_items
    ↓
Insert OOS notes if found
```

**HMAC Authentication:**
```javascript
// Query string must be URL-decoded before signing
const signature = crypto
  .createHmac('sha256', apiKey)
  .update(queryString)
  .digest('base64')
```

---

### 2.3 Unleashed Customer Sync
```
ID:          tlx-unleashed-customers
Trigger:     Cron (daily 7 AM)
Status:      Active
Complexity:  Moderate (10 nodes)
Template:    infra/n8n-workflows/templates/unleashed-customer-sync.json
```

**Purpose:** Sync Unleashed customers to `tlx_distributors`

---

### 2.4 Winback Email Trigger
```
ID:          tlx-winback-trigger
Trigger:     Cron (hourly 9AM-7PM)
Status:      Active
Complexity:  Moderate (9 nodes)
```

**Purpose:** Trigger winback email sends during business hours

**Flow:**
```
Schedule Trigger (hourly)
    ↓
Check: Is within send window? (9AM-7PM Melbourne)
    ↓
Check: Daily limit not reached?
    ↓
Get Eligible Profiles from tlx_klaviyo_unengaged
    ↓
Call Winback API endpoint
    ↓
Log to tlx_winback_emails
```

**Business Rules:**
- Send window: 9AM-7PM Melbourne time
- Daily limit: 20 emails/day
- Discount: MISSYOU40 (40% off)

---

### 2.5 Klaviyo Unengaged Sync
```
ID:          tlx-klaviyo-sync
Trigger:     Cron (weekly Monday 6 AM)
Status:      Active
Complexity:  Moderate (8 nodes)
```

**Purpose:** Refresh winback pool from Klaviyo segment

---

### 2.6 Distributor Health Check
```
ID:          tlx-distributor-health
Trigger:     Cron (weekly Friday 5 PM)
Status:      Active
Complexity:  Simple (6 nodes)
```

**Purpose:** Identify at-risk distributors (no orders 30+ days)

---

## 3. ELEVATE WHOLESALE

### 3.1 Prospecting Daily Processor
```
ID:          elv-prospecting-daily
Trigger:     Cron (6 AM AEST)
Status:      Active
Complexity:  Moderate (10 nodes)
```

**Purpose:** Process daily prospecting queue

**Flow:**
```
Schedule Trigger (6 AM)
    ↓
Get Today's Prospects from prospecting_queue
    ↓
Loop Over Prospects
    ↓
Send Email via SMTP
    ↓
Update Status to 'sent'
    ↓
Log to prospecting_emails
    ↓
Log to prospecting_run_log
```

---

### 3.2 Login Detector
```
ID:          elv-login-detector
Trigger:     Cron (7 AM AEST)
Status:      Active
Complexity:  Moderate (8 nodes)
```

**Purpose:** Detect customer logins and update activity

**Flow:**
```
Schedule Trigger (7 AM)
    ↓
Query Shopify for recent logins
    ↓
Match with trial_customers
    ↓
Update customer_activity_log
    ↓
Alert if high-value prospect logged in
```

---

### 3.3 Trial Expiration Processor
```
ID:          elv-trial-expiration
Trigger:     Cron (2 AM AEST)
Status:      Active
Complexity:  Simple (6 nodes)
```

**Purpose:** Expire trials past 30 days

**Flow:**
```
Schedule Trigger (2 AM)
    ↓
Get Expired Trials (trial_end_date < today)
    ↓
Update trial_status = 'expired'
    ↓
Deactivate Shopify discount codes
    ↓
Log expiration
```

---

### 3.4 HubSpot Contact Sync
```
ID:          elv-hubspot-sync
Trigger:     Cron (hourly)
Status:      Active
Complexity:  Moderate (9 nodes)
```

**Purpose:** Sync trial customers to HubSpot

---

## 4. RED HILL FRESH (Pending)

### 4.1 WooCommerce Product Sync (Template Ready)
```
ID:          rhf-wc-products
Trigger:     Cron (daily)
Status:      Pending deploy
Template:    Ready
```

### 4.2 WooCommerce Order Sync (Template Ready)
```
ID:          rhf-wc-orders
Trigger:     Cron (hourly)
Status:      Pending deploy
Template:    Ready
```

---

## 5. SHARED INFRASTRUCTURE

### 5.1 System Health Check
```
ID:          sys-health-check
Trigger:     Cron (every 5 min)
Status:      Active
Complexity:  Simple (5 nodes)
Template:    infra/n8n-workflows/templates/health-check-workflow.json
```

**Purpose:** Monitor all integrations health

**Flow:**
```
Schedule Trigger (5 min)
    ↓
Run Health Check Script
    ↓
IF (healthy)
    ├── true: Log success
    └── false: Send Slack alert + Log error
```

---

### 5.2 Error Monitoring
```
ID:          sys-error-monitor
Trigger:     Continuous (Supabase webhook)
Status:      Active
Complexity:  Moderate (7 nodes)
Template:    infra/n8n-workflows/templates/error-monitoring-workflow.json
```

**Purpose:** Real-time error alerting

**Flow:**
```
Supabase Webhook (new error in integration_logs)
    ↓
Check Severity
    ↓
IF (critical)
    ├── true: Immediate Slack alert
    └── false: Batch for daily summary
```

---

### 5.3 Daily Summary
```
ID:          sys-daily-summary
Trigger:     Cron (8 AM AEST)
Status:      Active
Complexity:  Moderate (8 nodes)
Template:    infra/n8n-workflows/templates/daily-summary-workflow.json
```

**Purpose:** Daily operations summary

**Metrics Included:**
- Sync success rates
- Error counts by source
- Workflow execution stats
- Key business metrics

---

### 5.4 Weekly Cleanup
```
ID:          sys-weekly-cleanup
Trigger:     Cron (Sunday 2 AM)
Status:      Active
Complexity:  Simple (4 nodes)
```

**Purpose:** Clean old logs and execution data

**Actions:**
- Delete integration_logs > 30 days
- Delete workflow_execution_logs > 90 days
- Delete api_metrics > 30 days
- VACUUM ANALYZE tables

---

## Workflow Template Files

### Available Templates
| Template | Location | Purpose |
|----------|----------|---------|
| health-check-workflow.json | templates/ | System health monitoring |
| error-monitoring-workflow.json | templates/ | Real-time error alerts |
| daily-summary-workflow.json | templates/ | Daily ops summary |
| shopify-order-sync.json | templates/ | Shopify → Supabase orders |
| shopify-customer-sync.json | templates/ | Shopify → Supabase customers |
| unleashed-order-sync.json | templates/ | Unleashed → Supabase orders |
| unleashed-customer-sync.json | templates/ | Unleashed → Supabase customers |
| smartlead-hubspot-sync.json | templates/ | Smartlead → HubSpot |
| ambassador-application-handler.json | templates/ | Brand ambassador form |
| checkout-error-email-sender.json | templates/ | Checkout error emails |
| business-sync-workflow.json | templates/ | Generic sync template |

---

## Workflow Naming Convention

```
{business}-{system}-{action}

Examples:
- boo-bc-product-sync
- tlx-unleashed-orders
- elv-prospecting-daily
- sys-health-check
```

---

## Credential Requirements

| Workflow | Credentials Needed |
|----------|-------------------|
| boo-bc-* | BigCommerce API, Supabase |
| boo-supplier-sync | Oborne FTP, UHP login, Kadac API, GlobalNature API |
| tlx-unleashed-* | Unleashed HMAC credentials |
| tlx-smartlead-* | Smartlead API, HubSpot API |
| elv-* | Shopify API, HubSpot API |
| sys-* | Supabase, Slack |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
**Total Workflows:** 19 active + 16 templates
