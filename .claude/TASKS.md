# Master Operations Task Framework

> **Last Updated:** 2025-12-03
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

- [ ]

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

- [x] **2025-12-03** Added DigitalOcean droplet capacity widget to dashboard | Shows CPU, memory, disk, containers for n8n-primary/secondary droplets. Uses DO Monitoring API.
- [x] **2025-12-03** Fixed BOO bc-product-sync job | Deployed cron to PM2, synced 8,203 products, job now runs daily at 3am AEST
- [x] **2025-12-03** Fixed BOO gmc-sync cron job | Deployed to PM2 on DigitalOcean droplet, synced 3,059 products
- [x] **2025-12-03** Added Tasks nav item to dashboard sidebar
- [x] **2025-12-03** Created Tasks page UI with framework structure

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
