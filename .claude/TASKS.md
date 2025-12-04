# Master Operations Task Framework

> **Last Updated:** 2025-12-04
> **Usage:** Reference this file when starting a new Claude Code session. Say "what's next" to review priorities.

---

## Quick Reference

| Priority | Meaning | Response Time |
|----------|---------|---------------|
| P1 | Urgent/Blocking | Today |
| P2 | Important | This week |
| P3 | Normal | Soon |
| P4 | Backlog | When time permits |

---

## Overall Priorities

Cross-business initiatives that take precedence.

### Dashboard
> ops.growthcohq.com improvements and infrastructure

- [ ] **P1** Deploy task schema to Supabase (all 4 projects)
- [ ] **P2** Build task API endpoints for CRUD operations
- [ ] **P2** Connect Tasks UI to Supabase backend
- [ ] **P3** Add task creation form in dashboard

### Migration
> Platform migrations and major infrastructure changes

- [ ]

### System Checks
> Health monitoring, integrations, and reliability

- [x] **P2** Fix misleading memory metrics in dashboard | Now uses memory_available
- [x] **P2** Consolidate infrastructure to single droplet | Deleted n8n-secondary, migrated services to primary

---

## Teelixir (Shopify)

Premium adaptogens and medicinal mushrooms.

### Automations
> n8n workflows, scheduled jobs, sync processes

- [ ] **P2** Anniversary Upsell: Enable automation in dashboard
- [ ] **P2** Anniversary Upsell: Schedule queue-anniversary-emails.ts in n8n (daily)
- [ ] **P2** Anniversary Upsell: Schedule send-anniversary-upsell.ts in n8n (hourly 9am-6pm AEST)

### SEO
> Rankings, content optimization, technical SEO, GSC

- [ ]

### Inventory Management
> Stock levels, supplier sync, alerts

- [ ]

### Email Marketing
> Klaviyo flows, campaigns, templates

- [ ]

### Google Ads
> Campaigns, ROAS, search terms, bidding

- [ ]

### Analytics
> GA4, conversion tracking, reporting

- [ ]

### Customer Segments
> RFM analysis, churn prediction, retention

- [ ]

### Content
> Product descriptions, blog, landing pages

- [ ]

---

## Buy Organics Online (BigCommerce)

Australia's largest organic marketplace (11K+ products).

### Automations
> n8n workflows (50+), scheduled jobs, sync processes

- [ ]

### SEO
> Rankings, content optimization, technical SEO, GSC

- [ ]

### Inventory Management
> 4 suppliers (Oborne, UHP, Kadac, Unleashed), stock alerts

- [ ]

### Email Marketing
> Klaviyo flows, campaigns, templates

- [ ]

### Google Ads
> Campaigns, ROAS, search terms, Merchant Center

- [ ]

### Analytics
> GA4, conversion tracking, reporting

- [ ]

### Customer Segments
> RFM analysis, churn prediction, retention

- [ ]

### Pricing & Margins
> Competitor pricing, margin optimization

- [ ]

### Content
> Product descriptions (11K+), blog, landing pages

- [ ]

---

## Elevate Wholesale (Shopify B2B)

B2B wholesale distribution platform.

### Automations
> n8n workflows, scheduled jobs

- [ ]

### Prospecting/Outreach
> Smartlead campaigns, lead generation

- [ ]

### Trial Processing
> Sample requests, trial orders

- [ ]

### HubSpot Sync
> Contact sync, deal tracking

- [ ]

---

## Red Hill Fresh (WooCommerce)

Local fresh produce delivery.

### Automations
> n8n workflows, order sync

- [ ]

### SEO
> Local SEO, rankings, content

- [ ]

### Inventory
> Stock management

- [ ]

### Local Delivery
> Zones, scheduling, routes

- [ ]

---

## Completed Tasks (Last 7 Days)

Tasks moved here after completion for reference.

