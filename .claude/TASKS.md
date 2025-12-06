# Master Operations Task Framework

> **Last Updated:** 2025-12-05
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

### Shipping Labels (Branch: shipping-label-launch-plan)
> Shipping label system launch for BOO, Teelixir, Elevate - 75% complete

**Status:** CODE EXISTS (on main) | Nav: Shipping → BOO, Teelixir, Elevate, Home | Needs config only

- [ ] **P1** Deploy shipping database migration to Supabase projects
- [ ] **P1** Configure AusPost API credentials in DO App Platform
- [ ] **P1** Confirm/update warehouse sender addresses
- [ ] **P2** Test order sync from all platforms (BOO, Teelixir, Elevate)
- [ ] **P2** Test label creation and Zebra printing
- [ ] **P2** Deploy and verify production environment

### Accounting Dashboard (Branch: accounting-dashboard-plan)
> Full bookkeeping automation - All 4 businesses use Xero

**Status:** PLAN ONLY (1,562 lines) | No code yet | Xero client exists in shared/libs

- [ ] **P2** Get BOO Xero tenant OAuth credentials
- [ ] **P2** Get RHF Xero tenant OAuth credentials
- [ ] **P2** Create Accounting tab in dashboard (/home/accounting)
- [ ] **P3** Build AP automation: email invoice ingestion → Xero bills
- [ ] **P3** Build bank reconciliation: auto-match transactions
- [ ] **P3** Build AR automation: overdue invoice follow-up

### Inventory & Production Planning (Branches: inventory-dashboard-setup, restore-ordering-dashboard)
> Unleashed replacement + production/ordering forecasting - Teelixir first, then other businesses

**Status:** MERGED TO MAIN | Nav: Inventory → Teelixir | Migration: 903 lines (pending deploy)

**Context:** Connected systems - inventory management feeds into production planning and input ordering. Teelixir most complex (requires batch records), so once built, simpler for BOO/RHF/Elevate to adopt.

- [x] **P2** Review and merge inventory dashboard | Merged 2025-12-05
- [ ] **P2** Deploy inventory migration: `20251204_inventory_management.sql`
- [ ] **P2** Test Teelixir Shopify inventory sync
- [ ] **P3** Deploy ordering dashboard migration (Stock Analysis, BOM, Stock Needs)
- [ ] **P3** Build Unleashed data sync API routes
- [ ] **P3** Add batch record tracking for Teelixir production
- [ ] **P4** Extend inventory system for BOO/RHF/Elevate

### Voice AI Integration (Branch: voice-ai-integration-plan)
> Ultra-low latency (<200ms) Voice AI for calls

**Status:** PLAN ONLY (973 lines) | No code yet

- [ ] **P4** Evaluate Telnyx Sydney vs OpenAI Realtime API
- [ ] **P4** Build Voice AI tab in dashboard
- [ ] **P4** Implement inbound/outbound call handling

### AWS Migration Tracking (Branch: audit-aws-migration)
> BOO migration from AWS to Supabase - Dashboard tracking feature ready

**Status:** MERGED TO MAIN | Nav: AWS Migration → Home | Page: /aws-migration

- [x] **P2** Review and merge AWS migration dashboard | Already on main
- [ ] **P2** Deploy migration schema: `20251202_aws_migration_tracking.sql`
- [ ] **P3** Seed initial migration component data (BOO products, orders, suppliers)

### Migration
> Platform migrations and major infrastructure changes

- [ ] **P3** Migrate GSC tables from boo → teelixir-leads (with dual-write)
- [ ] **P3** Migrate bc_orders from boo → teelixir-leads
- [x] **P3** Migrate elevate_products to teelixir-leads | Completed 2025-12-05
- [ ] **P3** Update 15+ hardcoded Supabase URLs to env vars

### System Checks
> Health monitoring, integrations, and reliability

- [x] **P2** Fix misleading memory metrics in dashboard | Now uses memory_available
- [x] **P2** Consolidate infrastructure to single droplet | Deleted n8n-secondary, migrated services to primary

---

## Teelixir (Shopify)

Premium adaptogens and medicinal mushrooms.

### Automations
> n8n workflows, scheduled jobs, sync processes

- [x] **P2** Anniversary Upsell: Enable automation in dashboard | LIVE - enabled=true
- [x] **P2** Anniversary Upsell: Schedule queue-anniversary-emails.ts | PM2 cron daily at 8am AEST
- [x] **P2** Anniversary Upsell: Schedule send-anniversary-upsell.ts | PM2 cron hourly 9am-6pm AEST

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
- [x] **2025-12-05** TASK-17 Task attachments feature | File upload/download for tasks - migration pending
- [x] **2025-12-05** TASK-33 Fix unleashed-order-sync n8n workflow | Fixed crypto module blocked by n8n security
- [x] **2025-12-05** Anniversary Upsell automation LIVE | PM2 cron jobs deployed, 8am queue + hourly 9am-6pm sender
- [x] **2025-12-05** Teelixir order sync cron jobs | MIN_ORDER_DATE Dec 1 2025 cutoff, Shopify→Unleashed 4AM, Unleashed B2B→Supabase 5AM

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

