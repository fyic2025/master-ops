# Business Email Infrastructure Map

Detailed mapping of email systems, accounts, and configurations for each business.

## Teelixir

### Primary Email: Gmail OAuth2
- **Sender**: colette@teelixir.com
- **OAuth Credentials**: `TEELIXIR_GMAIL_*`
- **Use Cases**:
  - Anniversary emails (15% discount)
  - Winback emails (40% MISSYOU40)
  - Transactional notifications

### Klaviyo Integration
- **API Key**: `TEELIXIR_KLAVIYO_API_KEY`
- **Lists Synced**:
  - Unengaged customers (weekly sync)
  - Suppression list
- **Table**: `tlx_klaviyo_unengaged`

### Smartlead (B2B Outreach)
- **API Key**: `SMARTLEAD_API_KEY`
- **Use Cases**:
  - Beauty Blast campaigns
  - Partner recruitment
  - B2B prospecting

### Active Automations

| Automation | Trigger | Discount | Daily Limit |
|------------|---------|----------|-------------|
| Anniversary | First order + reorder timing | 15% (unique code) | 50 |
| Winback | Klaviyo unengaged pool | 40% (MISSYOU40) | 20 |
| B2B Outreach | Lead list upload | N/A | 200 |

### Database Tables
- `tlx_anniversary_discounts` - Anniversary tracking
- `tlx_winback_emails` - Winback tracking
- `tlx_reorder_timing` - Product timing rules
- `tlx_automation_config` - Config settings
- `tlx_klaviyo_unengaged` - Klaviyo sync
- `tlx_shopify_orders` - Order history
- `tlx_shopify_line_items` - Line items for timing

---

## Buy Organics Online (BOO)

### Primary Email: Gmail OAuth2 + Fallbacks
- **Sender**: sales@buyorganicsonline.com.au
- **OAuth Credentials**: `BOO_GMAIL_*`
- **Fallback Chain**:
  1. n8n webhook (Gmail SMTP)
  2. Gmail API direct
  3. Resend API
  4. SendGrid API

### Use Cases
- Checkout error alerts
- Order confirmations (BigCommerce native)
- Support notifications

### Alert System
- **Webhook**: `N8N_EMAIL_WEBHOOK_URL`
- **Recipients**:
  - To: sales@buyorganicsonline.com.au
  - CC: jayson@fyic.com.au
- **Trigger**: Checkout errors captured by Edge function

### Database Tables
- `boo_checkout_errors` - Error logs
- `integration_logs` - Email send logs

### n8n Workflows
- `boo-checkout-error-email.json` - Error notifications

---

## Elevate Wholesale

### Primary Email: Gmail OAuth2
- **Sender**: (configured in automation)
- **OAuth Credentials**: `ELEVATE_GMAIL_*`

### Use Cases
- Trial welcome emails
- Trial expiration reminders
- Prospecting sequences

### Prospecting System
- **Database**: `prospecting_emails`
- **Templates**: File-based (`{{variable}}` substitution)
- **Status Tracking**: pending → sent → failed → bounced

### HubSpot Integration
- Sequences for trial conversion
- Contact sync from Shopify
- Deal pipeline tracking

### Database Tables
- `prospecting_emails` - Email queue
- `prospecting_queue` - Lead queue
- `elevate_trials` - Trial accounts

---

## Red Hill Fresh (RHF)

### Primary Email: Gmail OAuth2
- **Sender**: (to be configured)
- **OAuth Credentials**: `RHF_GMAIL_*` (pending setup)

### Use Cases (Planned)
- Order confirmations
- Delivery notifications
- Reorder reminders

### Current Status
- WooCommerce order sync active
- Email automation pending setup

---

## Cross-Business Infrastructure

### Smartlead (Shared)
- **API Key**: Single key for all businesses
- **Tables**:
  - `smartlead_campaigns`
  - `smartlead_leads`
  - `smartlead_emails`
  - `smartlead_engagement`
  - `smartlead_sync_log`

### HubSpot (Shared)
- **API Key**: `HUBSPOT_API_KEY`
- **Sync Sources**:
  - Smartlead leads → Contacts
  - Shopify customers → Contacts
  - Trial accounts → Deals
- **Table**: `hubspot_sync_log`

### Suppression List (Shared)
- **Table**: `email_suppression_list`
- **Sources**:
  - Smartlead bounces
  - Anniversary failures
  - Winback bounces
  - Manual additions

### Alert System (Shared)
- **Module**: `shared/libs/alerts/email-alerts.ts`
- **SMTP Config**: `EMAIL_*` environment variables
- **Templates**:
  - Critical alerts
  - Integration failures
  - Workflow failures
  - Daily summaries