- [x] **2025-12-04** Anniversary Upsell re-validation | 8/8 phases passed, test email sent, all integrations verified
- [x] **2025-12-03** CI/CD monitoring dashboard | Created cicd_issues tracking, scan history, health check scripts
- [x] **2025-12-03** BOO dispatch widget | Added dispatch problem products widget showing stock-out risks
- [x] **2025-12-03** Anniversary upsell email redesign | Improved HTML, responsive design, discount code in URLs
- [x] **2025-12-03** Winback email automation API | Created queue-daily and process routes for winback campaigns
- [x] **2025-12-03** Apify expert skill | Created skill for Google Maps scraping, lead generation
- [x] **2025-12-03** Added DigitalOcean droplet capacity widget | CPU, memory, disk, containers for n8n droplets
- [x] **2025-12-03** Fixed BOO bc-product-sync job | Deployed cron to PM2, synced 8,203 products
- [x] **2025-12-03** Fixed BOO gmc-sync cron job | Deployed to PM2 on DigitalOcean droplet
- [x] **2025-12-03** Added Tasks nav item to dashboard sidebar
- [x] **2025-12-03** Created Tasks page UI with framework structure
- [x] **2025-12-03** Copy to Claude button for automations | One-click copy of automation prompts
- [x] **2025-12-03** Teelixir Unleashed inventory sync | Added cron jobs for inventory sync
- [x] **2025-12-03** n8n workflow audit and cleanup scripts | Batch HTTP auth fixes, inactive workflow detection
- [x] **2025-12-04** Session exit automation | SessionEnd hook to auto-save tasks, commit, and push to git
- [x] **2025-12-04** Fixed gmc-sync path resolution | Scripts moved to dashboard/scripts/, added GMC OAuth credentials to DO App Platform
- [x] **2025-12-04** Job monitoring UI improvements | Added "Last attempted" date display, stock-sync to syncable jobs
- [x] **2025-12-04** Teelixir order sync fixes | Fixed duplicate detection, added discount sync, fuzzy matching, B2C filter
- [x] **2025-12-04** Fixed unleashed-order-sync n8n job | Created HubSpot sync schema, deployed tables, validated workflow
- [x] **2025-12-04** CI/CD batch 1 TypeScript fixes | Fixed 10 TS errors in unleashed-shopify-sync (order-sync, unleashed-api, inventory-sync)

---

## Notes

### Adding Tasks
When new work arises, ask:
1. "Add this to the task list?" before starting unplanned work
2. Specify the priority (P1-P4)
3. Specify the business and category

### Task Format
```
- [ ] **P#** Task title | Context/notes
```

### Session Start Workflow
1. Open this file or go to ops.growthcohq.com/home/tasks
2. Review P1 tasks first
3. Pick top priority and start working
4. Update status as you go

### Marking Complete
```
- [x] **2025-12-03** Task title | Completed notes
```
Move to "Completed Tasks" section at bottom.

### After Every Fix - Dashboard Updates (MANDATORY)
After completing any fix (especially CI/CD, TypeScript, or code changes):
1. **Run health check**: `npx tsx scripts/cicd-health-check.ts`
2. **Verify dashboard updated**: Check https://ops.growthcohq.com/home/cicd
3. **Clear stale issues if needed**: Mark resolved issues in database
4. **Commit and push**: Ensure all changes are saved to git

This ensures the dashboard always reflects current codebase state.

---

## Anniversary Upsell System Notes

**Status:** Tested and Ready for Activation

**Test Results (2025-12-04 - Re-validated):**
- All 8 phases passed
- Test email delivered to jayson@fyic.com.au (discount code: JAYSONUSER15)
- Gmail OAuth working (colette@teelixir.com)
- Shopify discount code creation working
- 500 candidates in view, 0 due today (customers maturing into send window)
- Melbourne time 15:20 - within send window (9AM-7PM)

**Scripts:**
- teelixir/scripts/queue-anniversary-emails.ts - Run daily to queue eligible customers
- teelixir/scripts/send-anniversary-upsell.ts - Run hourly (9am-6pm AEST) to send emails