**Status:** LIVE (2025-12-05)

**Deployment:**
- Scripts deployed to droplet at `/root/master-ops/teelixir/scripts/`
- PM2 cron jobs configured and saved
- Automation enabled in database (enabled=true)

**PM2 Jobs:**
- `anniversary-queue-daily`: Runs daily at 8am AEST (`0 8 * * *`)
- `anniversary-send-hourly`: Runs hourly 9am-6pm AEST (`0 9-18 * * *`)

**Test Results (2025-12-05):**
- All 8 phases passed
- Test email delivered to jayson@fyic.com.au (discount code: JAYSONUSER15)
- Gmail OAuth working (colette@teelixir.com)
- Shopify discount code creation working
- 500 candidates in view, 0 due today (customers maturing into send window)

**Scripts:**
- teelixir/scripts/queue-anniversary-emails.ts - Run daily to queue eligible customers
- teelixir/scripts/send-anniversary-upsell.ts - Run hourly (9am-6pm AEST) to send emails

**Monitoring:**
- Check PM2 logs: `pm2 logs anniversary-queue-daily` / `pm2 logs anniversary-send-hourly`
- Check queue: `https://ops.growthcohq.com/api/automations/anniversary/queue`
- Check stats: `https://ops.growthcohq.com/api/automations/anniversary/stats`

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

### Session 67eabb5d (2025-12-04 09:00 am)
- Exit reason: other
- Pending tasks saved: 0

### Session a6f9a682 (2025-12-04 09:03 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 5f6a0b22 (2025-12-04 09:08 am)
- Exit reason: other
- Pending tasks saved: 0

---

## Supabase Infrastructure Audit Report

**Generated:** 2025-12-05

### Executive Summary

We currently operate **3 separate Supabase projects** with significant fragmentation. Data is spread across projects without clear ownership.

**Recommendation:** Consolidate to **2 projects** (Master Hub + Credentials Vault).

---

### Current State Overview

| Project | ID | Tables | Rows | Storage | Purpose |
|---------|-----|--------|------|---------|---------|
| **teelixir-leads** | qcvfxxsnqvdfmpbcgdni | 34 | 61,130 | 3 buckets | Master Hub (Dashboard, Automations) |
| **boo** | usibnysqelovfuctmkqw | 14 | 154,340 | 0 | Credentials Vault + GSC Data |
| **elevate** | xioudaqfmkdpkgujxehv | 1 | 1,213 | 0 | Elevate Products (underutilized) |

---

### Project Details

#### teelixir-leads (Master Hub)
**Top Tables:**
| Table | Rows |
|-------|------|
| tlx_shopify_orders | 30,661 |
| businesses | 14,008 (B2B prospect leads - NOT an anomaly) |
| cicd_issues | 11,025 |
| livechat_messages | 3,189 |
| intercompany_transactions | 1,487 |

**Storage:** blueprints, marketing-assets, documents
**Used by:** Dashboard, n8n, brand-connections

#### boo (Credentials + GSC)
**Top Tables:**
| Table | Rows |
|-------|------|
| gsc_page_daily_stats | 145,931 |
| bc_orders | 6,032 |
| livechat_messages | 1,638 (duplicate!) |
| n8n_workflows | 372 |
| secure_credentials | 93 (VAULT) |

**Used by:** creds.js (vault), GSC sync

#### elevate (Underutilized)
**Tables:**
| Table | Rows |
|-------|------|
| elevate_products | 1,213 |

**Used by:** elevate-wholesale app only

---

### Issues Identified

1. **HIGH:** Duplicate tables (livechat_*) in teelixir-leads AND boo
2. **HIGH:** Data fragmentation - GSC in boo, dashboard in teelixir-leads
3. **MEDIUM:** 15+ hardcoded Supabase URLs across codebase
4. **MEDIUM:** Elevate project nearly empty (1 table) - wasted resource
5. **LOW:** 16 empty agent tables in teelixir-leads (prepared for future)
6. **RESOLVED:** businesses table 14K rows = B2B prospect leads (correct data)

---

### Consolidation Recommendation

**Option A (Recommended): 2 Projects**

| Project | Purpose | Contains |
|---------|---------|----------|
| **Master Hub** (teelixir-leads) | All business data | Dashboard, orders, GSC, products, automations |
| **Credentials Vault** (boo) | Secure storage only | secure_credentials table |

