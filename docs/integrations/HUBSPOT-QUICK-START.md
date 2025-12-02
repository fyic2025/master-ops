# HubSpot Integration - Quick Start Guide

**Last Updated:** 2025-11-21
**Status:** Phase 1 & 2 Complete ✅

---

## 🎯 What Is This?

A complete HubSpot-centric integration system that automatically syncs:
- Shopify customers & orders → HubSpot contacts & deals
- Unleashed B2B customers & orders → HubSpot (with smart deduplication)
- Ambassador applications → HubSpot pipeline

**Everything flows into HubSpot as your single source of truth CRM.**

---

## 📚 Documentation Overview

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[HUBSPOT-QUICK-START.md](HUBSPOT-QUICK-START.md)** | This file - Quick overview | First time setup |
| **[DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)** | Step-by-step deployment | Deploying to production |
| **[BUSINESS-LOGIC-SUMMARY.md](BUSINESS-LOGIC-SUMMARY.md)** | Business rules & data flow | Understanding segmentation |
| **[PHASE-2-COMPLETE.md](PHASE-2-COMPLETE.md)** | Unleashed integration details | Deploying Phase 2 |
| **[HUBSPOT-INTEGRATION-README.md](HUBSPOT-INTEGRATION-README.md)** | Complete technical reference | Deep dive / troubleshooting |

---

## ✅ What's Been Built

### Phase 1: Shopify + HubSpot (READY TO DEPLOY)
- Extended HubSpot API connector (Deals, Associations, Batch, Search)
- 44 custom HubSpot properties across contacts, companies, and deals
- 3 n8n workflows for real-time Shopify sync
- Automated webhook registration for both Shopify stores
- Supabase sync tracking database

### Phase 2: Unleashed + HubSpot (READY TO DEPLOY)
- Unleashed API credentials configured (Teelixir + Elevate)
- 2 n8n workflows for scheduled Unleashed sync (every 6 hours)
- Smart B2C/B2B deduplication (prevents duplicates)
- Full integration with Supabase tracking

---

## 🚀 Quick Deployment (30 minutes)

### Step 1: Deploy Supabase Schema (5 min)
```bash
# Go to: https://qcvfxxsnqvdfmpbcgdni.supabase.co
# SQL Editor → New Query
# Copy/paste: infra/supabase/schema-hubspot-sync.sql
# Execute
```

### Step 2: Create HubSpot Properties (5 min)
```bash
npx tsx scripts/setup-hubspot-properties.ts
```

### Step 3: Import n8n Workflows (10 min)
Go to https://automation.growthcohq.com/workflows
- Import all 5 JSON files from `infra/n8n-workflows/templates/`
- Verify credentials are linked

### Step 4: Register Shopify Webhooks (5 min)
```bash
npx tsx scripts/register-shopify-webhooks.ts
```

### Step 5: Activate Workflows (5 min)
In n8n, toggle "Active" for all 5 workflows

---

## 🔄 How It Works

### Teelixir Data Flow
```
┌─────────────┐                    ┌──────────┐
│   Shopify   │──real-time────────►│          │
│   (B2C)     │    webhooks        │ HubSpot  │
└─────────────┘                    │   CRM    │
                                   │          │
┌─────────────┐                    │          │
│  Unleashed  │──every 6 hrs──────►│          │
│ (B2C + B2B) │  (B2B only sync)   │          │
└─────────────┘                    └──────────┘
```

**Smart Deduplication:**
1. Shopify customers sync first (B2C)
2. Unleashed checks if contact has `shopify_customer_id`
3. If YES → Skip (already synced from Shopify)
4. If NO → Sync as B2B distributor

### Elevate Data Flow
```
┌─────────────┐
│   Shopify   │──real-time────────►│ HubSpot │
│  (B2B only) │    webhooks        │   CRM   │
└─────────────┘                    └─────────┘
```

---

## 🎯 Key HubSpot Properties

