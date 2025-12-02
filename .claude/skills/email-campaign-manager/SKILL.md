---
name: email-campaign-manager
description: Comprehensive email campaign management across all businesses - Smartlead cold outreach, Klaviyo lifecycle, Gmail transactional, anniversary/winback automations. Handles campaign creation, validation, sending, bounce management, analytics, and compliance. Use for creating campaigns, validating leads, monitoring deliverability, analyzing performance, or troubleshooting email issues.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Email Campaign Manager Skill

Master skill for managing email campaigns across all 4 businesses in master-ops.

## When to Activate This Skill

Activate this skill when the user mentions:
- "create email campaign"
- "smartlead campaign"
- "send anniversary emails"
- "winback emails"
- "email validation"
- "bounce rate" or "bounces"
- "email deliverability"
- "klaviyo" or "email engagement"
- "beauty blast" or "cold outreach"
- "email analytics" or "open rates"
- "unsubscribe" or "suppression list"
- "email templates"

## Businesses & Email Systems

| Business | Platform | Email Systems |
|----------|----------|---------------|
| Teelixir | Shopify | Gmail OAuth2, Klaviyo, Smartlead (B2B outreach) |
| Elevate Wholesale | Shopify | Gmail OAuth2, HubSpot sequences |
| Buy Organics Online | BigCommerce | Gmail OAuth2, n8n alerts, Resend/SendGrid fallback |
| Red Hill Fresh | WooCommerce | Gmail OAuth2 |

## Core Capabilities

### 1. Cold Outreach Campaigns (Smartlead)
- Campaign creation and configuration
- Lead list validation and import
- Multi-step sequence setup
- Reply detection and HubSpot sync
- Performance analytics

### 2. Lifecycle Email Automation
- Anniversary emails (Teelixir - 15% discount, product-based timing)
- Winback campaigns (Teelixir - 40% MISSYOU40 discount)
- Trial expiration emails (Elevate)
- Checkout error alerts (BOO)

### 3. Email Validation & Hygiene
- Pre-send email validation
- Bounce tracking and suppression
- Engagement scoring
- List cleaning workflows

### 4. Deliverability Monitoring
- Bounce rate tracking
- Open/click rate analysis
- Provider health checks
- Domain reputation monitoring

### 5. Analytics & Reporting
- Campaign performance metrics
- Conversion tracking
- A/B test analysis
- Cross-campaign attribution

## Database Schema

### Smartlead Tables (Cold Outreach)

```sql
-- Campaign metadata
CREATE TABLE smartlead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT UNIQUE NOT NULL,  -- Smartlead's ID
  campaign_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',  -- draft, active, paused, completed
  sequence_count INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead tracking
CREATE TABLE smartlead_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT REFERENCES smartlead_campaigns(campaign_id),
  lead_id TEXT NOT NULL,  -- Smartlead's lead ID
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  status TEXT DEFAULT 'active',  -- active, replied, bounced, unsubscribed
  hubspot_contact_id TEXT,
  hubspot_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, email)
);

-- Email send events
CREATE TABLE smartlead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement events
CREATE TABLE smartlead_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- EMAIL_OPEN, EMAIL_LINK_CLICK, EMAIL_REPLY, LEAD_UNSUBSCRIBED
  event_data JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- HubSpot sync log
CREATE TABLE smartlead_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  sync_type TEXT NOT NULL,  -- contact_create, contact_update, deal_create
  hubspot_id TEXT,
  status TEXT NOT NULL,  -- success, failed
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Teelixir Anniversary Tables

```sql
-- Discount code tracking
CREATE TABLE tlx_anniversary_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  shopify_customer_id TEXT,
  shopify_order_id TEXT,  -- Original order triggering anniversary
  discount_code TEXT UNIQUE NOT NULL,  -- ANNIV-XXXXXX-XXX format
  shopify_price_rule_id TEXT,
  discount_percent INTEGER DEFAULT 15,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',  -- active, sent, used, expired, failed
  sent_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  converted_order_id TEXT,
  converted_order_total DECIMAL(10,2),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reorder timing rules
