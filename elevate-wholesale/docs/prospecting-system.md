# Elevate Wholesale Outbound Prospecting System

Automated B2B outreach system for converting HubSpot contacts to Shopify B2B customers.

## Overview

The system processes contacts from HubSpot through a multi-stage funnel:

```
HubSpot Contacts (10,000+)
         │
         ▼ (5/day configurable)
┌─────────────────────┐
│   Daily Processor   │  Creates Shopify B2B account
│   + Welcome Email   │  Adds 'approved' tag
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Login Detector    │  Checks Shopify customer state
│   (daily scan)      │  daily to detect first login
└─────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 ACTIVE    EXPIRED
(logged    (30 days,
  in)      no login)
```

## Components

### 1. Daily Processor
**Script:** `scripts/prospecting/daily-processor.ts`

Runs daily to:
- Query HubSpot for eligible contacts (no `outreach_status` set)
- Create Shopify B2B accounts with 'approved' tag
- Queue welcome email for sending
- Update HubSpot with tracking properties

```bash
# Dry run (no changes)
npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts --dry-run

# Process 5 contacts (default)
npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts

# Process custom number
npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts --limit 10
```

### 2. Email Sender
**Script:** `scripts/prospecting/email-sender.ts`

Processes pending emails from the queue:
- Loads HTML templates from `templates/prospecting/`
- Replaces variables (`{{company_name}}`, `{{email}}`)
- Sends via Gmail OAuth2

```bash
# Dry run
npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts --dry-run

# Send pending emails (max 50)
npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts

# Custom limit
npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts --limit 20
```

### 3. Login Detector
**Script:** `scripts/prospecting/login-detector.ts`

Runs daily to check login status:
- Queries Shopify customer `state` field
- `state === 'enabled'` means customer has logged in
- After 30 days without login, removes 'approved' tag

```bash
# Dry run
npx tsx elevate-wholesale/scripts/prospecting/login-detector.ts --dry-run

# Run login check
npx tsx elevate-wholesale/scripts/prospecting/login-detector.ts
```

### 4. CLI Management
**Script:** `scripts/prospecting/cli.ts`

```bash
# Show status
npx tsx elevate-wholesale/scripts/prospecting/cli.ts status

# Pause/resume
npx tsx elevate-wholesale/scripts/prospecting/cli.ts pause "Holiday break"
npx tsx elevate-wholesale/scripts/prospecting/cli.ts resume

# Configure
npx tsx elevate-wholesale/scripts/prospecting/cli.ts set-limit 10
npx tsx elevate-wholesale/scripts/prospecting/cli.ts set-category beauty

# Preview next batch
npx tsx elevate-wholesale/scripts/prospecting/cli.ts preview

# Skip/reprocess contacts
npx tsx elevate-wholesale/scripts/prospecting/cli.ts skip <hubspot_id> "Reason"
npx tsx elevate-wholesale/scripts/prospecting/cli.ts reprocess <queue_id>

# Reporting
npx tsx elevate-wholesale/scripts/prospecting/cli.ts funnel
npx tsx elevate-wholesale/scripts/prospecting/cli.ts pending-emails
```

## Setup

### 1. Database Schema

Run the migration to create required tables:

```sql
-- Run via Supabase SQL Editor or migration
-- File: infra/supabase/migrations/20251128_prospecting_schema.sql
```

Tables created:
- `prospecting_queue` - Main contact tracking
- `prospecting_emails` - Email sequence queue
- `prospecting_run_log` - Daily run audit log

### 2. HubSpot Properties

Run the property setup script:

```bash
npx tsx scripts/setup-hubspot-properties.ts
```

Properties created:
- `outreach_status` - Tracks contact through funnel
- `lead_category` - Segmentation (beauty/fitness)
- `outreach_start_date` - When contact entered funnel
- `outreach_end_date` - When contact completed/expired

### 3. Gmail OAuth2

Follow the setup guide: [Gmail OAuth2 Setup](./gmail-oauth2-setup.md)

