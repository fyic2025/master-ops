# HubSpot-Centric Outreach Team Integration

Complete implementation guide for the HubSpot-centric outreach team system for Elevate Wholesale & Teelixir.

## 📋 Overview

This integration establishes HubSpot as the central CRM hub, automatically syncing data from:
- **Shopify** (Teelixir & Elevate Wholesale stores) - ✅ **LIVE**
- **Unleashed** (inventory & B2B orders) - ✅ **READY TO DEPLOY**
- **Klaviyo** (email engagement) - *Pending credentials*
- **Smartlead** (cold outreach) - *Pending credentials*

### What's Been Built

#### ✅ Phase 1: Foundation (COMPLETE)

1. **Extended HubSpot Connector** ([shared/libs/integrations/hubspot/client.ts](shared/libs/integrations/hubspot/client.ts))
   - Added Deals API (create, read, update, delete, list)
   - Added Associations API (link contacts → companies → deals)
   - Added Batch API (bulk operations for contacts, companies, deals)
   - Added Search API (advanced filtering and queries)
   - Full TypeScript type safety maintained
   - Built-in rate limiting, retries, error handling

2. **Supabase Sync Tracking** ([infra/supabase/schema-hubspot-sync.sql](infra/supabase/schema-hubspot-sync.sql))
   - `hubspot_sync_log` table for tracking all sync operations
   - Helper views: `hubspot_sync_recent`, `hubspot_sync_failed`, `hubspot_sync_health`
   - Helper functions: `get_hubspot_id()`, `log_hubspot_sync()`, `log_hubspot_sync_error()`
   - Automatic updated_at triggers
   - Row-level security policies configured

3. **HubSpot Properties Setup Script** ([scripts/setup-hubspot-properties.ts](scripts/setup-hubspot-properties.ts))
   - 21 Contact properties (ambassador status, customer intelligence, engagement tracking)
   - 12 Company properties (wholesale tiers, account status, B2B tracking)
   - 11 Deal properties (order tracking, campaign attribution)
   - Dry-run mode for testing
   - Idempotent (can run multiple times safely)

4. **n8n Workflows** ([infra/n8n-workflows/templates/](infra/n8n-workflows/templates/))
   - **shopify-customer-sync.json** - Syncs Shopify customers to HubSpot contacts
   - **shopify-order-sync.json** - Syncs Shopify orders to HubSpot deals
   - **ambassador-application-handler.json** - Processes ambassador applications from website form

5. **Shopify Webhook Registration** ([scripts/register-shopify-webhooks.ts](scripts/register-shopify-webhooks.ts))
   - Automatic webhook setup for both stores
   - List, create, delete operations
   - Idempotent registration

#### ✅ Phase 2: Unleashed Integration (COMPLETE)

6. **Unleashed API Credentials** ([.env](.env))
   - Teelixir Unleashed API ID and Key configured
   - Elevate Wholesale Unleashed API ID and Key configured
   - HMAC-SHA256 signature authentication ready

7. **Unleashed → HubSpot Workflows** ([infra/n8n-workflows/templates/](infra/n8n-workflows/templates/))
   - **unleashed-customer-sync.json** - Syncs B2B-only customers from Unleashed
   - **unleashed-order-sync.json** - Syncs sales orders to HubSpot deals
   - B2C/B2B deduplication logic (checks for `shopify_customer_id`)
   - Scheduled triggers (every 6 hours)
   - Full Supabase sync tracking

8. **Business Logic Documentation** ([BUSINESS-LOGIC-SUMMARY.md](BUSINESS-LOGIC-SUMMARY.md))
   - Data source classification (Shopify B2C, Unleashed B2B)
   - Deduplication strategy
   - HubSpot segmentation examples
   - Contact property usage guide

9. **Phase 2 Deployment Guide** ([PHASE-2-COMPLETE.md](PHASE-2-COMPLETE.md))
   - Complete deployment instructions
   - Testing procedures (Tests 5 & 6)
   - Monitoring queries
   - Troubleshooting guide

---

## 🚀 Deployment Guide

### Prerequisites

#### Required Environment Variables

Ensure these are set in [.env](.env):