CREATE TABLE tlx_reorder_timing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL,
  product_size_grams INTEGER,
  email_send_day INTEGER NOT NULL,  -- Days after purchase
  sample_size INTEGER,
  confidence TEXT,  -- high (n>50), medium (n>20), low (n<20)
  UNIQUE(product_type, product_size_grams)
);

-- Automation configuration
CREATE TABLE tlx_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT UNIQUE NOT NULL,  -- anniversary_15, winback_40
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Teelixir Winback Tables

```sql
CREATE TABLE tlx_winback_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  klaviyo_profile_id TEXT,
  first_name TEXT,
  discount_code TEXT DEFAULT 'MISSYOU40',
  status TEXT DEFAULT 'pending',  -- pending, sent, clicked, converted, bounced, failed
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  order_id TEXT,
  order_total DECIMAL(10,2),
  send_hour_melbourne INTEGER,  -- Hour sent (for optimization)
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Klaviyo Integration Tables

```sql
CREATE TABLE tlx_klaviyo_unengaged (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  klaviyo_profile_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  last_order_date DATE,
  total_orders INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Views

```sql
-- Smartlead campaign performance
CREATE VIEW v_smartlead_campaign_performance AS
SELECT
  c.campaign_name,
  c.status,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'replied' THEN l.id END) as replies,
  COUNT(DISTINCT CASE WHEN l.status = 'bounced' THEN l.id END) as bounces,
  COUNT(DISTINCT CASE WHEN l.hubspot_synced_at IS NOT NULL THEN l.id END) as synced_to_hubspot,
  ROUND(COUNT(DISTINCT CASE WHEN l.status = 'replied' THEN l.id END)::numeric /
        NULLIF(COUNT(DISTINCT l.id), 0) * 100, 2) as reply_rate
FROM smartlead_campaigns c
LEFT JOIN smartlead_leads l ON c.campaign_id = l.campaign_id
GROUP BY c.campaign_id, c.campaign_name, c.status;

-- Anniversary campaign stats
CREATE VIEW tlx_anniversary_stats AS
SELECT
  COUNT(*) as total_codes,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as converted,
  SUM(CASE WHEN status = 'used' THEN converted_order_total END) as total_revenue,
  ROUND(COUNT(CASE WHEN status = 'used' THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN status = 'sent' THEN 1 END), 0) * 100, 2) as conversion_rate
FROM tlx_anniversary_discounts;

-- Candidates for anniversary email
CREATE VIEW v_tlx_anniversary_candidates AS
SELECT DISTINCT ON (o.customer_email)
  o.customer_email as email,
  c.first_name,
  o.shopify_order_id,
  o.processed_at as first_order_date,
  li.product_type,
  li.product_size_grams,
  COALESCE(rt.email_send_day, 30) as send_after_days,
  o.processed_at + (COALESCE(rt.email_send_day, 30) || ' days')::interval as send_date
FROM tlx_shopify_orders o
JOIN tlx_shopify_customers c ON o.customer_email = c.email
JOIN tlx_shopify_line_items li ON o.id = li.order_id
LEFT JOIN tlx_reorder_timing rt ON li.product_type = rt.product_type
  AND (rt.product_size_grams IS NULL OR li.product_size_grams = rt.product_size_grams)
WHERE o.is_first_order = true
  AND NOT EXISTS (
    SELECT 1 FROM tlx_anniversary_discounts ad
    WHERE ad.email = o.customer_email
  )
ORDER BY o.customer_email, o.processed_at;
```

## Email Sending Infrastructure

### Gmail OAuth2 (Primary)

All businesses use Gmail OAuth2 for transactional emails:

```typescript
// Gmail OAuth2 token refresh
async function getGmailAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const data = await response.json();
  return data.access_token;
}

// Send email via Gmail API
async function sendGmailEmail(accessToken: string, to: string, subject: string, htmlBody: string) {
  const mimeMessage = [
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    htmlBody
  ].join('\r\n');

  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });
}
```

### Fallback Providers (BOO)

```typescript
// Provider priority chain
const emailProviders = [
  { name: 'n8n_webhook', send: sendViaWebhook },
  { name: 'gmail_api', send: sendViaGmail },
  { name: 'resend', send: sendViaResend },
  { name: 'sendgrid', send: sendViaSendGrid }
];

async function sendWithFallback(email: EmailPayload): Promise<void> {
  for (const provider of emailProviders) {
    try {
      await provider.send(email);
      return;
    } catch (error) {
      console.error(`${provider.name} failed:`, error.message);
      continue;
    }
  }
  throw new Error('All email providers failed');
}
```

### Rate Limiting

| Campaign Type | Daily Limit | Send Window | Delay Between |
|--------------|-------------|-------------|---------------|
| Anniversary | 50/day | 9AM-7PM AEST | ~1 sec |
| Winback | 20/day | 9AM-7PM AEST | ~1 sec |
| Cold Outreach | 200/day | Smartlead managed | Smartlead managed |
| Alerts | Unlimited | 24/7 | None |

## Task Execution Methodology

### Phase 1: Campaign Creation

#### For Smartlead Cold Outreach

1. **Validate lead list**
   ```typescript
   // scripts/validate-campaign-leads.ts
   async function validateLeads(csvPath: string): Promise<ValidationReport> {
     const leads = await parseCSV(csvPath);
     const results = {
       total: leads.length,
       valid: 0,
       invalid: [],
       duplicates: [],
       suppressed: []
     };

     for (const lead of leads) {
       // Email syntax check
       if (!isValidEmail(lead.email)) {
         results.invalid.push({ email: lead.email, reason: 'invalid_syntax' });
         continue;
       }

       // Check suppression list
       const suppressed = await checkSuppression(lead.email);
       if (suppressed) {
         results.suppressed.push({ email: lead.email, reason: suppressed.reason });
         continue;
       }

       // Check duplicates
       const existing = await checkExisting(lead.email);
       if (existing) {
         results.duplicates.push({ email: lead.email, campaign: existing.campaign });
         continue;
       }

       results.valid++;
     }

     return results;
   }
   ```

2. **Create campaign in Smartlead**
   ```typescript
   // Use existing: scripts/create-smartlead-campaigns.ts
   const response = await fetch('https://server.smartlead.ai/api/v1/campaigns/create', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'api-key': process.env.SMARTLEAD_API_KEY
     },
     body: JSON.stringify({
       name: campaignName,
       client_id: null,
       timezone: 'Australia/Sydney'
     })
   });
   ```

3. **Upload leads**
   ```typescript
   await fetch(`https://server.smartlead.ai/api/v1/campaigns/${campaignId}/leads`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'api-key': process.env.SMARTLEAD_API_KEY
     },
     body: JSON.stringify({
       lead_list: validatedLeads.map(l => ({
         email: l.email,
         first_name: l.first_name,
         last_name: l.last_name,
         company_name: l.company,
         custom_fields: { industry: l.industry }
       }))
     })
   });
   ```

4. **Configure sequences**
   ```typescript
   // Add email sequences
   for (const sequence of sequences) {
     await fetch(`https://server.smartlead.ai/api/v1/campaigns/${campaignId}/sequences`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'api-key': process.env.SMARTLEAD_API_KEY
       },
       body: JSON.stringify({
         seq_number: sequence.number,
         seq_delay_details: { delay_in_days: sequence.delayDays },
         subject: sequence.subject,
         email_body: sequence.body
       })
     });
   }
   ```

5. **Log to Supabase**
   ```typescript
   await supabase.from('smartlead_campaigns').insert({
     campaign_id: campaignId,
     campaign_name: campaignName,
     status: 'draft',
     sequence_count: sequences.length,
     total_leads: validatedLeads.length
   });
   ```

### Phase 2: Anniversary Email Automation

1. **Get candidates**
   ```sql
   SELECT * FROM v_tlx_anniversary_candidates
   WHERE send_date <= CURRENT_DATE
   LIMIT 50;  -- Daily limit
   ```

2. **Generate discount codes**
   ```typescript
   // scripts/send-anniversary-emails.ts
   function generateDiscountCode(): string {
     const random = crypto.randomBytes(6).toString('hex').toUpperCase();
     return `ANNIV-${random.slice(0,6)}-${random.slice(6,9)}`;
   }

   // Create in Shopify
   async function createShopifyDiscount(code: string, email: string): Promise<string> {
     const priceRule = await shopify.priceRules.create({
       title: `Anniversary - ${email}`,
       target_type: 'line_item',
       target_selection: 'all',
       allocation_method: 'across',
       value_type: 'percentage',
       value: '-15.0',
       customer_selection: 'prerequisite',
       prerequisite_customer_ids: [customerId],
       starts_at: new Date().toISOString(),
       ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
       usage_limit: 1
     });

     await shopify.discountCodes.create(priceRule.id, { code });
     return priceRule.id;
   }
   ```

3. **Send email**
   ```typescript
   const htmlBody = `
     <h1>Happy Anniversary, ${firstName}!</h1>
     <p>It's been a year since your first Teelixir order.</p>
     <p>Use code <strong>${discountCode}</strong> for 15% off your next order.</p>
     <p>Valid for 14 days.</p>
   `;

   await sendGmailEmail(accessToken, email, 'Your Anniversary Gift from Teelixir', htmlBody);
   ```

4. **Track in database**
   ```typescript
   await supabase.from('tlx_anniversary_discounts').update({
     status: 'sent',
     sent_at: new Date().toISOString()
   }).eq('discount_code', discountCode);
   ```

### Phase 3: Bounce Management

1. **Process Smartlead bounces**
   ```typescript
   // Webhook handler for Smartlead events
   async function handleSmartleadWebhook(event: SmartleadEvent) {
     if (event.event_type === 'EMAIL_BOUNCED') {
       await supabase.from('smartlead_emails').update({
         bounced_at: new Date().toISOString(),
         bounce_reason: event.bounce_reason
       }).eq('lead_id', event.lead_id);

       // Add to suppression list
       await addToSuppressionList(event.email, 'bounce', event.bounce_reason);

       // Update lead status
       await supabase.from('smartlead_leads').update({
         status: 'bounced'
       }).eq('lead_id', event.lead_id);
     }
   }
   ```

2. **Check bounce rates**
   ```sql
   -- Alert if bounce rate > 5%
   SELECT
     campaign_name,
     COUNT(*) as total_sent,
     COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END) as bounces,
     ROUND(COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END)::numeric /
           COUNT(*) * 100, 2) as bounce_rate
   FROM smartlead_emails e
   JOIN smartlead_campaigns c ON e.campaign_id = c.campaign_id
   WHERE e.sent_at > NOW() - INTERVAL '24 hours'
   GROUP BY c.campaign_name
   HAVING COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END)::numeric /
          COUNT(*) > 0.05;
   ```

### Phase 4: Analytics & Reporting

1. **Campaign performance report**
   ```typescript
   async function getCampaignReport(campaignId: string): Promise<CampaignReport> {
     const { data: campaign } = await supabase
       .from('v_smartlead_campaign_performance')
       .select('*')
       .eq('campaign_id', campaignId)
       .single();

     const { data: engagement } = await supabase
       .from('smartlead_engagement')
       .select('event_type, COUNT(*)')
       .eq('campaign_id', campaignId)
       .group('event_type');

     return {
       name: campaign.campaign_name,
       totalLeads: campaign.total_leads,
       sent: campaign.sent,
       opens: engagement.find(e => e.event_type === 'EMAIL_OPEN')?.count || 0,
       clicks: engagement.find(e => e.event_type === 'EMAIL_LINK_CLICK')?.count || 0,
       replies: campaign.replies,
       bounces: campaign.bounces,
       openRate: calculateRate(opens, sent),
       clickRate: calculateRate(clicks, opens),
       replyRate: campaign.reply_rate,
       bounceRate: calculateRate(bounces, sent)
     };
   }
   ```

2. **Anniversary conversion tracking**
   ```sql
   -- Track discount code usage
   UPDATE tlx_anniversary_discounts ad
   SET
     status = 'used',
     used_at = o.created_at,
     converted_order_id = o.shopify_order_id,
     converted_order_total = o.total_price
   FROM tlx_shopify_orders o
   WHERE o.discount_codes @> jsonb_build_array(jsonb_build_object('code', ad.discount_code))
     AND ad.status = 'sent';
   ```

## Reference Files

### Existing Scripts

#### Teelixir Anniversary Upsell
- [teelixir/scripts/sync-shopify-variants.ts](../../../teelixir/scripts/sync-shopify-variants.ts) - Sync Shopify variants to Supabase
- [teelixir/scripts/queue-anniversary-emails.ts](../../../teelixir/scripts/queue-anniversary-emails.ts) - Queue candidates based on product timing
- [teelixir/scripts/send-anniversary-upsell.ts](../../../teelixir/scripts/send-anniversary-upsell.ts) - Send personalized upsell emails

#### Teelixir Winback
- [teelixir/scripts/send-winback-emails.ts](../../../teelixir/scripts/send-winback-emails.ts) - Winback automation
- [teelixir/scripts/sync-klaviyo-unengaged.ts](../../../teelixir/scripts/sync-klaviyo-unengaged.ts) - Klaviyo sync

#### Smartlead Cold Outreach
- [scripts/create-smartlead-campaigns.ts](../../../scripts/create-smartlead-campaigns.ts) - Campaign creation
- [scripts/setup-smartlead-properties.ts](../../../scripts/setup-smartlead-properties.ts) - Smartlead setup
- [scripts/validate-smartlead-setup.ts](../../../scripts/validate-smartlead-setup.ts) - Setup validation

#### Analytics & Monitoring
- [scripts/klaviyo-engagement-analysis.js](../../../scripts/klaviyo-engagement-analysis.js) - Engagement analysis
- [elevate-wholesale/scripts/prospecting/email-sender.ts](../../../elevate-wholesale/scripts/prospecting/email-sender.ts) - Elevate emails

### Database Schema Files
- [infra/supabase/schema-smartlead-tracking.sql](../../../infra/supabase/schema-smartlead-tracking.sql)
- [infra/supabase/migrations/20251201_tlx_anniversary_automation.sql](../../../infra/supabase/migrations/20251201_tlx_anniversary_automation.sql)
- [infra/supabase/migrations/20251201_teelixir_automations.sql](../../../infra/supabase/migrations/20251201_teelixir_automations.sql)

### n8n Workflows
- [infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json](../../../infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json)
- [infra/n8n-workflows/boo-checkout-error-email.json](../../../infra/n8n-workflows/boo-checkout-error-email.json)

### Integration Libraries
- [shared/libs/alerts/email-alerts.ts](../../../shared/libs/alerts/email-alerts.ts) - Alert emails
- [shared/libs/integrations/hubspot/client.ts](../../../shared/libs/integrations/hubspot/client.ts) - HubSpot sync
- [buy-organics-online/supabase/functions/checkout-error-collector/index.ts](../../../buy-organics-online/supabase/functions/checkout-error-collector/index.ts)

## Environment Variables Required

```bash
# Smartlead
SMARTLEAD_API_KEY=