**Migration Steps:**
1. Fix businesses table anomaly (investigate 14K rows)
2. Migrate GSC tables from boo → teelixir-leads
3. Migrate bc_orders from boo → teelixir-leads
4. Migrate elevate_products from elevate → teelixir-leads
5. Remove duplicate livechat_* tables from boo
6. Update all hardcoded URLs to use env vars
7. Shut down elevate project (cost savings)

**Estimated Effort:** 3-5 days
**Cost Savings:** ~$25-50/month

---

### Hardcoded URLs to Fix

| File | Current | Should Be |
|------|---------|-----------|
| dashboard/src/lib/supabase.ts | Hardcoded both | Use env vars |
| creds.js | Hardcoded boo | Keep (vault) |
| brand-connections/src/lib/supabase.ts | Hardcoded | Use env var |
| infra/xero-financial-sync-cron.js | Hardcoded | Use env var |

---

### Next Steps (Safe Migration Plan)

**Phase 1: Prep (No Changes)**
- [x] Complete dependency audit
- [x] businesses table resolved - it's B2B leads, not core businesses
- [x] Created ACCESS-GUIDE.md for multi-device access
- [x] Created setup-new-machine.sh for portable setup

**Phase 2: Low-Risk Migrations**
- [x] **P3** Migrate elevate_products to teelixir-leads | COMPLETED 2025-12-05
  - Table created with has_gst column (additional column found in source)
  - 1,213 rows copied successfully
  - 10/10 spot checks passed
  - elevate-wholesale/.env updated to teelixir-leads
  - shopify-form-integration.js URL updated
  - Connection test passed
  - 48-hour monitoring period started
- [ ] **P3** Migrate n8n_workflows backup table (read-only)

**Phase 3: Medium-Risk Migrations (with parallel sync)**
- [ ] **P2** Migrate GSC tables with dual-write period
- [ ] **P2** Migrate bc_orders with dual-write period
- [ ] **P3** Remove duplicate livechat_* tables from boo

**Phase 4: Cleanup**
- [ ] **P3** Update 15+ hardcoded Supabase URLs to use env vars
- [ ] **P4** Evaluate shutting down elevate project

**NEVER MIGRATE:** secure_credentials stays in boo (security isolation)

### Session 1f819eb8 (2025-12-04 09:48 am)
- Exit reason: other
- Pending tasks saved: 0

### Session d7faf412 (2025-12-04 10:21 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 6415f43a (2025-12-05 02:54 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 17b2e77b (2025-12-05 04:20 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 875cb552 (2025-12-05 04:21 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 40f041a3 (2025-12-05 04:53 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 3283b70d (2025-12-05 05:18 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 8f17869d (2025-12-05 05:20 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 6c617700 (2025-12-05 05:23 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session f6eddaf0 (2025-12-05 05:26 pm)
- Exit reason: other
- Pending tasks saved: 0

---

## Task Attachments Feature Notes (TASK-17)

**Status:** Code Complete, Migration Pending

**Implementation Details (2025-12-05):**

**Files Created:**
- `infra/supabase/migrations/20251205_task_attachments.sql` - Database schema
- `dashboard/src/app/api/tasks/[id]/attachments/route.ts` - GET/POST endpoints
- `dashboard/src/app/api/tasks/[id]/attachments/[attachmentId]/route.ts` - GET/DELETE/PATCH endpoints
- `dashboard/src/components/tasks/AttachmentUpload.tsx` - Drag-drop file upload
- `dashboard/src/components/tasks/AttachmentList.tsx` - File list with download/delete

**Files Modified:**
- `dashboard/src/app/(dashboard)/[business]/tasks/page.tsx` - Integrated into RajaniTaskCard

**Infrastructure:**
- Storage bucket `task-attachments` created in Supabase
- 10MB file size limit
- Allowed types: PDF, images, Word, Excel, CSV, text

**Migration Required:**
Run in Supabase SQL Editor: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql
```sql
-- Run contents of infra/supabase/migrations/20251205_task_attachments.sql
```

**Features:**
- Drag-and-drop file upload
- File type validation
- Size limit enforcement (10MB)
- Optional file description
- Soft delete (is_deleted flag)
- Signed URLs for secure downloads (1 hour expiry)
- Auto-refresh on upload/delete

---

## TASK-33 Unleashed Order Sync Fix Notes

**Status:** Fixed (2025-12-05)

**Problem:**
- n8n workflow "Unleashed → HubSpot Order Sync (Deals)" was active but all executions failing
- Error: `Module 'crypto' is disallowed [line 4]`
- n8n security update blocked Node.js builtin modules in Code nodes