```bash
# HubSpot (CONFIGURED ✅)
HUBSPOT_ACCESS_TOKEN=your_hubspot_token_here

# Shopify Teelixir (CONFIGURED ✅)
SHOPIFY_TEELIXIR_DOMAIN=teelixir-au.myshopify.com
SHOPIFY_TEELIXIR_ACCESS_TOKEN=your_shopify_token_here

# Shopify Elevate (CONFIGURED ✅)
SHOPIFY_ELEVATE_DOMAIN=elevatewholesale.myshopify.com
SHOPIFY_ELEVATE_ACCESS_TOKEN=your_shopify_token_here

# Supabase (CONFIGURED ✅)
SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<configured>

# n8n (CONFIGURED ✅)
N8N_BASE_URL=https://automation.growthcohq.com
N8N_API_KEY=<configured>

# Unleashed Teelixir (CONFIGURED ✅)
UNLEASHED_TEELIXIR_API_ID=7fda9404-7197-477b-89b1-dadbcefae168
UNLEASHED_TEELIXIR_API_KEY=<configured>

# Unleashed Elevate (CONFIGURED ✅)
UNLEASHED_ELEVATE_API_ID=336a6015-eae0-43ab-83eb-e08121e7655d
UNLEASHED_ELEVATE_API_KEY=<configured>

# Missing - Required for Phase 3+
KLAVIYO_API_KEY=<not set>
SMARTLEAD_API_KEY=<not set>
```

---

## 📦 Step-by-Step Deployment

### Step 1: Deploy Supabase Schema

Create the HubSpot sync tracking table:

```bash
# Option A: Using Supabase CLI (if installed)
supabase db push

# Option B: Manual - Copy/paste into Supabase SQL Editor
# 1. Go to https://qcvfxxsnqvdfmpbcgdni.supabase.co
# 2. Navigate to SQL Editor
# 3. Copy contents of infra/supabase/schema-hubspot-sync.sql
# 4. Execute
```

**Verify deployment:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM hubspot_sync_health;
```

---

### Step 2: Set Up HubSpot Custom Properties

Create all custom properties in HubSpot:

```bash
# Test first with dry-run
npx tsx scripts/setup-hubspot-properties.ts --dry-run

# Deploy all properties
npx tsx scripts/setup-hubspot-properties.ts

# Or deploy specific object types
npx tsx scripts/setup-hubspot-properties.ts --only contacts
npx tsx scripts/setup-hubspot-properties.ts --only companies
npx tsx scripts/setup-hubspot-properties.ts --only deals
```

**Expected output:**
```
🚀 HubSpot Custom Properties Setup

📋 Setting up 21 Contact Properties...
✅ Created contact_type (contacts)
✅ Created ambassador_status (contacts)
✅ Created ambassador_tier (contacts)
...

🏢 Setting up 12 Company Properties...
✅ Created company_type (companies)
...

💼 Setting up 11 Deal Properties...
✅ Created deal_source (deals)
...

📊 Summary
✅ Successful: 44
❌ Failed: 0
```

**Verify in HubSpot:**
1. Go to Settings → Properties → Contact Properties
2. Search for "contact_type" - should show new enum field
3. Check Companies and Deals properties similarly

---

### Step 3: Configure n8n Credentials

Upload credentials to your n8n instance at https://automation.growthcohq.com

#### 3.1 HubSpot Credential (ID: 1)
- **Type:** HTTP Header Auth
- **Name:** HubSpot API
- **Header Name:** `Authorization`
- **Header Value:** `Bearer YOUR_HUBSPOT_ACCESS_TOKEN`

#### 3.2 Supabase Credential (ID: 2)
- **Type:** Postgres
- **Name:** Supabase
- **Host:** `qcvfxxsnqvdfmpbcgdni.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** `<your-supabase-password>`
- **Port:** `5432`
- **SSL:** Enabled

#### 3.3 Slack Credential (ID: 1) - OPTIONAL
- **Type:** Slack API
- **Name:** Slack
- **Access Token:** `<your-slack-bot-token>`

#### 3.4 SMTP Credential (ID: 3) - OPTIONAL
- **Type:** SMTP
- **Name:** SMTP
- **Host:** `<your-smtp-host>`
- **Port:** `587`
- **User:** `ambassadors@teelixir.com.au`
- **Password:** `<your-smtp-password>`

