# Phase 2 Complete - Unleashed Integration

## Overview

Phase 2 of the HubSpot Integration is now complete. This phase adds **Unleashed inventory/wholesale system integration** to sync B2B customers and orders to HubSpot, complementing the existing Shopify B2C integration from Phase 1.

---

## What's Been Added

### 1. Unleashed API Credentials (Both Businesses)

**Teelixir Unleashed:**
- API ID: `7fda9404-7197-477b-89b1-dadbcefae168`
- API Key: Configured in `.env`

**Elevate Wholesale Unleashed:**
- API ID: `336a6015-eae0-43ab-83eb-e08121e7655d`
- API Key: Configured in `.env`

### 2. New n8n Workflows

#### A. Unleashed Customer → HubSpot Sync
**File:** [infra/n8n-workflows/templates/unleashed-customer-sync.json](infra/n8n-workflows/templates/unleashed-customer-sync.json)

**Purpose:** Sync B2B-only customers from Unleashed to HubSpot, avoiding duplicates with Shopify B2C customers

**Key Logic:**
```javascript
// B2C/B2B Deduplication Strategy
if (existingContact.properties.shopify_customer_id) {
  // This customer exists in Shopify (B2C)
  // SKIP - already synced from Shopify
  action: 'skip_b2c'
} else {
  // This customer does NOT exist in Shopify (B2B only)
  // CREATE/UPDATE as distributor
  contact_type: 'distributor',
  wholesale_account: true,
  unleashed_customer_code: 'ABC123'
}
```

**Trigger:** Scheduled (every 6 hours)

**Flow:**
1. Fetch all customers from Unleashed API
2. For each customer with email:
   - Search HubSpot by email
   - Check if contact has `shopify_customer_id` property
   - If YES → Skip (B2C customer, already synced from Shopify)
   - If NO → Create/update as B2B distributor
3. Log all operations to Supabase

**Properties Set:**
- `contact_type` = "distributor"
- `wholesale_account` = true
- `source_business` = "teelixir"
- `unleashed_customer_code` = [Customer code from Unleashed]

#### B. Unleashed Order → HubSpot Deal Sync
**File:** [infra/n8n-workflows/templates/unleashed-order-sync.json](infra/n8n-workflows/templates/unleashed-order-sync.json)

**Purpose:** Sync sales orders from Unleashed to HubSpot as deals, associating them with contacts

**Trigger:** Scheduled (every 6 hours)

**Flow:**
1. Fetch all sales orders from Unleashed API
2. For each order:
   - Lookup HubSpot contact ID via Supabase sync_log (by unleashed_customer_code)
   - If contact not found → Skip order (log warning)
   - Check if deal already exists (by unleashed_order_id)
   - Create new deal OR update existing deal
   - Associate deal with contact
   - Log sync to Supabase

**Properties Set:**
- `dealname` = "Unleashed Order #[number] - [Customer Name]"
- `deal_source` = "unleashed_order"
- `source_business` = "teelixir"
- `unleashed_order_id` = [GUID]
- `unleashed_order_number` = [Order number]
- `order_total` = [Amount]
- `fulfillment_status` = [Status from Unleashed]
- `payment_status` = "paid"
- `products_ordered` = [JSON array of line items]

**Deal-Contact Association:**
- Uses HubSpot Associations API
- Links deal to contact via contact ID lookup
- Association type: "deal_to_contact" (type 1)

---

## Business Logic Recap

### Data Source Classification

**Teelixir Shopify (B2C Only):**
- All customers are retail (B2C)
- Synced via webhook (real-time)
- Properties: `shopify_customer_id`, `contact_type="customer"`, `wholesale_account=false`

**Teelixir Unleashed (Mixed - B2C + B2B):**
- B2C orders: Automatically synced from Shopify (duplicates)
- B2B orders: Direct wholesale/distributor orders (non-Shopify)
- Synced via scheduled polling (every 6 hours)

**Deduplication Strategy:**
1. Shopify customers sync FIRST (real-time via webhook)
2. Unleashed customer sync checks for `shopify_customer_id` property
3. If `shopify_customer_id` exists → Skip (already synced as B2C)
4. If `shopify_customer_id` is NULL → Sync as B2B distributor