Environment variables required:
```env
ELEVATE_GMAIL_CLIENT_ID=your_client_id
ELEVATE_GMAIL_CLIENT_SECRET=your_client_secret
ELEVATE_GMAIL_REFRESH_TOKEN=your_refresh_token
ELEVATE_GMAIL_USER_EMAIL=outreach@elevatewholesale.com.au
ELEVATE_GMAIL_FROM_NAME=Elevate Wholesale
```

### 4. Other Environment Variables

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# HubSpot
HUBSPOT_ACCESS_TOKEN=your_access_token

# Shopify (Elevate Wholesale)
ELEVATE_SHOPIFY_STORE_URL=elevate-wholesale.myshopify.com
ELEVATE_SHOPIFY_ACCESS_TOKEN=your_access_token
```

## Configuration

System configuration is stored in `system_config` table:

| Key | Default | Description |
|-----|---------|-------------|
| `prospecting_enabled` | `true` | Master on/off switch |
| `prospecting_daily_limit` | `5` | Contacts per day |
| `prospecting_lead_category` | `null` | Filter: beauty, fitness, or null for all |
| `prospecting_expiry_days` | `30` | Days before removing approved tag |
| `prospecting_reminder_1_days` | `7` | Days after welcome for reminder 1 |
| `prospecting_reminder_2_days` | `15` | Days after welcome for reminder 2 |
| `prospecting_final_reminder_days` | `23` | Days after welcome for final reminder |

## Email Templates

Templates are stored in `templates/prospecting/`:

- `welcome.html` - Initial welcome email
- `reminder_1.html` - First reminder (coming soon)
- `reminder_2.html` - Second reminder (coming soon)
- `final_reminder.html` - Final reminder (coming soon)
- `expiry_notice.html` - Access expiry notice (coming soon)

Template variables:
- `{{company_name}}` - Company name from HubSpot
- `{{email}}` - Contact email address

## Monitoring

### Supabase Views

- `v_prospecting_daily_summary` - Today's run status
- `v_prospecting_pending_emails` - Emails ready to send
- `v_prospecting_login_check` - Contacts needing login check
- `v_prospecting_funnel` - Conversion funnel by category
- `v_prospecting_weekly_stats` - Last 7 days of runs

### CLI Status

```bash
npx tsx elevate-wholesale/scripts/prospecting/cli.ts status
```

Shows:
- Configuration settings
- Queue statistics by status
- Today's run results
- Pending email count

## Cron Schedule

Recommended schedule (via Supabase Edge Functions or external cron):

```
# Daily processor - run at 6am AEST
0 6 * * * npx tsx elevate-wholesale/scripts/prospecting/daily-processor.ts

# Email sender - run every hour
0 * * * * npx tsx elevate-wholesale/scripts/prospecting/email-sender.ts

# Login detector - run at 7am AEST
0 7 * * * npx tsx elevate-wholesale/scripts/prospecting/login-detector.ts
```

## Contact Lifecycle

```
1. PENDING     - In HubSpot, not yet processed
2. PROCESSING  - Currently being processed
3. SENT        - Account created, awaiting login
4. ACTIVE      - Customer logged in (keep approved)
5. EXPIRED     - 30 days, no login (approved tag removed)
6. FAILED      - Error during processing
7. SKIPPED     - Manually skipped
```

## Troubleshooting

### No contacts being processed

1. Check if prospecting is enabled: `cli.ts status`
2. Check HubSpot contacts have no `outreach_status` set
3. Check lead_category filter matches contacts

### Emails not sending

1. Check Gmail OAuth2 credentials
2. Run health check: Gmail client has `healthCheck()` method
3. Check `prospecting_emails` table for errors

### Login detection not working

1. Verify Shopify customer ID is stored
2. Check Shopify API credentials
3. Customer `state` must be 'enabled' for login detection

## Future Enhancements

- [ ] Reminder email sequence (1, 2, final reminders)
- [ ] Expiry notice email
- [ ] A/B testing for email templates
- [ ] Conversion tracking dashboard
- [ ] Slack notifications for errors