**Activation Steps:**
1. Enable in dashboard: ops.growthcohq.com/teelixir/automations/anniversary_upsell
2. Create n8n workflow for daily queue builder
3. Create n8n workflow for hourly sender (9am-6pm AEST)
4. First emails will go out in ~26-40 days when customers mature into send window

**Teelixir Automation Tasks:**
- [ ] P2 Anniversary Upsell: Enable automation in dashboard
- [ ] P2 Anniversary Upsell: Schedule queue-anniversary-emails.ts in n8n (daily)
- [ ] P2 Anniversary Upsell: Schedule send-anniversary-upsell.ts in n8n (hourly 9am-6pm AEST)

---

## DigitalOcean Droplet Monitoring Notes

**Status:** Live on ops.growthcohq.com/home

**Implementation Details (2025-12-04):**
- Single droplet infrastructure after consolidation
- n8n-primary (134.199.175.243): All services consolidated here
- Memory metrics now use `memory_available` for accurate readings (not misleading buffer/cache)

**Files:**
- `dashboard/src/app/api/infrastructure/droplets/route.ts` - API route fetching from DO API + Monitoring API
- `dashboard/src/components/DropletCapacityWidget.tsx` - React component with expandable details

**Key Technical Notes:**
- DO returns cumulative CPU times, not percentages - had to calculate delta between readings
- Uses `DO_API_TOKEN` env var (added to DO App Platform)
- Containers are hardcoded in `DROPLET_CONFIG` - update if containers change
- Refresh interval: 60 seconds
- Uses `memory_available` instead of `memory_free` for accurate memory metrics

---

## Teelixir Shopify-Unleashed Order Sync Notes

**Status:** Live and Working (2025-12-04)

**Features Implemented:**
- Discount sync: Shopify `total_discount` → Unleashed `DiscountRate` (percentage)
- Order format: `Shopify{order_number}` (e.g., Shopify31694) + CustomerCode = order ID
- Fuzzy duplicate detection: customer name + date (±1 day) + total (±5%)
- B2C filter: Distributor sync now skips orders with `Shopify` prefix

**Scripts:**
- `unleashed-shopify-sync/scripts/run-order-sync.ts` - Syncs Shopify orders to Unleashed
- `unleashed-shopify-sync/scripts/check-duplicates.ts` - Detects duplicate orders in Unleashed
- `teelixir/scripts/sync-distributor-orders.ts` - Syncs distributor orders from Unleashed to Supabase

**Key Files Modified:**
- `unleashed-shopify-sync/src/order-sync.ts` - Added discount calc, fuzzy matching, new order format
- `unleashed-shopify-sync/src/types.ts` - Added `total_discount`, `discount_allocations` to ShopifyLineItem
- `teelixir/scripts/sync-distributor-orders.ts` - Fixed B2C filter, empty ProductCode handling

**Duplicate Detection (3 levels):**
1. Exact CustomerRef match (Shopify order ID)
2. Exact OrderNumber match (Shopify{order_number})
3. Fuzzy: same customer name + within 1 day + total within 5%

**Git Commit:** 499fc9a

---

## CI/CD Monitoring Notes

**Status:** Live on ops.growthcohq.com/[business]/cicd

**Implementation Details (2025-12-03):**
- Dashboard page shows TypeScript errors, test failures, lint issues, build errors
- Issues tracked in cicd_issues table with occurrence counts and auto-fix flags
- Health check script scans codebase and posts to API
- Auto-fix script applies common fixes (unused imports, type errors)

**Files Created:**
- `dashboard/src/app/(dashboard)/[business]/cicd/page.tsx` - CI/CD dashboard UI
- `dashboard/src/app/api/cicd/route.ts` - API for issues CRUD
- `scripts/cicd-health-check.ts` - Scans codebase for issues
- `scripts/cicd-auto-fix.ts` - Auto-fixes common issues
- `infra/supabase/migrations/20251203_cicd_issues.sql` - Database schema

**Database Tables:**
- `cicd_issues` - Tracks individual issues with severity, file path, auto-fixable flag
- `cicd_scan_history` - Logs scan runs with issue counts