**Elevate Wholesale Shopify (B2B Only):**
- All customers are wholesale buyers
- Synced via webhook (real-time)
- Properties: `shopify_customer_id`, `contact_type="distributor"`, `wholesale_account=true`

---

## HubSpot Segmentation Examples

### Teelixir B2C Customers (Retail)
```
Filters:
- source_business = "teelixir"
- shopify_customer_id IS KNOWN
- wholesale_account = false
```

### Teelixir B2B Customers (Distributors/Wholesale)
```
Filters:
- source_business = "teelixir"
- unleashed_customer_code IS KNOWN
- shopify_customer_id IS UNKNOWN
- wholesale_account = true
```

### All B2B Customers (Across All Brands)
```
Filters:
- wholesale_account = true
```

---

## Deployment Instructions

### Step 1: Import Workflows to n8n

**Via n8n UI:**
1. Go to https://automation.growthcohq.com/workflows
2. Click "Add Workflow" → "Import from File"
3. Upload `unleashed-customer-sync.json`
4. Upload `unleashed-order-sync.json`
5. Verify credentials are linked (HubSpot API, Supabase)

**Via n8n API:**
```bash
curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/unleashed-customer-sync.json

curl -X POST "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @infra/n8n-workflows/templates/unleashed-order-sync.json
```

### Step 2: Configure n8n Environment Variables

Ensure these environment variables are set in n8n:

```bash
# Teelixir Unleashed
UNLEASHED_TEELIXIR_API_ID=7fda9404-7197-477b-89b1-dadbcefae168
UNLEASHED_TEELIXIR_API_KEY=[configured in .env]

# Elevate Unleashed
UNLEASHED_ELEVATE_API_ID=336a6015-eae0-43ab-83eb-e08121e7655d
UNLEASHED_ELEVATE_API_KEY=[configured in .env]
```

### Step 3: Activate Workflows

1. Open "Unleashed Customer → HubSpot Sync" in n8n
2. Toggle "Active" switch (top-right)
3. Verify schedule trigger is set to "Every 6 hours"
4. Repeat for "Unleashed Order → HubSpot Deal Sync"

### Step 4: Monitor Initial Sync

**Check n8n Execution Logs:**
- Go to https://automation.growthcohq.com/executions
- Wait for first scheduled execution (may take up to 6 hours)
- Review execution details for any errors

**Check Supabase Sync Logs:**
```sql
-- View recent Unleashed syncs
SELECT * FROM hubspot_sync_log
WHERE external_source = 'unleashed'
ORDER BY last_synced_at DESC
LIMIT 20;

-- Check for B2C skips (expected behavior)
SELECT * FROM integration_logs
WHERE operation = 'skip_b2c_customer'
ORDER BY created_at DESC
LIMIT 10;

-- Check sync success rate
SELECT
  object_type,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM hubspot_sync_log
WHERE external_source = 'unleashed'
GROUP BY object_type;
```

---

## Testing Phase 2

### Test 5: Unleashed Customer Sync (B2B Only)

**Goal:** Verify B2B customers from Unleashed sync correctly, B2C customers are skipped

**Steps:**
1. Wait for first scheduled execution (or trigger manually in n8n)
2. Check n8n execution logs:
   - Should see "Unleashed → HubSpot Customer Sync" execution
   - Status should be "Success"
3. Check HubSpot:
   - Search for a known B2B customer (distributor/wholesale)
   - Verify properties:
     - `contact_type` = "distributor"
     - `wholesale_account` = true
     - `source_business` = "teelixir"
     - `unleashed_customer_code` = [populated]
     - `shopify_customer_id` = [empty/null]
