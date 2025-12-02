# HubSpot Integration Deployment Checklist

## Pre-Deployment Verification

### Environment Variables
- [ ] `HUBSPOT_ACCESS_TOKEN` - Configured ✅
- [ ] `SHOPIFY_TEELIXIR_DOMAIN` - Configured ✅
- [ ] `SHOPIFY_TEELIXIR_ACCESS_TOKEN` - Configured ✅
- [ ] `SHOPIFY_ELEVATE_DOMAIN` - Configured ✅
- [ ] `SHOPIFY_ELEVATE_ACCESS_TOKEN` - Configured ✅
- [ ] `SUPABASE_URL` - Configured ✅
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Configured ✅
- [ ] `N8N_BASE_URL` - Configured ✅

### Optional (Phase 2+)
- [ ] `UNLEASHED_API_ID` - Not configured
- [ ] `UNLEASHED_API_KEY` - Not configured
- [ ] `KLAVIYO_API_KEY` - Not configured
- [ ] `SMARTLEAD_API_KEY` - Not configured

---

## Deployment Steps

### Step 1: Deploy Supabase Schema (10 minutes)

**Location:** [infra/supabase/schema-hubspot-sync.sql](infra/supabase/schema-hubspot-sync.sql)

**Method A: Via Supabase SQL Editor**
1. Go to https://qcvfxxsnqvdfmpbcgdni.supabase.co
2. Navigate to SQL Editor
3. Create new query
4. Copy/paste contents of `schema-hubspot-sync.sql`
5. Execute

**Method B: Via Supabase CLI**
```bash
supabase db push
```

**Verification:**
```sql
-- Run in SQL Editor
SELECT * FROM hubspot_sync_health;
SELECT * FROM hubspot_sync_recent;

-- Should return empty tables (no errors)
```

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

### Step 2: Create HubSpot Custom Properties (15 minutes)

**Script:** [scripts/setup-hubspot-properties.ts](scripts/setup-hubspot-properties.ts)

**Commands:**
```bash
# Test first (dry run)
npx tsx scripts/setup-hubspot-properties.ts --dry-run

# Deploy all properties
npx tsx scripts/setup-hubspot-properties.ts

# Or deploy by object type
npx tsx scripts/setup-hubspot-properties.ts --only=contacts
npx tsx scripts/setup-hubspot-properties.ts --only=companies
npx tsx scripts/setup-hubspot-properties.ts --only=deals
```

**Expected Output:**
```
🚀 HubSpot Custom Properties Setup

📋 Setting up 21 Contact Properties...
✅ Created contact_type (contacts)
✅ Created ambassador_status (contacts)
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

**Verification in HubSpot:**
1. Settings → Properties → Contact Properties
2. Search for "contact_type" - should exist with enum values
3. Check Companies and Deals properties similarly

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

### Step 3: Configure n8n Credentials (10 minutes)

**URL:** https://automation.growthcohq.com

**Credentials to Add:**

#### 1. HubSpot API (HTTP Header Auth)
- **Credential Name:** HubSpot API
- **Credential ID:** 1
- **Type:** HTTP Header Auth
- **Header Name:** `Authorization`
- **Header Value:** `Bearer YOUR_HUBSPOT_ACCESS_TOKEN`

#### 2. Supabase (Postgres)
- **Credential Name:** Supabase
- **Credential ID:** 2
- **Type:** Postgres
- **Host:** `qcvfxxsnqvdfmpbcgdni.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** [Your Supabase password]
- **Port:** `5432`
- **SSL:** Enabled

#### 3. Slack (Optional)
- **Credential Name:** Slack
- **Credential ID:** 1
- **Type:** Slack API
- **Access Token:** [Your Slack bot token]

#### 4. SMTP (Optional - for confirmation emails)
- **Credential Name:** SMTP
- **Credential ID:** 3
- **Type:** SMTP
- **Host:** [Your SMTP host]
- **Port:** `587`
- **User:** `ambassadors@teelixir.com.au`
- **Password:** [Your SMTP password]

**Verification:**
- Test each credential in n8n UI
- Should show "Connection successful"

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

### Step 4: Import n8n Workflows (20 minutes)

**Phase 1 Workflows (Shopify + HubSpot):**
1. [shopify-customer-sync.json](infra/n8n-workflows/templates/shopify-customer-sync.json)
2. [shopify-order-sync.json](infra/n8n-workflows/templates/shopify-order-sync.json)
3. [ambassador-application-handler.json](infra/n8n-workflows/templates/ambassador-application-handler.json)

**Phase 2 Workflows (Unleashed + HubSpot):**
4. [unleashed-customer-sync.json](infra/n8n-workflows/templates/unleashed-customer-sync.json)
5. [unleashed-order-sync.json](infra/n8n-workflows/templates/unleashed-order-sync.json)

**Method A: Via n8n UI**
1. Go to https://automation.growthcohq.com/workflows
2. Click "Add Workflow" → "Import from File"
3. Upload each JSON file
4. Verify credentials are linked correctly
5. DO NOT activate yet