### Contact Properties
- `contact_type` - "customer" | "distributor" | "stockist" | "ambassador"
- `wholesale_account` - true (B2B) | false (B2C)
- `source_business` - "teelixir" | "elevate"
- `shopify_customer_id` - ID from Shopify (B2C customers)
- `unleashed_customer_code` - Code from Unleashed (B2B customers)
- `ambassador_status` - "prospect" | "active" | "inactive" | "churned"

### Deal Properties
- `deal_source` - "shopify_order" | "unleashed_order" | "website_form"
- `source_business` - "teelixir" | "elevate"
- `shopify_order_id` / `unleashed_order_id` - Order tracking
- `fulfillment_status` - Order status
- `order_total` - Deal amount

---

## 📊 HubSpot Segmentation Examples

### Teelixir B2C Customers
```
source_business = "teelixir"
shopify_customer_id IS KNOWN
wholesale_account = false
```

### Teelixir B2B Customers
```
source_business = "teelixir"
unleashed_customer_code IS KNOWN
shopify_customer_id IS UNKNOWN
wholesale_account = true
```

### All B2B Customers
```
wholesale_account = true
```

### Ambassador Prospects
```
contact_type = "ambassador"
ambassador_status = "prospect"
```

---

## 🧪 Testing Your Deployment

### Test 1: Shopify Customer Sync
1. Create test customer in Teelixir Shopify
2. Wait 1-2 minutes
3. Check HubSpot for new contact
4. Verify properties: `contact_type="customer"`, `wholesale_account=false`

### Test 2: Shopify Order Sync
1. Create test order in Teelixir Shopify
2. Wait 1-2 minutes
3. Check HubSpot for new deal
4. Verify deal is associated with customer contact

### Test 3: Unleashed B2B Sync (Phase 2)
1. Wait for first scheduled execution (6 hours) or trigger manually
2. Check HubSpot for B2B distributor contacts
3. Verify `unleashed_customer_code` is populated
4. Verify `shopify_customer_id` is empty

---

## 📈 Monitoring

### Daily Check
```sql
-- Run in Supabase SQL Editor
SELECT
  external_source,
  object_type,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful
FROM hubspot_sync_log
WHERE last_synced_at >= NOW() - INTERVAL '24 hours'
GROUP BY external_source, object_type;
```

### Check for Errors
```sql
SELECT * FROM integration_logs
WHERE level = 'error'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### n8n Executions
Go to: https://automation.growthcohq.com/executions
- All workflows should show "Success"
- Failed executions need investigation

---

## 🔗 Important URLs

| Service | URL |
|---------|-----|
| HubSpot CRM | https://app.hubspot.com |
| n8n Workflows | https://automation.growthcohq.com |
| Supabase Dashboard | https://qcvfxxsnqvdfmpbcgdni.supabase.co |
| Teelixir Shopify | https://teelixir-au.myshopify.com/admin |
| Elevate Shopify | https://elevatewholesale.myshopify.com/admin |

---

## 🐛 Common Issues

### Webhooks Not Firing
- Check Shopify Admin → Settings → Notifications → Webhooks
- Verify n8n workflows are active (green toggle)

### Duplicate Contacts
- Run HubSpot deduplication: Contacts → Manage duplicates
- Review search logic in n8n workflows

### B2B Customers Being Skipped
- Verify customer doesn't have `shopify_customer_id` in HubSpot
- Check if email is shared between B2C and B2B accounts

---

## 📞 Need Help?

**Read the detailed guides:**
- [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) - Full deployment steps
- [BUSINESS-LOGIC-SUMMARY.md](BUSINESS-LOGIC-SUMMARY.md) - How data flows
- [HUBSPOT-INTEGRATION-README.md](HUBSPOT-INTEGRATION-README.md) - Technical deep dive

---

**Quick Start Version:** 1.0
**Status:** Phase 1 & 2 Ready ✅
