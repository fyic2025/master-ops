# Smartlead Cold Outreach Integration - COMPLETE

**Status:** ✅ Fully Implemented - Ready for Deployment
**Last Updated:** 2025-11-21
**Phase:** Phase 4 - Cold Outreach Team

---

## 🎉 What's Been Built

You now have a **complete cold email outreach system** that automatically syncs Smartlead engagement data to HubSpot CRM, enabling your writing team to track prospect engagement and responses in real-time.

### Core Components

1. **✅ Smartlead API Integration Library**
   - Full TypeScript client with type safety
   - Rate limiting (10 req/2s)
   - Automatic retries
   - Complete API coverage (leads, campaigns, analytics, webhooks)

2. **✅ n8n Automation Workflow**
   - Real-time webhook processing
   - Automatic HubSpot contact creation/updates
   - Event-driven updates (sent, opened, clicked, replied, unsubscribed)
   - Supabase logging

3. **✅ HubSpot Custom Properties** (18 properties)
   - Outreach status tracking
   - Engagement metrics
   - Campaign attribution
   - Email sequence tracking

4. **✅ Supabase Database Schema**
   - Campaign tracking
   - Lead management
   - Email send history
   - Engagement analytics
   - Sync operation logging

5. **✅ Comprehensive Documentation**
   - API client usage guide
   - Deployment instructions
   - Testing procedures
   - Monitoring queries

---

## 📁 Files Created

### Integration Library
```
shared/libs/integrations/smartlead/
├── client.ts                    # Full API client
├── types.ts                     # TypeScript definitions
├── index.ts                     # Module exports
└── README.md                    # Usage documentation
```

### Infrastructure
```
infra/
├── n8n-workflows/templates/
│   └── smartlead-hubspot-sync.json    # Automation workflow
└── supabase/
    └── schema-smartlead-tracking.sql   # Database schema
```

### Scripts
```
scripts/
└── setup-smartlead-properties.ts      # HubSpot properties setup
```

---

## 🚀 Deployment Guide

### Prerequisites

**Required:**
- Smartlead PRO plan (API access required)
- Smartlead API key
- HubSpot access (already configured)
- n8n instance (already running)
- Supabase database (already configured)

**Get Your Smartlead API Key:**
1. Log into Smartlead: https://app.smartlead.ai
2. Go to Settings → Profile
3. Copy your API key

---

### Step 1: Configure Environment Variables (5 min)

Add to your [.env](/root/master-ops/.env) file:

```bash
# Smartlead Configuration
SMARTLEAD_API_KEY=your_api_key_here
```

---

### Step 2: Deploy Supabase Schema (5 min)

**Option A: SQL Editor (Recommended)**
1. Go to: https://supabase.com/dashboard/project/qcvfxxsnqvdfmpbcgdni/sql/new
2. Copy contents of [infra/supabase/schema-smartlead-tracking.sql](infra/supabase/schema-smartlead-tracking.sql)
3. Paste and click "Run"

**Option B: Command Line**
```bash
psql "postgresql://postgres:[PASSWORD]@db.qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" \
  -f infra/supabase/schema-smartlead-tracking.sql
```

**Verify Deployment:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM v_smartlead_campaign_performance;
```

---

### Step 3: Create HubSpot Properties (5 min)

```bash
# Test with dry-run first
npx tsx scripts/setup-smartlead-properties.ts --dry-run

# Deploy properties
npx tsx scripts/setup-smartlead-properties.ts
```

**Expected Output:**
```
🚀 Smartlead Cold Outreach Properties Setup
==========================================

📋 Setting up 18 Contact Properties...
✅ Created cold_outreach_status (contacts)
✅ Created smartlead_campaign_id (contacts)
✅ Created smartlead_campaign_name (contacts)
...

📊 Summary
==========

Contact Properties:
  ✅ Successful: 18
  ❌ Failed: 0
