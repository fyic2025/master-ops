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

- [ ] **P2** Install DO monitoring agent on n8n-secondary (170.64.223.141) | Required for metrics in dashboard widget
- [ ] **P3** Evaluate load sharing options between droplets | n8n worker mode or other approaches

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

---

## Anniversary Upsell System Notes

**Status:** Tested and Ready for Activation

**Test Results (2025-12-03):**
- All 8 phases passed
- Test email delivered to jayson@fyic.com.au
- Gmail OAuth working (colette@teelixir.com)
- Shopify discount code creation working
- 500 candidates in view, 0 due today (correct - recent customers 26-40 days from send window)

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

**Implementation Details (2025-12-03):**
- Widget shows both droplets with real-time metrics from DO Monitoring API
- n8n-primary (134.199.175.243): CPU, memory, disk metrics working, 3 containers (n8n, caddy, watchtower)
- n8n-secondary (170.64.223.141): Active but no metrics (DO monitoring agent not installed)

**Files Created:**
- `dashboard/src/app/api/infrastructure/droplets/route.ts` - API route fetching from DO API + Monitoring API
- `dashboard/src/components/DropletCapacityWidget.tsx` - React component with expandable details

**Key Technical Notes:**
- DO returns cumulative CPU times, not percentages - had to calculate delta between readings
- Uses `DO_API_TOKEN` env var (added to DO App Platform)
- Containers are hardcoded in `DROPLET_CONFIG` - update if containers change
- Refresh interval: 60 seconds

**Droplet Infrastructure Tasks:**
- [ ] P2 Install DO monitoring agent on n8n-secondary: `curl -sSL https://repos.insights.digitalocean.com/install.sh | bash`
- [ ] P3 Evaluate load sharing: Consider n8n worker mode or dedicated task routing

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