---

### Session f4bfe033 (2025-12-03 09:47 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 5218b2c8 (2025-12-03 10:02 am)
- Exit reason: other
- Pending tasks saved: 0

### Session e356a6a0 (2025-12-03 10:56 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 78e176f0 (2025-12-03 10:56 am)
- Exit reason: other
- Pending tasks saved: 0

### Session e39d7649 (2025-12-03 10:58 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 41492e08 (2025-12-03 10:58 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 9cac9bde (2025-12-04 11:02 am)
- Exit reason: other
- Pending tasks saved: 0

### Session ac8f14e2 (2025-12-04 11:13 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 09c24e1a (2025-12-04 11:13 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 5cb899ab (2025-12-04 11:14 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 2eef821b (2025-12-04 11:15 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 4926c793 (2025-12-04 11:15 am)
- Exit reason: other
- Pending tasks saved: 0

### Session d9ed69c3 (2025-12-04 11:15 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 0b63680d (2025-12-04 11:32 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 484b101f (2025-12-04 11:32 am)
- Exit reason: other
- Pending tasks saved: 0

### Session cd11ec11 (2025-12-04 11:34 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 910ce2e3 (2025-12-04 11:36 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 23ddb54e (2025-12-04 11:48 am)
- Exit reason: other
- Pending tasks saved: 0

### Session d39c2e01 (2025-12-04 11:49 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 684d05c8 (2025-12-04 11:50 am)
- Exit reason: other
- Pending tasks saved: 0

### Session b0e435e7 (2025-12-04 11:57 am)
- Exit reason: other
- Pending tasks saved: 5

### Session 58be828f (2025-12-04 11:58 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 8f10d300 (2025-12-04 12:20 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 60302525 (2025-12-04 12:21 pm)
- Exit reason: other
- Pending tasks saved: 3

### Session f8b829b0 (2025-12-04 12:21 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 8769c39e (2025-12-04 12:21 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 11ad574a (2025-12-04 12:21 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 63a06554 (2025-12-04 12:21 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session a09b96be (2025-12-04 12:22 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 2de1e6ed (2025-12-04 12:24 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session b6ec6ed6 (2025-12-04 12:24 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 638d597b (2025-12-04 12:24 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 5f2f506c (2025-12-04 12:24 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 4a3f25ab (2025-12-04 12:25 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 73b9e53d (2025-12-04 12:25 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 6f718e09 (2025-12-04 12:41 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1bbe027e (2025-12-04 12:42 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session f0635c99 (2025-12-04 12:43 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session dc1780e2 (2025-12-04 12:44 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 11e67e9c (2025-12-04 01:06 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 16a1c1d3 (2025-12-04 01:07 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session c9c947df (2025-12-04 01:28 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 17846c92 (2025-12-04 01:29 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session d906cc7c (2025-12-04 02:10 pm)
- Exit reason: other
- Pending tasks saved: 1

### Session c59e5384 (2025-12-04 02:11 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1b7fd2bf (2025-12-04 02:45 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 2f089b14 (2025-12-04 02:46 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 38e1da13 (2025-12-04 02:46 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 48234d61 (2025-12-04 02:46 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 9c0646e2 (2025-12-04 02:46 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 70362bb7 (2025-12-04 03:10 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 4628b5c5 (2025-12-04 03:15 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 29831365 (2025-12-04 03:16 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 684e36ce (2025-12-04 03:17 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 00f35d92 (2025-12-04 03:19 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session b9d219ad (2025-12-04 03:19 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1f8abf00 (2025-12-04 03:19 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 0456ce10 (2025-12-04 03:34 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 726d9033 (2025-12-04 04:22 pm)
- Exit reason: other
- Pending tasks saved: 5

### Session 7dba2327 (2025-12-04 04:23 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 0b892b3d (2025-12-04 04:24 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session ade7b6c4 (2025-12-04 04:25 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session cb11f093 (2025-12-04 04:25 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 6ddd9844 (2025-12-04 04:25 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 816cc95c (2025-12-04 04:41 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 9ae32a72 (2025-12-04 04:43 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 45281ae9 (2025-12-04 04:43 pm)
- Exit reason: other
- Pending tasks saved: 1