**Method B: Via n8n API**
```bash
# Phase 1 - Shopify Workflows
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

# Phase 2 - Unleashed Workflows
curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/unleashed-customer-sync.json

curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/unleashed-order-sync.json
```

**Verification:**
- All 5 workflows visible in n8n
- Credentials linked (no red warnings)
- Webhook URLs available (for Shopify workflows)
- Scheduled triggers configured (for Unleashed workflows)

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

### Step 5: Get Webhook URLs (5 minutes)

**For each workflow:**
1. Open in n8n
2. Click "Webhook Trigger" node
3. Copy "Production URL"

**URLs Needed:**
- **Customer Sync:** `https://automation.growthcohq.com/webhook/shopify-customer-sync`
- **Order Sync:** `https://automation.growthcohq.com/webhook/shopify-order-sync`
- **Ambassador Handler:** `https://automation.growthcohq.com/webhook/ambassador-application`

**Save these URLs for Step 6**

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

### Step 6: Activate n8n Workflows (3 minutes)

**For each workflow:**
1. Open workflow in n8n
2. Toggle "Active" switch (top-right)
3. Verify status shows "Active" (green)

**Phase 1 Workflows (Webhook-triggered):**
- [ ] Shopify Customer → HubSpot Sync
- [ ] Shopify Order → HubSpot Deal Sync
- [ ] Ambassador Application Handler

**Phase 2 Workflows (Scheduled - Every 6 hours):**
- [ ] Unleashed Customer → HubSpot Sync (B2B only)
- [ ] Unleashed Order → HubSpot Deal Sync

**Verification:**
- All 5 workflows show green "Active" status
- Webhook URLs are accessible (Phase 1)
- Schedule triggers configured correctly (Phase 2)

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

### Step 7: Register Shopify Webhooks (10 minutes)

**Script:** [scripts/register-shopify-webhooks.ts](scripts/register-shopify-webhooks.ts)

**Commands:**
```bash
# List existing webhooks
npx tsx scripts/register-shopify-webhooks.ts --list

# Dry run (test without creating)
npx tsx scripts/register-shopify-webhooks.ts --dry-run

# Register all webhooks
npx tsx scripts/register-shopify-webhooks.ts

# Or register for specific store
npx tsx scripts/register-shopify-webhooks.ts --store=teelixir
npx tsx scripts/register-shopify-webhooks.ts --store=elevate
```

**Expected Output:**
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

**Verification in Shopify:**
1. **Teelixir:** Admin → Settings → Notifications → Webhooks
   - Should see 4 webhooks pointing to automation.growthcohq.com
2. **Elevate:** Repeat for Elevate store

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

---

## Testing Phase

### Test 1: Customer Sync (10 minutes)

**Goal:** Verify Shopify customer → HubSpot contact sync

**Steps:**
1. Create test customer in Teelixir Shopify:
   - First Name: Test
   - Last Name: Customer
   - Email: test-[timestamp]@example.com
   - Tags: test

2. Wait 1-2 minutes

3. Check n8n execution logs:
   - Go to https://automation.growthcohq.com/executions
   - Should see "Shopify Customer → HubSpot Sync" execution
   - Status should be "Success"

4. Check HubSpot:
   - Search for contact by email
   - Verify properties:
     - `contact_type` = "customer"
     - `source_business` = "teelixir"
     - `wholesale_account` = false
     - `shopify_customer_id` = [populated]

5. Check Supabase:
   ```sql
   SELECT * FROM hubspot_sync_log
   WHERE external_id LIKE '%test%'
   ORDER BY created_at DESC;
   ```

**Result:** ⬜ Pass | ❌ Fail | ⏭️ Skipped

**Issues Found:**
-

---

### Test 2: Order Sync (10 minutes)

**Goal:** Verify Shopify order → HubSpot deal sync

**Steps:**
1. Create test order in Teelixir Shopify:
   - Use test customer from Test 1
   - Add 1 product
   - Process order

2. Wait 1-2 minutes

3. Check n8n execution logs:
   - Should see "Shopify Order → HubSpot Deal Sync" execution
   - Status should be "Success"

4. Check HubSpot:
   - Go to Deals
   - Search for order name
   - Verify properties:
     - `dealname` contains order number
     - `source_business` = "teelixir"
     - `shopify_order_id` = [populated]
     - `deal_source` = "shopify_order"
   - Verify association:
     - Deal is associated with contact from Test 1

