# Red Hill Fresh: Connectivity & Email Marketing System Plan

*Created: 2025-12-06*
*Status: Planning*
*Owner: Co-Founder Agent (Edward)*

---

## Executive Summary

This plan covers two interconnected initiatives:
1. **Priority 0: API Connectivity** - Get RHF connected to all Google services (Ads, Analytics, GSC, GBP)
2. **Self-Hosted Email Marketing** - Extend Teelixir's Gmail-based email system to all 4 businesses

**Cost Impact:** Eliminates need for Klaviyo/Mailchimp ($45-150/month per business)

---

## Part 1: Priority 0 - API Connectivity

### 1.1 Google Ads Developer Token

**Status:** Not Started
**Blocker for:** All Google Ads integrations across all 4 businesses

| Step | Action | Owner | Time |
|------|--------|-------|------|
| 1 | Log into Google Ads MCC account | Jayson | - |
| 2 | Go to Tools & Settings → Setup → API Center | Jayson | 2 min |
| 3 | Click "Apply for access" | Jayson | 5 min |
| 4 | Fill application (use text below) | Jayson | 5 min |
| 5 | Receive test token (immediate) | Auto | - |
| 6 | Wait for Basic Access approval | Google | 1-2 days |
| 7 | Store in vault: `global/google_ads_developer_token` | Jayson | 2 min |

**Application Text:**
```
Company: GrowthCo HQ Pty Ltd
Use case: Internal business automation and reporting dashboard

Description: We operate 4 e-commerce businesses and need API access for:
- Automated daily performance reporting to our internal dashboard
- Search term analysis and negative keyword management
- Budget pacing and bid optimization recommendations
- Campaign performance alerts

This is for internal use only - we are not an agency or reseller.
```

### 1.2 RHF Credential Requirements

| Credential | Source | Vault Key | Status |
|------------|--------|-----------|--------|
| **WooCommerce** | | | |
| Consumer Key | WP Admin → WooCommerce → Settings → Advanced → REST API | `redhillfresh/wc_consumer_key` | Exists |
| Consumer Secret | Same | `redhillfresh/wc_consumer_secret` | Exists |
| **Google Ads** | | | |
| Developer Token | MCC → API Center | `global/google_ads_developer_token` | **NEEDED** |
| Customer ID | RHF Ads account → Settings → Account settings | `redhillfresh/google_ads_customer_id` | **NEEDED** |
| Refresh Token | OAuth flow | `redhillfresh/google_ads_refresh_token` | **NEEDED** |
| **Google Analytics 4** | | | |
| Property ID | GA4 Admin → Property → Property Settings | `redhillfresh/ga4_property_id` | **NEEDED** |
| Refresh Token | Shared with Ads OAuth | Shared | **NEEDED** |
| **Google Search Console** | | | |
| Site URL | `sc-domain:redhillfresh.com.au` | Config only | Verify access |
| Refresh Token | Shared with Ads OAuth | Shared | **NEEDED** |
| **Google Business Profile** | | | |
| Account ID | GBP Manager → Settings | `redhillfresh/gbp_account_id` | **NEEDED** |
| Location ID | GBP → Business → Info | `redhillfresh/gbp_location_id` | **NEEDED** |
| Refresh Token | Shared with Ads OAuth | Shared | **NEEDED** |
| **Gmail (for emails)** | | | |
| Refresh Token | OAuth for orders@redhillfresh.com.au | `redhillfresh/gmail_refresh_token` | **NEEDED** |
| **Xero** | | | |
| Tenant ID | Xero Developer Portal | `redhillfresh/xero_tenant_id` | Check vault |
| Refresh Token | OAuth flow | `redhillfresh/xero_refresh_token` | Check vault |

### 1.3 OAuth Token Generation Process

**All Google services can share one OAuth consent flow:**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Use existing OAuth client (or create new for RHF)
3. Run OAuth flow with scopes:
   ```
   https://www.googleapis.com/auth/adwords
   https://www.googleapis.com/auth/analytics.readonly
   https://www.googleapis.com/auth/webmasters.readonly
   https://www.googleapis.com/auth/business.manage
   https://www.googleapis.com/auth/gmail.send
   ```
4. Authorize as jayson@fyic.com.au (or account with access to all properties)
5. Capture refresh token
6. Store in vault

**Script location:** `scripts/generate-google-oauth-token.ts` (to be created)

---

## Part 2: Self-Hosted Email Marketing System

### 2.1 Current State (Teelixir)

**Working automations:**
| Automation | Discount | Trigger | Code |
|------------|----------|---------|------|
| Winback | 40% | 90+ days no engagement | `teelixir/scripts/send-winback-emails.ts` |
| Anniversary | 15% unique | Days since first order | `teelixir/scripts/send-anniversary-emails.ts` |

