# Email Campaign Manager - Quick Reference

## Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `email-validator.ts` | Validate email list before import | `npx tsx scripts/email-validator.ts leads.csv` |
| `campaign-analytics.ts` | Generate campaign performance report | `npx tsx scripts/campaign-analytics.ts [type] [days]` |
| `bounce-manager.ts` | Manage bounces and suppression list | `npx tsx scripts/bounce-manager.ts [command]` |
| `deliverability-monitor.ts` | Check provider health | `npx tsx scripts/deliverability-monitor.ts check` |

---

## Quick Commands

```bash
# Validate leads before campaign
npx tsx .claude/skills/email-campaign-manager/scripts/email-validator.ts leads.csv

# Health check all email providers
npx tsx .claude/skills/email-campaign-manager/scripts/deliverability-monitor.ts check

# Get last 7 days analytics
npx tsx .claude/skills/email-campaign-manager/scripts/campaign-analytics.ts all 7

# Process bounces into suppression list
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process

# Generate bounce report
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts report 30

# Check if specific email is suppressed
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts check email@example.com
```

---

## Teelixir Anniversary Commands

```bash
# Sync Shopify variants (run daily)
npx tsx teelixir/scripts/sync-shopify-variants.ts

# Queue today's anniversary emails (dry run)
npx tsx teelixir/scripts/queue-anniversary-emails.ts --dry-run

# Queue today's anniversary emails (live)
npx tsx teelixir/scripts/queue-anniversary-emails.ts

# Process queue for current hour (dry run)
npx tsx teelixir/scripts/send-anniversary-upsell.ts --process-queue --dry-run

# Process queue for current hour (live)
npx tsx teelixir/scripts/send-anniversary-upsell.ts --process-queue

# Send test email
npx tsx teelixir/scripts/send-anniversary-upsell.ts --test-email=you@example.com --test-name="First Last"
```

---

## Database Tables

### Smartlead
- `smartlead_campaigns` - Campaign metadata
- `smartlead_leads` - Lead tracking
- `smartlead_emails` - Send events + bounces
- `smartlead_engagement` - Opens, clicks, replies
- `smartlead_sync_log` - HubSpot sync tracking

### Teelixir Anniversary
- `tlx_anniversary_discounts` - Discount codes, conversions, open/click tracking
- `tlx_anniversary_queue` - Hourly send queue
- `tlx_reorder_timing` - Product timing rules
- `tlx_shopify_variants` - Product variant data for upsell matching
- `tlx_automation_config` - Automation settings
- `v_tlx_anniversary_upsell_candidates` - View of upcoming candidates

### Teelixir Winback
- `tlx_winback_emails` - Winback tracking

### Shared
- `email_suppression_list` - Bounced/unsubscribed emails
- `hubspot_sync_log` - HubSpot sync status

---

## Key Views

```sql
-- Smartlead campaign performance
SELECT * FROM v_smartlead_campaign_performance;

-- Anniversary upsell candidates (with timing)
SELECT * FROM v_tlx_anniversary_upsell_candidates LIMIT 20;

-- Anniversary stats
SELECT * FROM tlx_anniversary_stats;

-- Today's anniversary queue status
SELECT status, COUNT(*) FROM tlx_anniversary_queue
WHERE scheduled_date = CURRENT_DATE GROUP BY status;

-- Winback send time analysis
SELECT * FROM v_winback_send_time_analytics;
```

---

## Environment Variables

```bash
# Smartlead
SMARTLEAD_API_KEY=

# Gmail OAuth (per business)
TEELIXIR_GMAIL_CLIENT_ID=
TEELIXIR_GMAIL_CLIENT_SECRET=
TEELIXIR_GMAIL_REFRESH_TOKEN=

BOO_GMAIL_CLIENT_ID=
BOO_GMAIL_CLIENT_SECRET=
BOO_GMAIL_REFRESH_TOKEN=

# Fallbacks (BOO)
RESEND_API_KEY=
SENDGRID_API_KEY=

# HubSpot
HUBSPOT_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Daily Limits

| Campaign Type | Limit | Window |
|--------------|-------|--------|
| Smartlead Cold | 200/day | Smartlead managed |
| Anniversary | 50/day | 9AM-7PM AEST |
| Winback | 20/day | 9AM-7PM AEST |
| BOO Alerts | Unlimited | 24/7 |

---

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Bounce Rate | >3% | >5% |
| Delivery Rate | <95% | <90% |
| Open Rate | <15% | <10% |
| Reply Rate (cold) | <3% | <1% |

---

## Common Fixes

### Gmail OAuth Expired
```bash
npx tsx scripts/gmail-oauth-flow.ts <business>
# Update .env with new refresh token
```

### High Bounce Rate
```bash
# Process bounces
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process

# Validate list before next campaign
npx tsx .claude/skills/email-campaign-manager/scripts/email-validator.ts leads.csv
```

### Campaign Paused
```sql
-- Check status
SELECT * FROM smartlead_campaigns WHERE status = 'paused';

-- Check for issues before resuming
SELECT bounce_reason, COUNT(*) FROM smartlead_emails
WHERE bounced_at IS NOT NULL GROUP BY bounce_reason;
```

---

## Related Scripts (Existing)

### Teelixir Anniversary Upsell
| Script | Location |
|--------|----------|
| Sync Shopify variants | `teelixir/scripts/sync-shopify-variants.ts` |
| Queue anniversary emails | `teelixir/scripts/queue-anniversary-emails.ts` |
| Send anniversary upsell | `teelixir/scripts/send-anniversary-upsell.ts` |

### Teelixir Winback
| Script | Location |
|--------|----------|
| Send winback emails | `teelixir/scripts/send-winback-emails.ts` |
| Sync Klaviyo unengaged | `teelixir/scripts/sync-klaviyo-unengaged.ts` |

### Cold Outreach & Other
| Script | Location |
|--------|----------|
| Create Smartlead campaigns | `scripts/create-smartlead-campaigns.ts` |
| Gmail OAuth flow | `scripts/gmail-oauth-flow.ts` |
| Elevate email sender | `elevate-wholesale/scripts/prospecting/email-sender.ts` |

---

## Playbooks

- [Campaign Launch](playbooks/CAMPAIGN-LAUNCH.md) - Step-by-step launch guide
- [Troubleshooting](playbooks/TROUBLESHOOTING.md) - Common issues and fixes

## Context Docs

- [Business Email Map](context/BUSINESS-EMAIL-MAP.md) - Email systems per business
- [Error Patterns](context/ERROR-PATTERNS.md) - Error codes and solutions
