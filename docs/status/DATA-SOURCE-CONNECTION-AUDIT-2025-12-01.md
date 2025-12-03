# Data Source Connection Audit - ops.growthcohq.com

**Date:** 2025-12-01
**Auditor:** Claude Code
**Purpose:** Identify disconnected data sources and connection opportunities for the operations portal

---

## Executive Summary

The ops.growthcohq.com portal has significant integration infrastructure in place, but several key data sources remain disconnected for certain businesses. This audit identifies:

- **Google Merchant Center:** BOO fully connected, Teelixir and Red Hill Fresh need vault credentials
- **Google Search Console:** Only BOO is syncing data; 3 businesses disconnected
- **Additional Opportunities:** PPC dashboard, Xero financial data, inventory alerts

---

## 1. Google Merchant Center Status

### Current State

| Business | Status | Merchant ID | Vault Credential | Dashboard Page |
|----------|--------|-------------|------------------|----------------|
| Buy Organics Online | ✅ Connected | 10043678 | `boo/google_merchant_id` | `/boo/merchant` |
| Teelixir | ⚠️ Incomplete | Needs setup | Missing | Not in nav |
| Red Hill Fresh | ⚠️ Incomplete | 523304312 | Missing | Not in nav |
| Elevate Wholesale | N/A | N/A (Shopify B2B) | N/A | N/A |

### BOO (Connected)
- **Location:** `dashboard/src/app/(dashboard)/[business]/merchant/page.tsx`
- **API Routes:** `/api/merchant/summary`, `/api/merchant/products`, `/api/merchant/trends`
- **Sync Job:** `buy-organics-online/gmc-sync-cron.js` (daily 3:00 AM AEST)
- **Database Tables:** `google_merchant_products`, `google_merchant_account_snapshots`, `google_merchant_issue_history`

### Teelixir (Action Required)
**What's Missing:**
1. `GMC_TEELIXIR_MERCHANT_ID` - Not in vault mapping
2. `GMC_TEELIXIR_REFRESH_TOKEN` - Not in vault mapping

**To Connect:**
```bash
# 1. Get credentials from Google Merchant Center
# 2. Add to vault
node scripts/repopulate-vault.js

# 3. Add mapping to scripts/repopulate-vault.js:
'GMC_TEELIXIR_MERCHANT_ID': { project: 'teelixir', name: 'google_merchant_id', desc: 'Teelixir Google Merchant Center ID' },
'GMC_TEELIXIR_REFRESH_TOKEN': { project: 'teelixir', name: 'google_merchant_refresh_token', desc: 'Teelixir GMC Refresh Token' },
```

### Red Hill Fresh (Action Required)
**What's Missing:**
1. Merchant ID documented (523304312) but not in vault
2. `GMC_RHF_REFRESH_TOKEN` - Needs OAuth setup

**To Connect:**
```bash
# Add to scripts/repopulate-vault.js:
'GMC_RHF_MERCHANT_ID': { project: 'redhillfresh', name: 'google_merchant_id', desc: 'RHF Google Merchant Center ID' },
'GMC_RHF_REFRESH_TOKEN': { project: 'redhillfresh', name: 'google_merchant_refresh_token', desc: 'RHF GMC Refresh Token' },
```

---

## 2. Google Search Console Status

### Current State

| Business | Status | Property | Data Syncing | Dashboard |
|----------|--------|----------|--------------|-----------|
| Buy Organics Online | ✅ Connected | buyorganicsonline.com.au | Yes | `/boo/seo` |
| Teelixir | ❌ Not Connected | teelixir.com | No | Shows "Not Connected" |
| Red Hill Fresh | ⚠️ Partial | redhillfresh.com.au | No | Shows "Not Connected" |
| Elevate Wholesale | ❌ Not Connected | elevatewholesale.com.au | No | Not in nav |

### Current Configuration
- **Global Token:** `GOOGLE_GSC_REFRESH_TOKEN` (jayson@fyic.com.au)
- **Sync Scripts:** `shared/libs/integrations/gsc/sync-gsc-data.js`
- **Database:** `gsc_page_daily_stats`, `gsc_issue_urls`, `gsc_sync_logs`

### BOO (Connected)
- Full performance data syncing
- Page-level metrics available
- Issue tracking active

### Teelixir (Action Required)
**What's Needed:**
1. Verify jayson@fyic.com.au has access to teelixir.com GSC property
2. Add site property to sync configuration
3. Update sync script to handle multiple properties

**Quick Fix:**
```javascript
// In sync-gsc-data.js, add:
const SITE_URLS = {
  boo: 'sc-domain:buyorganicsonline.com.au',
  teelixir: 'sc-domain:teelixir.com',
  rhf: 'sc-domain:redhillfresh.com.au'
};
```

### Red Hill Fresh (Action Required)
**Status:** Documented as "Working via jayson@fyic.com.au" but not syncing
**What's Needed:**
1. Verify GSC property access
2. Add to sync configuration
3. Run initial data backfill