```

**Verify in HubSpot:**
1. Go to: https://app.hubspot.com/settings → Properties
2. Search for "cold_outreach_status"
3. Verify all 18 properties exist

---

### Step 4: Import n8n Workflow (10 min)

1. Go to: https://automation.growthcohq.com/workflows
2. Click "Import from File"
3. Upload: [infra/n8n-workflows/templates/smartlead-hubspot-sync.json](infra/n8n-workflows/templates/smartlead-hubspot-sync.json)
4. Verify credentials are linked:
   - **HubSpot API** (credential ID: 1)
   - **Supabase** (credential ID: 2)
5. Activate the workflow

**Get Webhook URL:**
The webhook trigger will generate a URL like:
```
https://automation.growthcohq.com/webhook/smartlead-webhook
```

Copy this URL - you'll need it in Step 5.

---

### Step 5: Configure Smartlead Webhook (5 min)

1. Log into Smartlead: https://app.smartlead.ai
2. Go to Settings → Webhooks
3. Click "Create Webhook"
4. Configure:
   - **Webhook URL:** `https://automation.growthcohq.com/webhook/smartlead-webhook`
   - **Event Types:** Select all:
     - ☑ EMAIL_SENT
     - ☑ EMAIL_OPEN
     - ☑ EMAIL_LINK_CLICK
     - ☑ EMAIL_REPLY
     - ☑ LEAD_UNSUBSCRIBED
   - **Scope:** User Level (applies to all campaigns)
5. Save

---

## 🧪 Testing (30 minutes)

### Test 1: Verify API Connection

```bash
cd /root/master-ops
npx tsx << 'EOF'
import { smartleadClient } from './shared/libs/integrations/smartlead'

async function test() {
  const health = await smartleadClient.healthCheck()
  console.log('✅ Smartlead API:', health.healthy ? 'Connected' : 'Failed')

  const campaigns = await smartleadClient.campaigns.list({ limit: 5 })
  console.log(`📊 Found ${campaigns.results.length} campaigns`)
}

test().catch(console.error)
EOF
```

**Expected Output:**
```
✅ Smartlead API: Connected
📊 Found 3 campaigns
```

---

### Test 2: Create Test Campaign

```bash
npx tsx << 'EOF'
import { smartleadClient } from './shared/libs/integrations/smartlead'

async function test() {
  const campaign = await smartleadClient.campaigns.create({
    name: 'TEST - Q1 2025 Outreach'
  })

  console.log('✅ Created campaign:', campaign.id)
  console.log('Campaign name:', campaign.name)
}

test().catch(console.error)
EOF
```

---

### Test 3: Add Test Lead

```bash
npx tsx << 'EOF'
import { smartleadClient } from './shared/libs/integrations/smartlead'

async function test() {
  const result = await smartleadClient.leads.add('YOUR_CAMPAIGN_ID', {
    lead_list: [
      {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        company_name: 'Test Company'
      }
    ]
  })

  console.log('✅ Added leads:', result.upload_count)
  console.log('Total leads:', result.total_leads)
}

test().catch(console.error)
EOF
```

---

### Test 4: Trigger Webhook Event

**Manually trigger a test webhook:**

```bash
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_SENT",
    "campaign_id": "test-campaign",
    "campaign_name": "Test Campaign",
    "lead_id": "test-lead-123",
    "lead_email": "test@example.com",
    "lead_first_name": "Test",
    "lead_last_name": "User",
    "timestamp": "2025-01-15T10:00:00Z",
    "data": {
      "email_sequence_number": 1,
      "email_subject": "Test Subject"
    }
  }'
```