**Infrastructure:**
- Gmail OAuth2 sending via `colette@teelixir.com`
- Supabase for queue management & tracking
- ops.growthcohq.com for open/click tracking
- n8n for scheduling

**Cost:** $0/month

### 2.2 Proposed Architecture

```
infra/email-marketing/
├── core/
│   ├── gmail-sender.ts           # Shared Gmail OAuth2 sender (refactored from Teelixir)
│   ├── email-queue.ts            # Business-agnostic queue management
│   ├── tracking.ts               # Open/click tracking via ops.growthcohq.com
│   ├── template-renderer.ts      # HTML email generation with brand variables
│   └── discount-generator.ts     # Platform-specific discount code generation
├── templates/
│   ├── base/
│   │   ├── transactional.html    # Order confirmation, shipping, etc.
│   │   ├── promotional.html      # Sales, specials, campaigns
│   │   └── winback.html          # Re-engagement template
│   ├── teelixir/
│   │   ├── brand.json            # Colors, fonts, logo URLs
│   │   ├── winback.html          # Override base if needed
│   │   └── anniversary.html
│   ├── boo/
│   │   ├── brand.json
│   │   └── ...
│   ├── rhf/
│   │   ├── brand.json
│   │   ├── weekly-specials.html  # RHF-specific: Tuesday specials
│   │   ├── delivery-reminder.html
│   │   └── ...
│   └── elevate/
│       ├── brand.json
│       └── ...
├── automations/
│   ├── winback/
│   │   ├── index.ts              # Shared winback logic
│   │   └── config.ts             # Per-business configuration
│   ├── post-purchase/
│   │   ├── index.ts
│   │   └── config.ts
│   ├── abandoned-cart/
│   │   ├── index.ts
│   │   └── config.ts
│   └── rhf-specific/
│       ├── weekly-specials.ts    # Tuesday specials from pricelist
│       └── delivery-reminder.ts  # Day-before delivery reminder
└── scripts/
    ├── process-queue.ts          # Called by n8n every hour
    ├── sync-unsubscribes.ts      # Handle unsubscribe requests
    └── generate-report.ts        # Weekly email performance report
```

### 2.3 Database Schema

```sql
-- Shared email infrastructure tables
-- Location: infra/supabase/migrations/YYYYMMDD_email_marketing_core.sql

-- Email templates registry
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    template_key TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    variables JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business, template_key)
);

-- Email queue (unified across businesses)
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    automation_type TEXT NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    template_key TEXT NOT NULL,
    template_variables JSONB DEFAULT '{}',
    scheduled_date DATE NOT NULL,
    scheduled_hour INTEGER NOT NULL CHECK (scheduled_hour >= 0 AND scheduled_hour <= 23),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_queue_pending (business, scheduled_date, scheduled_hour, status)
);

-- Email events (opens, clicks, conversions)
CREATE TABLE email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    email TEXT NOT NULL,
    automation_type TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'open', 'click', 'unsubscribe', 'bounce', 'conversion')),
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_events_email (business, email, created_at DESC)
);

-- Unsubscribe list
CREATE TABLE email_unsubscribes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    email TEXT NOT NULL,
    reason TEXT,
    unsubscribed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business, email)
);

-- Automation configuration (like tlx_automation_config but unified)
CREATE TABLE email_automation_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business TEXT NOT NULL,
    automation_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false,
    config JSONB NOT NULL,
    last_run_at TIMESTAMP,
    last_run_result JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business, automation_type)
);
```

### 2.4 RHF Email Automations

| Automation | Trigger | Template | Send Time | Priority |
|------------|---------|----------|-----------|----------|
| **Weekly Specials** | Tuesday cron | `rhf/weekly-specials.html` | Tuesday 6am | P1 |
| **Order Confirmation** | Order webhook | `rhf/order-confirmation.html` | Immediate | P1 |
| **Delivery Reminder** | Day before delivery | `rhf/delivery-reminder.html` | 4pm day before | P2 |
| **Post-Delivery Review** | 1 day after delivery | `rhf/review-request.html` | 10am next day | P2 |
| **Welcome Series** | First order | `rhf/welcome.html` | Immediate | P2 |
| **Winback** | 30 days no order | `rhf/winback.html` | 10am | P3 |

### 2.5 Gmail Sender Configuration

| Business | Sender Email | Daily Limit | Brand Name |
|----------|--------------|-------------|------------|
| Teelixir | colette@teelixir.com | 500 | Colette from Teelixir |
| BOO | hello@buyorganicsonline.com.au | 500 | Buy Organics Online |
| RHF | orders@redhillfresh.com.au | 500 | Red Hill Fresh |
| Elevate | sales@elevatewholesale.com.au | 500 | Elevate Wholesale |