### Elevate Wholesale (Action Required)
**What's Needed:**
1. Add GSC property for elevatewholesale.com.au
2. Grant jayson@fyic.com.au access
3. Add to sync configuration

---

## 3. Additional Data Source Opportunities

### 3.1 PPC Dashboard (Google Ads)
**Status:** Infrastructure exists but dashboard page incomplete

| Business | Ads Account | Vault Credential | Dashboard |
|----------|-------------|------------------|-----------|
| BOO | Configured | `boo/google_ads_*` | `/home/ppc` (empty) |
| Teelixir | Configured | `teelixir/google_ads_*` | Not implemented |
| Red Hill Fresh | Configured | `rhf/google_ads_*` | Not implemented |
| Elevate | Not applicable | N/A | N/A |

**Opportunity:** Create PPC dashboard pages showing:
- Campaign performance
- Keyword metrics
- Search term analysis
- Budget utilization

### 3.2 Xero Financial Integration
**Status:** Credentials in vault but no dashboard integration

| Business | Xero Connected | Dashboard |
|----------|----------------|-----------|
| BOO | Yes (vault) | No page |
| Teelixir | Yes (vault) | No page |
| Elevate | Yes (vault) | No page |
| RHF | Yes (vault) | No page |

**Opportunity:** Create Finance dashboard (`/[business]/finance`) showing:
- Revenue trends
- Outstanding invoices
- Cash flow

### 3.3 Klaviyo Email Marketing
**Status:** API keys in vault

| Business | Klaviyo Connected | Dashboard |
|----------|-------------------|-----------|
| BOO | Yes | No page |
| Teelixir | Yes | No page |
| Elevate | Yes | No page |

**Opportunity:** Create Email dashboard showing:
- Campaign performance
- List growth
- Deliverability metrics

### 3.4 Inventory Stock Alerts
**Status:** Partial implementation for BOO

| Business | Stock System | Dashboard |
|----------|--------------|-----------|
| BOO | BigCommerce + Suppliers | `/boo/stock` (active) |
| Teelixir | Shopify | Not implemented |
| Elevate | Unleashed | Partial |
| RHF | WooCommerce | Not implemented |

---

## 4. Navigation Gaps

### Current Business Navigation

**BOO (Most Complete):**
- Dashboard, Shipping, SEO, Merchant Center, Stock Sync, Product Health, LiveChat, Brands

**Teelixir (Missing GMC, Ads):**
- Dashboard, Shipping, Distributors, Dist. Trends, Automations, Orders, Products, Ads Performance
- **Missing:** Merchant Center, SEO

**Red Hill Fresh (Minimal):**
- Dashboard, Orders, Delivery Zones, Inventory
- **Missing:** Merchant Center, SEO, PPC, Stock Sync

**Elevate Wholesale:**
- Dashboard, Shipping, Prospecting, Customers, Trials, HubSpot Sync
- **Missing:** SEO (if applicable)

### Recommended Navigation Additions

```typescript
// In business-config.ts

// Teelixir - add:
{ name: 'Merchant Center', href: '/merchant', icon: ShoppingCart },
{ name: 'SEO', href: '/seo', icon: Search },

// Red Hill Fresh - add:
{ name: 'SEO', href: '/seo', icon: Search },
{ name: 'Merchant Center', href: '/merchant', icon: ShoppingCart },
```

---

## 5. Priority Action Items

### Immediate (This Week)

| Priority | Task | Business | Effort |
|----------|------|----------|--------|
| 1 | Add GMC credentials to vault mapping | Teelixir, RHF | Low |
| 2 | Verify GSC access for all properties | All | Low |
| 3 | Update GSC sync to handle multiple sites | All | Medium |
| 4 | Add Merchant Center nav to Teelixir | Teelixir | Low |

### Short-term (Next 2 Weeks)

| Priority | Task | Business | Effort |
|----------|------|----------|--------|
| 5 | Create PPC dashboard page | Home | Medium |
| 6 | Add SEO nav to RHF | RHF | Low |
| 7 | Set up GMC sync for Teelixir | Teelixir | Medium |
| 8 | Backfill GSC data for RHF | RHF | Low |

### Medium-term (Next Month)

| Priority | Task | Business | Effort |
|----------|------|----------|--------|
| 9 | Create Finance dashboard (Xero) | All | High |
| 10 | Create Email dashboard (Klaviyo) | BOO, Teelixir | Medium |
| 11 | Extend stock alerts to Teelixir | Teelixir | Medium |

---

## 6. Required Credentials Checklist

### Google Merchant Center

- [ ] **Teelixir:**
  - [ ] Get Merchant Center ID from Google
  - [ ] Generate OAuth refresh token
  - [ ] Add to vault: `teelixir/google_merchant_id`
  - [ ] Add to vault: `teelixir/google_merchant_refresh_token`

- [ ] **Red Hill Fresh:**
  - [ ] Verify Merchant ID: 523304312
  - [ ] Generate OAuth refresh token
  - [ ] Add to vault: `redhillfresh/google_merchant_id`
  - [ ] Add to vault: `redhillfresh/google_merchant_refresh_token`

