# Local Setup Required for Claude Remote Productivity

**Created:** 2025-12-01
**Purpose:** Items that need to be configured/pushed from local environment to enable full Claude productivity in remote sessions.

---

## Executive Summary

Claude has **partial access** to systems via Supabase (curl works, Node.js DNS blocked). The vault contains 76 credentials, but several schemas aren't deployed and some scripts have hardcoded fallbacks that should use the vault.

**Once these items are addressed, Claude can:**
- Run all automation scripts with real data
- Build and verify skills with actual system access
- Deploy schemas and test integrations
- Provide meaningful operational assistance

---

## 1. SCHEMAS TO DEPLOY

The following SQL migrations exist but tables are NOT in Supabase:

### Critical (Blocking Functionality)

| Schema File | Tables Created | Business | Priority |
|-------------|----------------|----------|----------|
| `infra/supabase/schema-business-views.sql` | `businesses` + 13 views | All | 🔴 HIGH |
| `infra/supabase/migrations/20251201_job_monitoring.sql` | `dashboard_job_status` | All | 🔴 HIGH |
| `teelixir/sql/20251130_teelixir_distributor_intelligence.sql` | `tlx_distributors`, `tlx_products`, etc. | Teelixir | 🔴 HIGH |
| `teelixir/sql/20251201_teelixir_automations.sql` | `tlx_winback_emails`, `tlx_automation_config` | Teelixir | 🔴 HIGH |

### Important (Enhances Functionality)

| Schema File | Tables Created | Business | Priority |
|-------------|----------------|----------|----------|
| `buy-organics-online/supabase-migrations/020_red_hill_fresh_schema.sql` | `wc_*` tables (15) | Red Hill Fresh | 🟡 MEDIUM |
| `elevate-wholesale/supabase/migrations/001_initial_schema.sql` | `trial_customers`, `prospecting_*` | Elevate | 🟡 MEDIUM |

### Deployment Command
```bash
# From local with Supabase CLI access:
cd /path/to/master-ops

# Option 1: Supabase CLI
supabase db push

# Option 2: Manual via Supabase Dashboard SQL Editor
# Copy/paste each .sql file and execute
```

---

## 2. NODE.JS DNS RESOLUTION

### Problem
```bash
node creds.js list
# Error: getaddrinfo EAI_AGAIN usibnysqelovfuctmkqw.supabase.co
```

Curl works fine, but Node.js DNS resolution fails in the remote environment.

### Workaround Already Available
Claude can use `curl` directly to query Supabase REST API. However, running TypeScript scripts that use the Supabase client library will fail.

### Local Action Required
None - this is an environment limitation. Scripts should be run locally or the remote environment needs DNS configuration.

---

## 3. HARDCODED CREDENTIALS TO CLEAN UP

These scripts have hardcoded credential fallbacks that should be removed (vault should be the only source):

### Teelixir Scripts

| File | Line | Issue |
|------|------|-------|
| `teelixir/scripts/reconcile-winback-conversions.ts` | ~170 | Hardcoded Shopify token fallback |
| `teelixir/scripts/sync-klaviyo-unengaged.ts` | ~34-37 | Hardcoded SUPABASE_SERVICE_KEY fallback |
| `teelixir/scripts/send-winback-emails.ts` | ~34-37 | Hardcoded SUPABASE_SERVICE_KEY fallback |

### Recommended Fix
Remove fallback constants, ensure scripts fail gracefully if vault unavailable:
```typescript
// REMOVE THIS:
const SUPABASE_SERVICE_KEY_FALLBACK = 'eyJ...';

// KEEP ONLY:
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not found. Run: node creds.js load teelixir');
}
```

---

## 4. ENVIRONMENT TEMPLATE FIXES

### Red Hill Fresh .env.template
**File:** `red-hill-fresh/scripts/.env.template` or project root

**Issue:** Still references old BigCommerce variables instead of WooCommerce

**Should contain:**
```env
# Red Hill Fresh - WooCommerce
RHF_WC_URL=https://redhillfresh.com.au
RHF_WC_CONSUMER_KEY=ck_...
RHF_WC_CONSUMER_SECRET=cs_...

# NOT these (deprecated):
# RHF_BC_STORE_HASH=...
# RHF_BC_ACCESS_TOKEN=...
```

---

## 5. MISSING CREDENTIALS IN VAULT

Based on schema requirements, these credentials may need to be added:

### Teelixir
| Credential | Status | Needed For |
|------------|--------|------------|
| `klaviyo_segment_id` | ❓ Check | sync-klaviyo-unengaged.ts |
| `klaviyo_list_id` | ❓ Check | Alternative to segment |