**Solution Applied:**
1. SSH to n8n droplet (134.199.175.243)
2. Added `NODE_FUNCTION_ALLOW_BUILTIN=crypto` to `/opt/n8n/.env`
3. Restarted n8n container: `docker restart n8n`
4. Verified workflow is active and will run on next 6-hour schedule

**Workflow Details:**
- ID: `cD0rlCpqUfggEKYI`
- Name: "Unleashed → HubSpot Order Sync (Deals)"
- Schedule: Every 6 hours
- Uses HMAC-SHA256 signature for Unleashed API authentication (requires crypto module)

### Session a9652233 (2025-12-05 07:33 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session fb3a2145 (2025-12-05 07:34 pm)
- Exit reason: other
- Pending tasks saved: 1

### Session 26961925 (2025-12-05 07:49 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 05f6e2f7 (2025-12-05 08:17 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 088975f1 (2025-12-05 08:18 pm)
- Exit reason: other
- Pending tasks saved: 3

### Session 3cc6d6c2 (2025-12-05 08:26 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 60c88b5e (2025-12-05 08:38 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 7bfcd444 (2025-12-05 08:38 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 68070cb7 (2025-12-05 08:39 pm)
- Exit reason: other
- Pending tasks saved: 1

### Session cf827872 (2025-12-05 08:54 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1551e514 (2025-12-05 08:55 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session bca9a61d (2025-12-05 09:11 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 7ec65379 (2025-12-05 09:19 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session b3a7305b (2025-12-05 08:30 am)
- Exit reason: other
- Pending tasks saved: 0

### Session d86d782c (2025-12-05 08:31 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 3daa211d (2025-12-05 08:34 am)
- Exit reason: other
- Pending tasks saved: 7

### Session a08b02b0 (2025-12-05 08:35 am)
- Exit reason: other
- Pending tasks saved: 0

### Session f23f1a8c (2025-12-05 09:19 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 8c25b6b7 (2025-12-05 09:19 am)
- Exit reason: other
- Pending tasks saved: 3

### Session 60015b16 (2025-12-05 09:19 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 058c9d31 (2025-12-05 09:20 am)
- Exit reason: other
- Pending tasks saved: 0

### Session ebd4ade9 (2025-12-05 09:20 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 8d10c8c9 (2025-12-05 09:21 am)
- Exit reason: other
- Pending tasks saved: 0

### Session d121b5ab (2025-12-05 09:21 am)
- Exit reason: other
- Pending tasks saved: 0

### Session af86f511 (2025-12-05 09:21 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 528863d4 (2025-12-05 09:29 am)
- Exit reason: other
- Pending tasks saved: 0

### Session b395b0c5 (2025-12-05 09:29 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 6366eb40 (2025-12-05 09:29 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 171dab72 (2025-12-05 09:29 am)
- Exit reason: other
- Pending tasks saved: 0

### Session ec95f71f (2025-12-05 10:52 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 51b10344 (2025-12-05 10:55 am)
- Exit reason: other
- Pending tasks saved: 0

### Session a013ce2a (2025-12-06 11:27 am)
- Exit reason: other
- Pending tasks saved: 5

### Session 92579229 (2025-12-06 11:27 am)
- Exit reason: other
- Pending tasks saved: 2

### Session 1d1e79e5 (2025-12-06 11:28 am)
- Exit reason: other
- Pending tasks saved: 0

### Session d2d12ef7 (2025-12-06 11:29 am)
- Exit reason: other
- Pending tasks saved: 0

### Session c9669d48 (2025-12-06 11:30 am)
- Exit reason: other
- Pending tasks saved: 0

### Session f529dc27 (2025-12-06 11:31 am)
- Exit reason: other
- Pending tasks saved: 0

### Session 16f02b18 (2025-12-06 11:40 am)
- Exit reason: other
- Pending tasks saved: 0

### Session a8d3eb13 (2025-12-06 11:40 am)
- Exit reason: other
- Pending tasks saved: 0

### Session ab0614f6 (2025-12-06 12:05 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 6e589518 (2025-12-06 12:21 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session dba72f8b (2025-12-06 12:33 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 716be608 (2025-12-06 12:33 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 1754370f (2025-12-06 12:33 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 515b58de (2025-12-06 12:33 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session b48a29fa (2025-12-06 12:45 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session b5e15f1c (2025-12-06 12:50 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 3fb55ba8 (2025-12-06 01:29 pm)
- Exit reason: other
- Pending tasks saved: 0

### Session 0b31e10b (2025-12-06 01:35 pm)
- Exit reason: other
- Pending tasks saved: 1

### Session a628d7b1 (2025-12-06 01:36 pm)
- Exit reason: other
- Pending tasks saved: 1