# Klaviyo
TEELIXIR_KLAVIYO_API_KEY=

# Gmail OAuth2 - Teelixir
TEELIXIR_GMAIL_CLIENT_ID=
TEELIXIR_GMAIL_CLIENT_SECRET=
TEELIXIR_GMAIL_REFRESH_TOKEN=

# Gmail OAuth2 - BOO
BOO_GMAIL_CLIENT_ID=
BOO_GMAIL_CLIENT_SECRET=
BOO_GMAIL_REFRESH_TOKEN=

# Gmail OAuth2 - Elevate
ELEVATE_GMAIL_CLIENT_ID=
ELEVATE_GMAIL_CLIENT_SECRET=
ELEVATE_GMAIL_REFRESH_TOKEN=

# Fallback Providers (BOO)
RESEND_API_KEY=
SENDGRID_API_KEY=

# n8n Webhook
N8N_EMAIL_WEBHOOK_URL=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Shopify (for discount codes)
TEELIXIR_SHOPIFY_STORE=
TEELIXIR_SHOPIFY_ACCESS_TOKEN=

# HubSpot
HUBSPOT_API_KEY=
```

## Guardrails & Compliance

### Send Limits
- Cold outreach: 200 emails/day per mailbox
- Anniversary: 50 emails/day
- Winback: 20 emails/day
- Alerts: No limit (but throttle if > 100/hour)

### Required Headers
```
List-Unsubscribe: <mailto:unsubscribe@domain.com>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