---

### Step 4: Import n8n Workflows

Import the three workflow files into n8n:

```bash
# Option A: Using n8n API
curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/shopify-customer-sync.json

curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/shopify-order-sync.json

curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/ambassador-application-handler.json

# Option B: Manual import via n8n UI
# 1. Go to https://automation.growthcohq.com
# 2. Click "Workflows" → "Import from File"
# 3. Upload each JSON file from infra/n8n-workflows/templates/
```

**Verify workflows imported:**
- Go to n8n Workflows page
- Should see:
  - Shopify Customer → HubSpot Sync
  - Shopify Order → HubSpot Deal Sync
  - Ambassador Application Handler

---

### Step 5: Activate n8n Workflows

Before activating, get the webhook URLs:

1. Open each workflow in n8n
2. Click the "Webhook Trigger" node
3. Copy the "Production URL" (e.g., `https://automation.growthcohq.com/webhook/shopify-customer-sync`)
4. Activate the workflow (toggle switch in top-right)

**Activate all three workflows:**
- ✅ Shopify Customer → HubSpot Sync
- ✅ Shopify Order → HubSpot Deal Sync
- ✅ Ambassador Application Handler

---

### Step 6: Register Shopify Webhooks

Connect Shopify to n8n workflows:

```bash
# Test with dry-run first
npx tsx scripts/register-shopify-webhooks.ts --dry-run

# List existing webhooks
npx tsx scripts/register-shopify-webhooks.ts --list

# Register webhooks for both stores
npx tsx scripts/register-shopify-webhooks.ts

# Or register for specific store
npx tsx scripts/register-shopify-webhooks.ts --store=teelixir
npx tsx scripts/register-shopify-webhooks.ts --store=elevate
```

**Expected output:**
```
🚀 Shopify Webhook Registration

🏪 Registering webhooks for Teelixir...
   Domain: teelixir-au.myshopify.com
   Webhooks to register: 4

✅ Created webhook: customers/create (ID: 123456)
✅ Created webhook: customers/update (ID: 123457)
✅ Created webhook: orders/create (ID: 123458)
✅ Created webhook: orders/updated (ID: 123459)

🏪 Registering webhooks for Elevate Wholesale...
   Domain: elevatewholesale.myshopify.com
   Webhooks to register: 4

✅ Created webhook: customers/create (ID: 223456)
✅ Created webhook: customers/update (ID: 223457)
✅ Created webhook: orders/create (ID: 223458)
✅ Created webhook: orders/updated (ID: 223459)

📊 Summary
✅ Successful: 8
❌ Failed: 0
```

**Verify in Shopify:**
1. Go to Teelixir Admin → Settings → Notifications → Webhooks
2. Should see 4 webhooks pointing to automation.growthcohq.com
3. Repeat for Elevate Wholesale store

---

### Step 7: Test the Integration

#### Test 1: Customer Sync

**Create a test customer in Shopify:**

```bash
# Using Shopify Admin API
curl -X POST "https://teelixir-au.myshopify.com/admin/api/2024-01/customers.json" \
  -H "X-Shopify-Access-Token: YOUR_SHOPIFY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "first_name": "Test",
      "last_name": "Customer",
      "email": "test@example.com",
      "phone": "+61400000000",
      "tags": "test"
    }
  }'
```

**Verify:**
1. Check n8n execution logs (should show successful run)
2. Check HubSpot Contacts (search for test@example.com)
3. Check Supabase:
   ```sql
   SELECT * FROM hubspot_sync_log WHERE external_id LIKE '%test%';
   SELECT * FROM integration_logs WHERE service = 'customer_sync' ORDER BY created_at DESC LIMIT 5;
   ```

#### Test 2: Order Sync

**Create a test order in Shopify** (via Shopify Admin UI or API)

**Verify:**
1. Check n8n execution logs
2. Check HubSpot Deals (should see new deal for the order)
3. Check deal is associated with the contact
4. Check Supabase:
   ```sql
   SELECT * FROM hubspot_sync_log WHERE object_type = 'deal' ORDER BY created_at DESC LIMIT 5;
   ```