### Google Search Console

- [ ] **Teelixir:**
  - [ ] Verify jayson@fyic.com.au has owner access to teelixir.com
  - [ ] Test API access with existing global token

- [ ] **Red Hill Fresh:**
  - [ ] Verify jayson@fyic.com.au has owner access to redhillfresh.com.au
  - [ ] Test API access with existing global token

- [ ] **Elevate Wholesale:**
  - [ ] Add GSC property for elevatewholesale.com.au
  - [ ] Grant jayson@fyic.com.au owner access
  - [ ] Test API access

---

## 7. Code Changes Required

### Update vault-repopulate.js

Add these mappings:

```javascript
// Google Merchant Center - Teelixir
'GMC_TEELIXIR_MERCHANT_ID': { project: 'teelixir', name: 'google_merchant_id', desc: 'Teelixir Google Merchant Center ID' },
'GMC_TEELIXIR_REFRESH_TOKEN': { project: 'teelixir', name: 'google_merchant_refresh_token', desc: 'Teelixir GMC Refresh Token' },

// Google Merchant Center - Red Hill Fresh
'GMC_RHF_MERCHANT_ID': { project: 'redhillfresh', name: 'google_merchant_id', desc: 'RHF Google Merchant Center ID' },
'GMC_RHF_REFRESH_TOKEN': { project: 'redhillfresh', name: 'google_merchant_refresh_token', desc: 'RHF GMC Refresh Token' },

// Google Ads - Teelixir
'GOOGLE_ADS_TEELIXIR_CUSTOMER_ID': { project: 'teelixir', name: 'google_ads_customer_id', desc: 'Teelixir Google Ads Customer ID' },
'GOOGLE_ADS_TEELIXIR_REFRESH_TOKEN': { project: 'teelixir', name: 'google_ads_refresh_token', desc: 'Teelixir Google Ads Refresh Token' },

// Google Ads - RHF
'GOOGLE_ADS_RHF_CUSTOMER_ID': { project: 'redhillfresh', name: 'google_ads_customer_id', desc: 'RHF Google Ads Customer ID' },
'GOOGLE_ADS_RHF_REFRESH_TOKEN': { project: 'redhillfresh', name: 'google_ads_refresh_token', desc: 'RHF Google Ads Refresh Token' },
```

### Update business-config.ts

```typescript
// Teelixir - add Merchant Center
{ name: 'Merchant Center', href: '/merchant', icon: ShoppingCart },
{ name: 'SEO', href: '/seo', icon: Search },

// Red Hill Fresh - add SEO and Merchant Center
{ name: 'SEO', href: '/seo', icon: Search },
{ name: 'Merchant Center', href: '/merchant', icon: ShoppingCart },
```

---

## 8. Verification Commands

### Test GMC Connection
```bash
# Test BOO (should work)
node shared/libs/integrations/google-merchant/test-connection.js

# After adding credentials, test others
GMC_BOO_MERCHANT_ID=10043678 node shared/libs/integrations/google-merchant/test-connection.js
```

### Test GSC Connection
```bash
# Test current connection
node shared/libs/integrations/gsc/sync-gsc-data.js --test

# Verify site access
node -e "
const {google} = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,
  process.env.GOOGLE_ADS_CLIENT_SECRET
);
oauth2Client.setCredentials({refresh_token: process.env.GOOGLE_GSC_REFRESH_TOKEN});
const gsc = google.searchconsole({version: 'v1', auth: oauth2Client});
gsc.sites.list().then(r => console.log(r.data.siteEntry));
"
```

---

## 9. Dashboard Health Check API

The portal has a health check system at `/api/health` that queries the `dashboard_health_checks` table. Integrations can be tracked per business:

| Integration Key | Display Name |
|-----------------|--------------|
| supabase | Supabase |
| bigcommerce | BigCommerce |
| shopify | Shopify |
| xero | Xero |
| woocommerce | WooCommerce |
| google_ads | Google Ads |
| google_merchant | Google Merchant |
| gsc | Search Console |

---

## 10. Summary

### What's Connected
- BOO: Most complete (Supabase, BigCommerce, GMC, GSC, LiveChat, Xero)
- Teelixir: Shopify, Klaviyo, Xero (partial)
- Elevate: Shopify, Unleashed, HubSpot, Xero
- RHF: WooCommerce, Xero

### What Needs Connection
1. **Teelixir:** GMC, GSC, Google Ads dashboard
2. **Red Hill Fresh:** GMC, GSC, Google Ads dashboard
3. **Elevate:** GSC (if applicable)
4. **All:** PPC dashboard, Finance dashboard

### Estimated Effort
- Low effort fixes: 4-6 hours (vault mappings, nav updates)
- Medium effort: 2-3 days (GSC multi-site, PPC dashboard)
- High effort: 1-2 weeks (Finance dashboard, full integration)

---

*Report generated: 2025-12-01*
*Next review: 2025-12-08*