### Bounce Thresholds
- Warning: > 3% bounce rate
- Critical: > 5% bounce rate (pause campaign)
- Hard bounce: Immediately suppress email

### Suppression Rules
- Hard bounce: Permanent suppression
- Soft bounce: 3 attempts, then suppress for 30 days
- Unsubscribe: Permanent suppression
- Spam complaint: Permanent suppression + review campaign

## Known Issues & Gaps

### Current Gaps (To Address)
1. **No pre-send email validation** - Need syntax + MX check
2. **No centralized suppression list** - Each campaign manages separately
3. **No A/B testing framework** - Templates not versioned
4. **No unsubscribe link automation** - Manual in each template
5. **No deliverability dashboard** - Metrics scattered across systems

### Security Issues to Fix
1. Hardcoded API keys in some scripts (move to env vars)
2. No API key rotation schedule
3. OAuth tokens not auto-refreshed in some scripts

## Success Criteria

A successful email campaign session should:
- Validate all leads before importing (syntax + suppression)
- Track all send events in database
- Handle bounces immediately (suppress + alert)
- Provide clear performance metrics
- Respect all rate limits and send windows
- Sync engagement to HubSpot within 24 hours
- Generate actionable reports with recommendations
- Never send to suppressed emails
- Include unsubscribe mechanism in all marketing emails

## Emergency Procedures

### High Bounce Rate Detected
1. Immediately pause campaign in Smartlead
2. Pull bounce reasons from `smartlead_emails`
3. Identify pattern (invalid domain, full mailbox, etc.)
4. Clean list and re-validate
5. Contact ESP if domain-wide issue

### Gmail OAuth Token Expired
1. Check error: `invalid_grant` or `Token has been revoked`
2. Re-run OAuth flow: `npx tsx scripts/gmail-oauth-flow.ts`
3. Update refresh token in `.env`
4. Restart affected services

### Smartlead Webhook Not Firing
1. Check webhook URL in Smartlead dashboard
2. Verify n8n workflow is active
3. Test with manual webhook trigger
4. Check n8n execution logs

## Supporting Resources

- [Smartlead API Docs](https://help.smartlead.ai/api-documentation)
- [Klaviyo API Docs](https://developers.klaviyo.com/en/reference/api-overview)
- [Gmail API Docs](https://developers.google.com/gmail/api/reference/rest)
- [HubSpot API Docs](https://developers.hubspot.com/docs/api/overview)