#### Test 3: Ambassador Application

**Simulate an ambassador application:**

```bash
# Send webhook to n8n
curl -X POST "https://automation.growthcohq.com/webhook/ambassador-application" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "id": "999999",
      "first_name": "Ambassador",
      "last_name": "Test",
      "email": "ambassador-test@example.com",
      "phone": "+61400111222",
      "tags": "wholesale",
      "note": "Test Business Pty Ltd"
    }
  }'
```

**Verify:**
1. Check n8n execution logs
2. Check HubSpot Contact (should have `contact_type` = "ambassador", `ambassador_status` = "prospect")
3. Check HubSpot Deal (should see "Ambassador Application - Ambassador Test")
4. Check Slack #ambassador-applications channel (if configured)
5. Check confirmation email sent (if SMTP configured)

---

## 📊 Monitoring & Maintenance

### Health Check Queries

Run these in Supabase SQL Editor to monitor integration health:

```sql
-- Overall sync health (last 7 days)
SELECT * FROM hubspot_sync_health
ORDER BY external_source, object_type;

-- Recent sync activity (last 24 hours)
SELECT * FROM hubspot_sync_recent
ORDER BY last_sync DESC;

-- Failed syncs requiring retry
SELECT * FROM hubspot_sync_failed
ORDER BY last_synced_at DESC;

-- Integration logs (errors only)
SELECT *
FROM integration_logs
WHERE level = 'error'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### n8n Execution Logs

Monitor workflow executions at https://automation.growthcohq.com/executions

**Key metrics to track:**
- Execution count (should match webhook deliveries)
- Success rate (target: >99%)
- Average execution time (should be <5 seconds)
- Error patterns (check for recurring issues)

### HubSpot Data Quality

Periodic checks in HubSpot:

1. **Duplicate Contacts**
   - Go to Contacts → View duplicates
   - Merge any duplicates found
   - Check `shopify_customer_id` property to identify source

2. **Missing Associations**
   ```sql
   -- Check deals without associated contacts
   SELECT d.*, hsl.external_id
   FROM hubspot_sync_log hsl
   JOIN hubspot_sync_log contact_sync ON contact_sync.external_id = hsl.external_id
   WHERE hsl.object_type = 'deal'
     AND hsl.sync_status = 'success';
   ```

3. **Ambassador Applications**
   - Check HubSpot deals in Ambassador Application pipeline
   - Ensure all have status = "prospect" initially
   - Track approval rate and time-to-approval

---

## 🔧 Troubleshooting

### Issue: Webhooks not firing

**Symptoms:** No n8n executions when customers/orders are created in Shopify

**Check:**
1. Verify webhooks are registered:
   ```bash
   npx tsx scripts/register-shopify-webhooks.ts --list
   ```
2. Check webhook delivery in Shopify Admin → Settings → Notifications → Webhooks
3. Verify n8n workflows are activated (green toggle in n8n UI)
4. Test webhook manually:
   ```bash
   curl -X POST "https://automation.growthcohq.com/webhook/shopify-customer-sync" \
     -H "Content-Type: application/json" \
     -d '{"customer": {"id": "test", "email": "test@test.com", "first_name": "Test", "last_name": "User"}}'
   ```

**Fix:**
- Re-register webhooks: `npx tsx scripts/register-shopify-webhooks.ts`
- Ensure n8n is accessible from Shopify (not behind firewall)

### Issue: Duplicate contacts in HubSpot

**Symptoms:** Same customer appears multiple times with different IDs

**Check:**
```sql
SELECT email, COUNT(*)
FROM hubspot_sync_log
WHERE object_type = 'contact'
GROUP BY email
HAVING COUNT(*) > 1;
```

**Fix:**
1. Merge duplicates in HubSpot manually
2. Update `hubspot_sync_log` to point to winning contact ID:
   ```sql
   UPDATE hubspot_sync_log
   SET hubspot_id = '<winning_contact_id>'
   WHERE external_id = '<shopify_customer_id>'
     AND object_type = 'contact';
   ```

### Issue: Sync failures

**Symptoms:** `hubspot_sync_failed` view shows entries

**Check:**
```sql
SELECT * FROM hubspot_sync_failed
ORDER BY last_synced_at DESC
LIMIT 10;
```

**Common causes:**
- Invalid HubSpot access token (expired/revoked)
- Rate limiting (too many requests)
- Missing required fields
- Network issues

**Fix:**
1. Check error message in `error_message` column
2. Retry failed syncs (n8n will auto-retry up to 3 times)
3. If persistent, check HubSpot API status

### Issue: Ambassador applications not creating deals

**Symptoms:** Contact created but no deal

**Check:**
1. Verify workflow is activated
2. Check n8n execution logs for errors
3. Verify HubSpot Deal pipeline exists (default pipeline)
4. Check association type ID (should be "3" for contact_to_deal)

**Fix:**
- Manually create pipeline if missing
- Update workflow's `dealstage` property to match your pipeline stages

---

## 📈 Next Steps (Future Phases)

### Phase 2: Unleashed Integration (Week 3-4)

**Prerequisites:**
- Obtain Unleashed API credentials
- Add to `.env`:
  ```bash
  UNLEASHED_API_ID=<your_api_id>
  UNLEASHED_API_KEY=<your_api_key>
  ```

**Tasks:**
1. Create `unleashed-customer-sync.json` workflow
2. Create `unleashed-order-sync.json` workflow
3. Set up daily/hourly polling (no webhooks available)
4. Map Unleashed customers to HubSpot Companies
5. Map Unleashed sales orders to HubSpot Deals

### Phase 3: Klaviyo Integration (Week 5-6)

**Prerequisites:**
- Obtain Klaviyo API key
- Add to `.env`:
  ```bash
  KLAVIYO_API_KEY=<your_api_key>
  ```

**Tasks:**
1. Create `klaviyo-engagement-sync.json` workflow
2. Sync email opens/clicks to HubSpot properties
3. Sync list memberships
4. Calculate engagement scores
5. Trigger Klaviyo flows from HubSpot lifecycle stages

### Phase 4: Smartlead Integration (Week 7-8)

**Prerequisites:**
- Obtain Smartlead API key
- Add to `.env`:
  ```bash
  SMARTLEAD_API_KEY=<your_api_key>
  SMARTLEAD_API_URL=https://api.smartlead.com
  ```

**Tasks:**
1. Create `smartlead-campaign-sync.json` workflow
2. Sync cold outreach responses to HubSpot
3. Create tasks for replied leads
4. Update lead status based on engagement
5. Remove from campaigns on opt-out

---

## 🤝 Support & Contributing

### Getting Help

- **Integration Issues:** Check [integration_logs](https://qcvfxxsnqvdfmpbcgdni.supabase.co) table
- **n8n Workflow Issues:** Check execution logs at https://automation.growthcohq.com/executions
- **HubSpot Issues:** Check HubSpot activity feed on contact/deal records

### Updating Workflows

When modifying n8n workflows:

1. Export from n8n UI (Workflows → Export)
2. Save to `infra/n8n-workflows/templates/`
3. Update this README if behavior changes
4. Test in development environment first

### Adding New Properties

To add new HubSpot properties:

1. Edit [scripts/setup-hubspot-properties.ts](scripts/setup-hubspot-properties.ts)
2. Add property definition to appropriate array
3. Run script: `npx tsx scripts/setup-hubspot-properties.ts`
4. Update workflows to use new property

---

## 📝 Changelog

### 2025-11-20 - Phase 1 Complete

**Added:**
- Extended HubSpot connector with Deals, Associations, Batch, Search APIs
- Supabase sync tracking schema (`hubspot_sync_log` table)
- HubSpot custom properties setup script (44 properties)
- 3 n8n workflows (customer sync, order sync, ambassador handler)
- Shopify webhook registration script
- Comprehensive deployment documentation

**Status:**
- ✅ Foundation complete and ready for deployment
- ✅ All code tested and documented
- ⏳ Awaiting deployment and testing in production
- ⏳ Phase 2-4 pending additional API credentials

---

## 📄 License

Proprietary - Internal use only for Teelixir/Elevate Wholesale operations.

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0 (Phase 1)
**Maintained By:** Growth Co HQ Dev Team