**Note:** If volume exceeds 500/day, we can:
1. Add additional sender accounts
2. Switch to AWS SES (~$0.10 per 1,000 emails)
3. Use Google Workspace domain-wide delegation

### 2.6 Cost Analysis

| Solution | Setup Cost | Monthly Cost | Emails/Month |
|----------|------------|--------------|--------------|
| **Gmail API (this plan)** | $0 | $0 | 60,000 (4 accounts × 500/day × 30) |
| Klaviyo (4 businesses) | $0 | $180-600 | Varies by tier |
| Mailchimp (4 businesses) | $0 | $80-400 | Varies by tier |
| AWS SES (if needed later) | $0 | ~$6 | 60,000 |

**Annual Savings:** $960 - $7,200 vs paid platforms

---

## Part 3: Implementation Phases

### Phase 1: Get Connected (Week 1)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1 | Apply for Google Ads developer token | Jayson | Token received |
| 1 | Document all RHF Google account IDs | Jayson | Account IDs list |
| 2 | Generate unified OAuth refresh token | Edward | Token in vault |
| 2 | Test Google Ads API connection | Edward | Health check passing |
| 3 | Test GA4 API connection | Edward | Data flowing |
| 3 | Test GSC API connection | Edward | Data flowing |
| 4 | Set up Gmail OAuth for RHF | Edward | Sending works |
| 5 | Verify all connections | Edward | Dashboard showing all green |

### Phase 2: Email Core Infrastructure (Week 2)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1 | Refactor Teelixir Gmail sender to shared module | Edward | `infra/email-marketing/core/` |
| 2 | Create database migration | Edward | Schema deployed |
| 3 | Build template renderer with brand support | Edward | Renderer working |
| 4 | Create RHF brand.json | Edward | Brand config |
| 5 | Build queue processor | Edward | Hourly processing working |

### Phase 3: RHF Email Automations (Week 3)

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1-2 | Build weekly specials automation | Edward | Tuesday emails sending |
| 3 | Build order confirmation | Edward | Immediate send on order |
| 4 | Build delivery reminder | Edward | Day-before reminders |
| 5 | Build winback automation | Edward | 30-day re-engagement |

### Phase 4: Extend to Other Businesses (Week 4+)

| Task | Business | Priority |
|------|----------|----------|
| Migrate Teelixir to shared infrastructure | Teelixir | P1 |
| Set up BOO email automations | BOO | P2 |
| Set up Elevate email automations | Elevate | P3 |

---

## Part 4: Success Metrics

### Connectivity
- [ ] All 4 businesses connected to Google Ads API
- [ ] All 4 businesses connected to GA4
- [ ] All 4 businesses connected to GSC
- [ ] RHF connected to GBP API

### Email System
- [ ] Weekly specials email open rate > 25%
- [ ] Order confirmation delivery rate > 99%
- [ ] Winback conversion rate > 5%
- [ ] Zero paid email platform subscriptions

---

## Part 5: Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gmail daily limit exceeded | Low (RHF ~500 customers) | Medium | Add secondary sender or AWS SES |
| Google Ads token rejected | Low | High | Resubmit with more detail |
| OAuth token expiry | Medium | Low | Implement refresh token rotation |
| Email deliverability issues | Low | High | Monitor bounce rates, set up DKIM/SPF |

---

## Appendix A: Credential Checklist for Jayson

### Google Ads Developer Token
- [ ] Logged into MCC account
- [ ] Applied in API Center
- [ ] Received test token
- [ ] Received Basic Access (1-2 days)
- [ ] Sent token to Edward

### RHF Account IDs Needed
- [ ] Google Ads Customer ID: _______________
- [ ] GA4 Property ID: _______________
- [ ] GBP Account ID: _______________
- [ ] GBP Location ID: _______________

### Gmail OAuth
- [ ] Confirm sender email: orders@redhillfresh.com.au
- [ ] Grant OAuth consent for Gmail API

---

## Appendix B: File Locations

| Component | Path |
|-----------|------|
| This plan | `.claude/knowledge/pipelines/rhf-connectivity-email-system.md` |
| RHF agents | `.claude/agents/rhf/` |
| RHF knowledge | `.claude/knowledge/businesses/rhf/` |
| Email infrastructure | `infra/email-marketing/` (to be created) |
| Database migrations | `infra/supabase/migrations/` |
| Teelixir email scripts | `teelixir/scripts/send-*.ts` |
| Shared integrations | `shared/libs/integrations/` |

---

*Document version: 1.0*
*Next review: After Phase 1 completion*