5. Check Supabase:
   ```sql
   SELECT * FROM hubspot_sync_log
   WHERE object_type = 'deal'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Result:** ⬜ Pass | ❌ Fail | ⏭️ Skipped

**Issues Found:**
-

---

### Test 3: Ambassador Application (10 minutes)

**Goal:** Verify ambassador form → HubSpot pipeline

**Steps:**
1. Submit test ambassador application:
   - Option A: Visit https://teelixir.com.au/pages/teelixir-wholesale-support
   - Option B: Simulate webhook:
   ```bash
   curl -X POST "https://automation.growthcohq.com/webhook/ambassador-application" \
     -H "Content-Type: application/json" \
     -d '{
       "customer": {
         "id": "999999",
         "first_name": "Ambassador",
         "last_name": "Test",
         "email": "ambassador-test-[timestamp]@example.com",
         "phone": "+61400111222",
         "tags": "wholesale",
         "note": "Test Business Pty Ltd"
       }
     }'
   ```

2. Wait 1-2 minutes

3. Check n8n execution logs:
   - Should see "Ambassador Application Handler" execution
   - Status should be "Success"

4. Check HubSpot Contact:
   - Search for email
   - Verify properties:
     - `contact_type` = "ambassador"
     - `ambassador_status` = "prospect"
     - `source_business` = "teelixir"
     - `wholesale_account` = true
     - `application_date` = [today]

5. Check HubSpot Deal:
   - Should see deal: "Ambassador Application - Ambassador Test"
   - Pipeline: Ambassador Application
   - Stage: Application Received
   - Associated with contact

6. Check Slack (if configured):
   - Should see notification in #ambassador-applications

7. Check Email (if SMTP configured):
   - Confirmation email sent to applicant

**Result:** ⬜ Pass | ❌ Fail | ⏭️ Skipped

**Issues Found:**
-

---

### Test 4: Integration Health (5 minutes)

**Goal:** Verify monitoring systems working

**Steps:**
1. Check Supabase health views:
   ```sql
   -- Overall health
   SELECT * FROM hubspot_sync_health;

   -- Recent activity
   SELECT * FROM hubspot_sync_recent
   ORDER BY last_sync DESC;

   -- Any failures?
   SELECT * FROM hubspot_sync_failed;

   -- Integration logs
   SELECT * FROM integration_logs
   WHERE created_at >= NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

2. Check n8n execution history:
   - Go to https://automation.growthcohq.com/executions
   - Review last 10 executions
   - All should show "Success"

3. Verify sync counts match:
   - Supabase sync_log count
   - n8n execution count
   - HubSpot object count

**Result:** ⬜ Pass | ❌ Fail | ⏭️ Skipped

**Issues Found:**
-

---

## Post-Deployment

### Monitoring Setup (Ongoing)

**Daily Checks:**
- [ ] Review n8n execution logs for failures
- [ ] Check Supabase `hubspot_sync_failed` view
- [ ] Monitor integration_logs for errors

**Weekly Checks:**
- [ ] Review HubSpot data quality (duplicates, missing data)
- [ ] Check sync success rates (target: >99%)
- [ ] Review ambassador pipeline conversions

**Monthly Checks:**
- [ ] Audit HubSpot contact data completeness
- [ ] Review engagement scoring accuracy
- [ ] Optimize workflow performance

**SQL Queries for Monitoring:**
```sql
-- Daily health check
SELECT
  external_source,
  object_type,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM hubspot_sync_log
WHERE last_synced_at >= NOW() - INTERVAL '24 hours'
GROUP BY external_source, object_type;

-- Recent errors
SELECT *
FROM integration_logs
WHERE level = 'error'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Failed syncs needing attention
SELECT *
FROM hubspot_sync_failed
WHERE retry_count < 5
ORDER BY last_synced_at DESC;
```

---

### Troubleshooting

**Issue: Webhooks not firing**
- Check webhook status in Shopify Admin
- Verify n8n workflows are active (green toggle)
- Test webhook manually with curl
- Check n8n is accessible from Shopify

**Issue: Duplicate contacts in HubSpot**
- Run deduplication in HubSpot (Contacts → Manage duplicates)
- Update sync_log with winning contact ID
- Review search logic in workflow

**Issue: Sync failures**
- Check Supabase `hubspot_sync_failed` view
- Review error message
- Verify HubSpot API credentials still valid
- Check for rate limiting issues

**Issue: Missing data in HubSpot**
- Verify property names match exactly
- Check webhook payload structure
- Review n8n workflow field mappings
- Ensure all required properties exist

---

## Rollback Procedure

**If deployment fails:**

1. **Deactivate n8n workflows** (stop new syncs)
2. **Delete Shopify webhooks:**
   ```bash
   npx tsx scripts/register-shopify-webhooks.ts --delete
   ```
3. **Backup HubSpot data** (export contacts/deals)
4. **Clean up test data** in HubSpot
5. **Review logs** to identify issue
6. **Fix and redeploy**

---

## Sign-Off

### Deployment Completed By
- **Name:**
- **Date:**
- **Time:**

### Test Results
- Customer Sync: ⬜ Pass | ❌ Fail
- Order Sync: ⬜ Pass | ❌ Fail
- Ambassador Flow: ⬜ Pass | ❌ Fail
- Health Monitoring: ⬜ Pass | ❌ Fail

### Production Status
- [ ] All tests passed
- [ ] Monitoring configured
- [ ] Team trained
- [ ] Documentation reviewed
- [ ] Ready for production traffic

### Notes:


---

**Checklist Version:** 1.0
**Last Updated:** 2025-11-20
**Next Review:** After Phase 2 deployment