4. Check Supabase for B2C skips:
   ```sql
   SELECT * FROM integration_logs
   WHERE operation = 'skip_b2c_customer'
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Should see logs for customers that exist in Shopify (expected)

**Expected Result:** B2B customers created/updated, B2C customers skipped

---

### Test 6: Unleashed Order Sync

**Goal:** Verify sales orders from Unleashed sync as HubSpot deals

**Steps:**
1. Wait for order sync execution
2. Check n8n execution logs:
   - Should see "Unleashed → HubSpot Order Sync" execution
   - Status should be "Success"
3. Check HubSpot Deals:
   - Search for a recent order number
   - Verify properties:
     - `dealname` contains "Unleashed Order #[number]"
     - `deal_source` = "unleashed_order"
     - `source_business` = "teelixir"
     - `unleashed_order_id` = [populated]
     - `order_total` = [correct amount]
   - Verify deal is associated with correct contact
4. Check Supabase:
   ```sql
   SELECT * FROM hubspot_sync_log
   WHERE object_type = 'deal'
     AND external_source = 'unleashed'
   ORDER BY last_synced_at DESC
   LIMIT 5;
   ```

**Expected Result:** Orders synced as deals, associated with contacts

---

## Monitoring & Maintenance

### Daily Checks

**Sync Health:**
```sql
-- Overall sync health for Unleashed
SELECT
  object_type,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN sync_status = 'failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM hubspot_sync_log
WHERE external_source = 'unleashed'
  AND last_synced_at >= NOW() - INTERVAL '24 hours'
GROUP BY object_type;
```

**Failed Syncs:**
```sql
-- Unleashed syncs that need attention
SELECT * FROM hubspot_sync_failed
WHERE external_source = 'unleashed'
ORDER BY last_synced_at DESC;
```

**Integration Errors:**
```sql
-- Recent errors from Unleashed sync
SELECT * FROM integration_logs
WHERE source = 'hubspot'
  AND service = 'unleashed_sync'
  AND level = 'error'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Weekly Checks

**B2C/B2B Distribution:**
```sql
-- Verify B2C customers have shopify_customer_id
-- Verify B2B customers have unleashed_customer_code
SELECT
  CASE
    WHEN shopify_customer_id IS NOT NULL THEN 'B2C (Shopify)'
    WHEN unleashed_customer_code IS NOT NULL THEN 'B2B (Unleashed)'
    ELSE 'Other'
  END as customer_type,
  COUNT(*) as count
FROM hubspot_sync_log
WHERE object_type = 'contact'
  AND source_business = 'teelixir'
GROUP BY customer_type;
```

**Deduplication Effectiveness:**
```sql
-- How many B2C customers were correctly skipped?
SELECT
  COUNT(*) as b2c_customers_skipped,
  DATE(created_at) as date
FROM integration_logs
WHERE operation = 'skip_b2c_customer'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Troubleshooting

### Issue: B2B Customers Being Skipped

**Symptoms:** Legitimate B2B customers not appearing in HubSpot

**Diagnosis:**
```sql
-- Check if customer incorrectly has shopify_customer_id
SELECT * FROM hubspot_sync_log
WHERE external_source = 'unleashed'
  AND object_type = 'contact'
  AND sync_status = 'failed';
```

**Solution:**
1. Verify customer email is unique (not shared with B2C account)
2. Check if customer exists in Shopify (should not)
3. Manually clear `shopify_customer_id` in HubSpot if incorrect

### Issue: Orders Not Associating with Contacts

**Symptoms:** Deals created but not linked to contacts

**Diagnosis:**
```sql
-- Check if contact was synced before order
SELECT * FROM hubspot_sync_log
WHERE external_id = '[customer_code]'
  AND object_type = 'contact'
  AND external_source = 'unleashed';