### Session 7ece72d0 (2025-12-04 04:44 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1c4bab7c (2025-12-04 04:44 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 6d518fb2 (2025-12-04 05:01 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 8ef99438 (2025-12-04 05:02 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session fb5348de (2025-12-04 06:05 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1a67d5d4 (2025-12-04 07:02 pm)
- Exit reason: other
- Pending tasks saved: 0

---

## Unleashed → HubSpot Order Sync Notes

**Status:** Fixed and Healthy (2025-12-04)

**Problem:**
- n8n workflow `cD0rlCpqUfggEKYI` wasn't running since Dec 1st
- Root cause: Missing Supabase tables that the workflow required

**Solution Applied:**
1. Created migration: `infra/supabase/migrations/20251204_hubspot_sync_schema.sql`
2. Tables created: `hubspot_sync_log`, `integration_logs`
3. Function created: `log_hubspot_sync()` - upsert for sync logging
4. Updated dashboard job status to healthy

**Validation Results:**
- Unleashed API: Connected (5,929 orders available)
- hubspot_sync_log table: Accessible
- integration_logs table: Accessible
- log_hubspot_sync() function: Working
- Dashboard status: Healthy

**Workflow Details:**
- ID: `cD0rlCpqUfggEKYI`
- Name: "Unleashed → HubSpot Order Sync (Deals)"
- Schedule: Every 6 hours
- Syncs: Unleashed sales orders → HubSpot deals



---

## Health Check Monitoring Notes

**Status:** Live on ops.growthcohq.com/home/health (2025-12-04)

**New Integrations Added:**
| Integration | Business | Status | Notes |
|-------------|----------|--------|-------|
| Smartlead | Global | Degraded | API returning non-200 |
| n8n | Global | Healthy | Automation platform |
| GSC | Global | Degraded | Missing GOOGLE_CLIENT_ID/SECRET |
| Gmail (GSuite) | Teelixir | Healthy | OAuth via vault |
| Google Merchant | BOO | Degraded | Missing Google OAuth creds |
| Teelixir Shopify | Teelixir | Healthy | Store access |
| RHF WooCommerce | RHF | Degraded | Missing RHF_WOO_CONSUMER_SECRET |

**Files Modified:**
- `shared/libs/integrations/health/sync-health-checks.js` - Added new integration checks
- `dashboard/src/app/(dashboard)/[business]/health/page.tsx` - Added integration/business name mappings
- `dashboard/src/components/IntegrationStatus.tsx` - Added integration name mappings

**To Fix Degraded Integrations:**
1. **GSC & Google Merchant**: Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to .env
2. **RHF WooCommerce**: Add `RHF_WOO_CONSUMER_SECRET` to .env (get from vault)
3. **Smartlead**: Check if API key is valid

**Run Health Checks Manually:**
```bash
node shared/libs/integrations/health/sync-health-checks.js
```

**Git Commit:** a87798d

### Session 24d5e364 (2025-12-04 07:08 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 5fab58e9 (2025-12-04 07:11 pm)
- Exit reason: other
- Pending tasks saved: 2

### Session ed7d9fd6 (2025-12-04 07:16 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 2c5c94fa (2025-12-04 07:16 pm)
- Exit reason: other
- Pending tasks saved: 3

### Session 0b06ed9c (2025-12-04 07:17 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session f8cccf26 (2025-12-04 07:18 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 01b37a12 (2025-12-04 07:21 pm)
- Exit reason: other
- Pending tasks saved: 4

### Session 98b36b2b (2025-12-04 07:28 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session c3e397f2 (2025-12-04 07:34 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session af4aea2e (2025-12-04 07:39 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session cd8d073e (2025-12-04 07:40 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 669ef89d (2025-12-04 08:06 pm)
- Exit reason: other
- Pending tasks saved: 0