**Verify in HubSpot:**
1. Go to: https://app.hubspot.com/contacts
2. Search for: test@example.com
3. Check properties:
   - `cold_outreach_status` = "contacted"
   - `smartlead_campaign_name` = "Test Campaign"
   - `first_outreach_date` = (today's date)

**Verify in Supabase:**
```sql
SELECT * FROM integration_logs
WHERE source = 'smartlead'
ORDER BY created_at DESC
LIMIT 5;
```

---

### Test 5: Check Campaign Analytics

```sql
-- Run in Supabase SQL Editor
SELECT * FROM v_smartlead_campaign_performance;

-- Check recent engagement
SELECT * FROM v_smartlead_recent_engagement LIMIT 10;
```

---

## 📊 Monitoring

### Daily Health Check

```sql
-- Run in Supabase SQL Editor

-- 1. Campaign Performance
SELECT
  campaign_name,
  total_leads,
  unique_opens,
  unique_replies,
  open_rate,
  reply_rate,
  synced_to_hubspot
FROM v_smartlead_campaign_performance
WHERE campaign_status = 'ACTIVE';

-- 2. Recent Engagement (Last 24 hours)
SELECT
  event_type,
  lead_email,
  campaign_name,
  occurred_at
FROM v_smartlead_recent_engagement
WHERE occurred_at >= NOW() - INTERVAL '24 hours';

-- 3. Sync Failures
SELECT * FROM v_smartlead_sync_failures;

-- 4. Leads Needing Sync
SELECT COUNT(*) as needs_sync FROM v_smartlead_needs_sync;
```

---

### n8n Execution Monitoring

1. Go to: https://automation.growthcohq.com/executions
2. Filter by workflow: "Smartlead → HubSpot Outreach Tracking"
3. Check for errors (should be all green)

---

### HubSpot Segmentation

**Create these lists in HubSpot:**

1. **Active Cold Outreach Prospects**
   - `cold_outreach_status` = "contacted" OR "engaged"
   - `source_system` = "smartlead"

2. **Highly Engaged Prospects**
   - `cold_outreach_status` = "highly_engaged"
   - `email_click_count` > 2

3. **Replied Prospects (Hot Leads)**
   - `cold_outreach_status` = "replied"
   - `lifecyclestage` = "marketingqualifiedlead"

4. **Unsubscribed**
   - `cold_outreach_status` = "unsubscribed"

---

## 🔧 Usage Examples

### Adding Leads to Campaign

```typescript
import { smartleadClient } from '@/shared/libs/integrations/smartlead'

// Add up to 100 leads per request
const result = await smartleadClient.leads.add(campaignId, {
  lead_list: [
    {
      email: 'prospect@company.com',
      first_name: 'John',
      last_name: 'Doe',
      company_name: 'Acme Inc',
      website: 'https://acme.com',
      custom_fields: {
        industry: 'Technology',
        company_size: '50-100',
        pain_point: 'Needs automation'
      }
    }
  ],
  ignore_duplicate_leads_in_other_campaign: true
})

console.log(`Added ${result.upload_count} leads`)
```

---

### Getting Campaign Analytics

```typescript
import { smartleadClient } from '@/shared/libs/integrations/smartlead'

const analytics = await smartleadClient.analytics.getCampaignAnalytics(campaignId)

console.log({
  campaign: analytics.campaign_name,
  leads: analytics.total_leads,
  contacted: analytics.leads_contacted,
  openRate: `${analytics.open_rate}%`,
  replyRate: `${analytics.reply_rate}%`,
  replies: analytics.unique_replies
})
```

---

### Fetching Lead Responses

```typescript
import { smartleadClient } from '@/shared/libs/integrations/smartlead'

const stats = await smartleadClient.analytics.getCampaignStats(campaignId, {
  email_status: 'replied',
  limit: 100
})

for (const lead of stats.results) {
  console.log(`${lead.lead_email} replied on ${lead.email_replied_time}`)

  // Get full message history
  const history = await smartleadClient.analytics.getMessageHistory(
    campaignId,
    lead.lead_id
  )

  console.log('Conversation:', history.messages)
}
```

---

## 🎯 Workflow Logic

The n8n workflow automatically handles these events:

### EMAIL_SENT Event
- Updates `last_outreach_email_sent`
- Increments `outreach_email_count`
- Sets `last_email_sequence_number`
- Records `last_email_subject`

### EMAIL_OPEN Event
- Updates `last_email_open_date`
- Increments `email_open_count`
- Changes status to "engaged"

### EMAIL_LINK_CLICK Event
- Updates `last_email_click_date`
- Increments `email_click_count`
- Changes status to "highly_engaged"

### EMAIL_REPLY Event
- Updates `last_email_reply_date`
- Increments `email_reply_count`
- Changes status to "replied"
- **Promotes to Marketing Qualified Lead**

### LEAD_UNSUBSCRIBED Event
- Sets `unsubscribe_date`
- Changes status to "unsubscribed"
- Sets `hs_email_optout` = true

---

## 📈 Success Metrics

Track these KPIs in HubSpot:

1. **Outreach Volume**
   - Total prospects contacted per week
   - Emails sent per campaign
   - Active campaigns

2. **Engagement Rates**
   - Open rate (target: >40%)
   - Click rate (target: >10%)
   - Reply rate (target: >5%)

3. **Conversion Metrics**
   - Prospects → MQLs
   - Replies → Meetings booked
   - Meetings → Opportunities

4. **Team Performance**
   - Best performing campaigns
   - Best performing email sequences
   - Optimal send times

---

## 🚨 Troubleshooting

### Webhook Not Triggering

**Check:**
1. Webhook URL is correct in Smartlead settings
2. n8n workflow is activated
3. Check n8n execution history for errors

**Test manually:**
```bash
curl -X POST YOUR_WEBHOOK_URL -H "Content-Type: application/json" -d '{"test": true}'
```

---

### Contacts Not Creating in HubSpot

**Check:**
1. HubSpot API credentials are valid
2. Check n8n execution logs for errors
3. Verify email is valid
4. Check HubSpot rate limits

**Debug:**
```sql
-- Check recent sync failures
SELECT * FROM v_smartlead_sync_failures LIMIT 10;
```

---

### API Rate Limit Errors

Smartlead rate limit: 10 requests per 2 seconds

**The client automatically handles this**, but if you see errors:

```typescript
const metrics = smartleadClient.getMetrics()
console.log('Available tokens:', metrics.rateLimiter.availableTokens)
```

---

## 🔐 Security Notes

**DO NOT COMMIT:**
- `.env` file with Smartlead API key
- Smartlead credentials
- Lead email lists

**Add to `.gitignore`:**
```
.env
.env.local
smartlead-*.json
lead-export-*.csv
```

---

## 📚 Resources

**Smartlead:**
- Dashboard: https://app.smartlead.ai
- API Docs: https://helpcenter.smartlead.ai/en/articles/125-full-api-documentation
- Support: support@smartlead.ai

**Our Integration:**
- Client README: [shared/libs/integrations/smartlead/README.md](shared/libs/integrations/smartlead/README.md)
- Workflow Template: [infra/n8n-workflows/templates/smartlead-hubspot-sync.json](infra/n8n-workflows/templates/smartlead-hubspot-sync.json)
- Database Schema: [infra/supabase/schema-smartlead-tracking.sql](infra/supabase/schema-smartlead-tracking.sql)

---

## ✅ Deployment Checklist

- [ ] Get Smartlead API key (PRO plan required)
- [ ] Add `SMARTLEAD_API_KEY` to `.env`
- [ ] Deploy Supabase schema
- [ ] Create HubSpot properties
- [ ] Import n8n workflow
- [ ] Activate n8n workflow
- [ ] Configure Smartlead webhook
- [ ] Run all 5 tests
- [ ] Create HubSpot segmentation lists
- [ ] Set up monitoring dashboard
- [ ] Train team on HubSpot properties

---

## 🎉 You're Ready!

Your cold outreach tracking system is fully implemented and ready for deployment. Once you have a Smartlead PRO account and API key, you're just 30 minutes away from having real-time engagement tracking in HubSpot.

**Next Steps:**
1. Get Smartlead PRO plan: https://www.smartlead.ai/pricing
2. Follow deployment guide above
3. Create your first campaign
4. Start tracking engagement in HubSpot

---

**Questions?** Review the comprehensive documentation or check:
- Integration README: [shared/libs/integrations/smartlead/README.md](shared/libs/integrations/smartlead/README.md)
- HubSpot Integration Status: [STATUS.md](STATUS.md)
- Main README: [README.md](README.md)