### Red Hill Fresh
| Credential | Status | Needed For |
|------------|--------|------------|
| `wc_consumer_key` | ❓ Check | WooCommerce API |
| `wc_consumer_secret` | ❓ Check | WooCommerce API |

### Verification Command
```bash
node creds.js list teelixir
node creds.js list redhillfresh
```

---

## 6. VAULT CREDENTIALS CURRENTLY AVAILABLE

✅ These are already in the vault and accessible:

### BOO (29 credentials)
- BigCommerce: `bc_store_hash`, `bc_access_token`, `bc_client_id`, `bc_client_secret`
- Suppliers: `oborne_ftp_*`, `uhp_email`, `uhp_password`, `kadac_uid`
- Google: `google_ads_*`, `google_merchant_*`
- Other: `xero_*`, `klaviyo_api_key`, `livechat_*`

### Elevate (11 credentials)
- Shopify: `shopify_store_url`, `shopify_access_token`
- Unleashed: `unleashed_api_id`, `unleashed_api_key`
- Other: `xero_*`, `klaviyo_api_key`

### Teelixir (14 credentials)
- Shopify: `shopify_*` (store_url, access_token, api_key, api_secret)
- Unleashed: `unleashed_api_id`, `unleashed_api_key`
- Gmail: `gmail_client_id`, `gmail_client_secret`, `gmail_refresh_token`
- Other: `xero_*`, `klaviyo_api_key`

### Red Hill Fresh (7 credentials)
- WordPress: `wp_url`, `wp_password`, `wp_app_password`
- Xero: `xero_*`

### Global (15 credentials)
- n8n: `n8n_url`, `n8n_api_key`
- HubSpot: `hubspot_access_token`, `hubspot_secret`
- Google: `google_ads_client_id`, `google_ads_client_secret`, `google_gsc_refresh_token`
- AWS: `aws_access_key_id`, `aws_secret_access_key`
- Other: `smartlead_api_key`, `gmail_*`, `do_api_token`

---

## 7. TABLES CONFIRMED WORKING

These tables exist and have data:

| Table | Business | Status |
|-------|----------|--------|
| `secure_credentials` | All | ✅ 76 records |
| `supplier_products` | BOO | ✅ Has UHP data |
| `google_ads_opportunities` | All | ✅ Schema exists |
| `google_merchant_products` | BOO | ✅ Schema exists |
| `livechat_messages` | BOO | ✅ Schema exists |
| `livechat_ai_suggestions` | BOO | ✅ Schema exists |
| `gsc_sync_logs` | All | ✅ Schema exists |
| `shipping_tracking_events` | All | ✅ Schema exists |

---

## 8. QUICK WINS FOR LOCAL

### Immediate Actions (30 minutes total)

1. **Deploy critical schemas** (15 min)
   ```bash
   # In Supabase SQL Editor, run:
   # 1. infra/supabase/schema-business-views.sql
   # 2. infra/supabase/migrations/20251201_job_monitoring.sql
   ```

2. **Deploy Teelixir schemas** (10 min)
   ```bash
   # In Supabase SQL Editor, run:
   # 1. teelixir/sql/20251130_teelixir_distributor_intelligence.sql
   # 2. teelixir/sql/20251201_teelixir_automations.sql
   ```

3. **Verify credentials** (5 min)
   ```bash
   node creds.js verify
   ```

---

## 9. AFTER LOCAL SETUP COMPLETE

Once schemas are deployed, push a confirmation and Claude can:

1. **Query real business data** across all 4 businesses
2. **Run health checks** on integrations
3. **Build verified skills** with actual data patterns
4. **Execute automation scripts** (via curl workaround)
5. **Provide operational insights** from real metrics

---

## 10. COMMUNICATION PROTOCOL

### After completing local setup:
1. Run schema deployments
2. Verify with: `node creds.js verify`
3. Commit any changes
4. Push to this branch or main
5. Start new Claude session - will have full access

### If issues encountered:
Document in a `LOCAL-SETUP-RESULTS.md` file and push, so Claude can troubleshoot in next session.

---

## Checklist

- [ ] Deploy `schema-business-views.sql`
- [ ] Deploy `20251201_job_monitoring.sql`
- [ ] Deploy Teelixir distributor intelligence schema
- [ ] Deploy Teelixir automations schema
- [ ] Verify RHF has WooCommerce credentials in vault
- [ ] Remove hardcoded fallbacks from Teelixir scripts (optional, can do later)
- [ ] Run `node creds.js verify` and document results
- [ ] Push confirmation when complete

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