```

**Solution:**
1. Ensure customer sync runs BEFORE order sync
2. Verify contact has `unleashed_customer_code` property
3. Check Supabase sync_log has correct mapping

### Issue: Duplicate Deals

**Symptoms:** Same order appears multiple times in HubSpot

**Diagnosis:**
- Check if `unleashed_order_id` property is being set correctly
- Review n8n "Check Existing Deal" node logic

**Solution:**
1. Manually deduplicate in HubSpot
2. Update sync_log with winning deal ID
3. Verify workflow search logic uses `unleashed_order_id`

---

## Phase 2 Completion Status

### ✅ Completed

- [x] Unleashed API credentials configured (Teelixir + Elevate)
- [x] Unleashed Customer Sync workflow created
- [x] Unleashed Order Sync workflow created
- [x] B2C/B2B deduplication logic implemented
- [x] Supabase logging integrated
- [x] Deployment documentation updated
- [x] Testing procedures defined

### ⏳ Pending (Next Steps)

**Phase 3: Klaviyo Integration**
- [ ] Obtain Klaviyo API key
- [ ] Create Klaviyo email engagement sync
- [ ] Sync subscriber lists to HubSpot
- [ ] Track campaign engagement metrics

**Phase 4: Smartlead Integration**
- [ ] Obtain Smartlead API key
- [ ] Create cold outreach campaign sync
- [ ] Track lead responses
- [ ] Sync qualified leads to HubSpot

**Phase 5: Email Template Library**
- [ ] Build template management system
- [ ] Integrate with PubMed for product research
- [ ] Implement AI content generation
- [ ] Create tone/style variations

---

## Files Modified

### New Files
- `/root/master-ops/infra/n8n-workflows/templates/unleashed-customer-sync.json`
- `/root/master-ops/infra/n8n-workflows/templates/unleashed-order-sync.json`
- `/root/master-ops/PHASE-2-COMPLETE.md` (this file)

### Updated Files
- `/root/master-ops/.env` - Added Unleashed API credentials
- `/root/master-ops/DEPLOYMENT-CHECKLIST.md` - Updated with Phase 2 workflows
- `/root/master-ops/BUSINESS-LOGIC-SUMMARY.md` - Already documented Phase 2 logic

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ TEELIXIR ECOSYSTEM                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Shopify (B2C)          Unleashed (B2C + B2B)                  │
│  ├─ Retail customers    ├─ Shopify-synced (B2C) ← SKIP        │
│  └─ Webhook trigger     └─ Direct orders (B2B)  ← SYNC         │
│         │                        │                              │
│         │ Real-time              │ Every 6 hours                │
│         ▼                        ▼                              │
│    ┌─────────────────────────────────┐                         │
│    │         n8n Workflows           │                         │
│    ├─────────────────────────────────┤                         │
│    │ • Shopify Customer Sync         │                         │
│    │ • Shopify Order Sync            │                         │
│    │ • Unleashed Customer Sync ✨    │                         │
│    │ • Unleashed Order Sync ✨       │                         │
│    │ • Ambassador Handler            │                         │
│    └─────────────────────────────────┘                         │
│                    │                                            │
│                    ▼                                            │
│    ┌─────────────────────────────────┐                         │
│    │         HubSpot CRM             │                         │
│    ├─────────────────────────────────┤                         │
│    │ Contacts with:                  │                         │
│    │ • shopify_customer_id (B2C)     │                         │
│    │ • unleashed_customer_code (B2B) │                         │
│    │ • Deals from both sources       │                         │
│    └─────────────────────────────────┘                         │
│                    │                                            │
│                    ▼                                            │
│    ┌─────────────────────────────────┐                         │
│    │       Supabase Tracking         │                         │
│    ├─────────────────────────────────┤                         │
│    │ • hubspot_sync_log              │                         │
│    │ • integration_logs              │                         │
│    │ • Monitoring views              │                         │
│    └─────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

✨ = New in Phase 2
```

---

## Summary

**Phase 2 is now complete and ready for deployment.**

You have:
1. ✅ Full Shopify → HubSpot integration (Phase 1)
2. ✅ Full Unleashed → HubSpot integration (Phase 2)
3. ✅ Smart B2C/B2B deduplication
4. ✅ Ambassador application pipeline
5. ✅ Comprehensive monitoring and logging
6. ✅ 44 custom HubSpot properties
7. ✅ 5 production-ready n8n workflows

**Next actions:**
1. Import Phase 2 workflows to n8n
2. Activate workflows
3. Monitor initial sync execution
4. Run Tests 5 & 6 from deployment checklist
5. Begin planning Phase 3 (Klaviyo) when API key is available

---

**Document Version:** 1.0
**Date:** 2025-11-21
**Status:** Phase 2 Complete ✅
