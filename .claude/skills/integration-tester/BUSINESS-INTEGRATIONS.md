# Business Integration Map

> Complete integration inventory for all 4 businesses.

---

## Business Overview

| Business | Platform | Primary Store | Database |
|----------|----------|---------------|----------|
| **Buy Organics Online (BOO)** | BigCommerce | buyorganicsonline.com.au | Supabase (boo_*) |
| **Teelixir** | Shopify + Unleashed | teelixir.com | Supabase (tlx_*) |
| **Elevate Wholesale** | Shopify B2B | elevate wholesale | Supabase (elv_*) |
| **Red Hill Fresh (RHF)** | WooCommerce | redhillfresh.com.au | Supabase (rhf_*) |

---

## 1. Buy Organics Online (BOO)

### Platform Stack
- **eCommerce:** BigCommerce
- **Database:** Supabase
- **Automation:** n8n
- **Analytics:** Google Search Console

### Integrations

| Integration | Type | Auth Method | Vault Path |
|-------------|------|-------------|------------|
| BigCommerce Catalog | REST API | X-Auth-Token | `boo/bc_access_token` |
| BigCommerce Orders | REST API | X-Auth-Token | `boo/bc_access_token` |
| Supabase | REST API | Bearer + apikey | `boo/supabase_*` |
| Google Search Console | OAuth2 | Service Account | `boo/gsc_*` |

### Test Commands

```bash
# Load BOO credentials
node creds.js load boo

# Test BigCommerce
curl -s "https://api.bigcommerce.com/stores/${BOO_BC_STORE_HASH}/v3/catalog/summary" \
  -H "X-Auth-Token: ${BOO_BC_ACCESS_TOKEN}" | jq '.data'

# Test Supabase
curl -s "${BOO_SUPABASE_URL}/rest/v1/boo_products?limit=1" \
  -H "apikey: ${BOO_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${BOO_SUPABASE_SERVICE_ROLE_KEY}"
```

### Key Tables

| Table | Purpose | Sync Frequency |
|-------|---------|----------------|
| boo_products | Product catalog | Daily |
| boo_orders | Order history | Hourly |
| boo_customers | Customer data | Daily |
| boo_inventory | Stock levels | Every 15 min |
| boo_gsc_data | Search analytics | Daily |

### n8n Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| boo-bc-product-sync | Schedule (daily) | Sync products to Supabase |
| boo-bc-order-sync | Schedule (hourly) | Sync orders |
| boo-gsc-tracker | Schedule (daily) | Fetch GSC data |
| boo-inventory-alert | Schedule (hourly) | Low stock alerts |

---

## 2. Teelixir

### Platform Stack
- **eCommerce:** Shopify
- **ERP/Inventory:** Unleashed
- **Email Marketing:** Klaviyo
- **CRM:** HubSpot
- **Lead Gen:** Smartlead
- **Database:** Supabase
- **Automation:** n8n

### Integrations

| Integration | Type | Auth Method | Vault Path |
|-------------|------|-------------|------------|
| Shopify Admin | REST/GraphQL | Access Token | `teelixir/shopify_access_token` |
| Unleashed | REST API | HMAC-SHA256 | `teelixir/unleashed_api_*` |
| Klaviyo | REST API | API Key | `teelixir/klaviyo_api_key` |
| HubSpot | REST API | Bearer Token | `global/hubspot_access_token` |
| Smartlead | REST API | API Key | `global/smartlead_api_key` |
| Supabase | REST API | Bearer + apikey | `teelixir/supabase_*` |

### Test Commands

```bash
# Load Teelixir credentials
node creds.js load teelixir

# Test Shopify
curl -s "https://teelixir.myshopify.com/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: ${TEELIXIR_SHOPIFY_ACCESS_TOKEN}" | jq '.shop.name'

# Test Klaviyo
curl -s "https://a.klaviyo.com/api/accounts/" \
  -H "Authorization: Klaviyo-API-Key ${TEELIXIR_KLAVIYO_API_KEY}" \
  -H "revision: 2024-02-15"

# Test Unleashed (requires HMAC - use script)
npx tsx test-unleashed.ts
```

### Key Tables

| Table | Purpose | Sync Frequency |
|-------|---------|----------------|
| tlx_shopify_orders | Shopify orders | Every 15 min |
| tlx_shopify_customers | Customer data | Daily |
| tlx_unleashed_products | ERP products | Daily |
| tlx_unleashed_stock | Stock on hand | Hourly |
| tlx_klaviyo_profiles | Email subscribers | Daily |
| tlx_hubspot_contacts | CRM contacts | Hourly |

### n8n Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| tlx-unleashed-orders | Schedule (15 min) | Sync Unleashed orders |
| tlx-unleashed-stock | Schedule (hourly) | Stock level sync |
| tlx-shopify-sync | Webhook | Real-time order capture |
| tlx-smartlead-hubspot | Webhook | Lead to CRM sync |
| tlx-winback-campaign | Schedule (daily) | Customer winback |
| tlx-klaviyo-sync | Schedule (daily) | Email list sync |

### Special Considerations

**Unleashed HMAC Authentication:**
```javascript
const crypto = require('crypto')

function getUnleashedHeaders(apiId, apiKey, queryString = '') {
  const decoded = decodeURIComponent(queryString)
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(decoded)
    .digest('base64')

  return {
    'api-auth-id': apiId,
    'api-auth-signature': signature,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}
```

---

## 3. Elevate Wholesale

### Platform Stack
- **eCommerce:** Shopify B2B
- **Database:** Supabase
- **CRM:** HubSpot
- **Lead Gen:** Smartlead
- **Automation:** n8n

### Integrations

| Integration | Type | Auth Method | Vault Path |
|-------------|------|-------------|------------|
| Shopify Admin | REST/GraphQL | Access Token | `elevate/shopify_access_token` |
| HubSpot | REST API | Bearer Token | `global/hubspot_access_token` |
| Smartlead | REST API | API Key | `global/smartlead_api_key` |
| Supabase | REST API | Bearer + apikey | `elevate/supabase_*` |

### Test Commands

```bash
# Load Elevate credentials
node creds.js load elevate

# Test Shopify
curl -s "https://elevate-wholesale.myshopify.com/admin/api/2024-01/shop.json" \
  -H "X-Shopify-Access-Token: ${ELEVATE_SHOPIFY_ACCESS_TOKEN}" | jq '.shop.name'

# Test Supabase
curl -s "${ELEVATE_SUPABASE_URL}/rest/v1/elv_prospects?limit=1" \
  -H "apikey: ${ELEVATE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ELEVATE_SUPABASE_SERVICE_ROLE_KEY}"
```

### Key Tables

| Table | Purpose | Sync Frequency |
|-------|---------|----------------|
| elv_prospects | B2B leads | Real-time |
| elv_customers | Wholesale customers | Daily |
| elv_orders | B2B orders | Hourly |
| elv_login_events | Customer logins | Real-time |
| elv_trial_accounts | Trial tracking | Daily |

### n8n Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| elv-prospecting-daily | Schedule (daily) | Lead generation |
| elv-login-detector | Webhook | Track customer logins |
| elv-trial-expiration | Schedule (daily) | Trial expiry alerts |
| elv-hubspot-sync | Schedule (hourly) | CRM synchronization |
| elv-welcome-sequence | Webhook | New customer onboarding |

---

## 4. Red Hill Fresh (RHF)

### Platform Stack
- **eCommerce:** WooCommerce
- **Database:** Supabase
- **Automation:** n8n

### Integrations

| Integration | Type | Auth Method | Vault Path |
|-------------|------|-------------|------------|
| WooCommerce | REST API | Consumer Key/Secret | `redhillfresh/wc_*` |
| Supabase | REST API | Bearer + apikey | `redhillfresh/supabase_*` |

### Test Commands

```bash
# Load RHF credentials
node creds.js load redhillfresh

# Test WooCommerce
curl -s "https://redhillfresh.com.au/wp-json/wc/v3/system_status" \
  -u "${RHF_WC_CONSUMER_KEY}:${RHF_WC_CONSUMER_SECRET}" | jq '.environment.version'

# Test Supabase
curl -s "${RHF_SUPABASE_URL}/rest/v1/rhf_orders?limit=1" \
  -H "apikey: ${RHF_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${RHF_SUPABASE_SERVICE_ROLE_KEY}"
```

### Key Tables

| Table | Purpose | Sync Frequency |
|-------|---------|----------------|
| rhf_products | Product catalog | Daily |
| rhf_orders | Order history | Hourly |
| rhf_customers | Customer data | Daily |
| rhf_inventory | Stock levels | Hourly |

### n8n Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| rhf-wc-order-sync | Schedule (hourly) | Sync WooCommerce orders |
| rhf-product-sync | Schedule (daily) | Product catalog sync |
| rhf-inventory-alert | Schedule (hourly) | Low stock alerts |

### WooCommerce Authentication

```javascript
// Basic auth with consumer key/secret
const auth = Buffer.from(
  `${consumerKey}:${consumerSecret}`
).toString('base64')

const headers = {
  'Authorization': `Basic ${auth}`,
  'Content-Type': 'application/json'
}
```

---

## Shared/Global Integrations

### Used Across All Businesses

| Integration | Type | Auth Method | Vault Path |
|-------------|------|-------------|------------|
| n8n | REST API | API Key | `global/n8n_api_key` |
| HubSpot | REST API | Bearer Token | `global/hubspot_access_token` |
| Smartlead | REST API | API Key | `global/smartlead_api_key` |
| Slack | Webhook | URL | `global/slack_webhook_url` |
| Google OAuth | OAuth2 | Refresh Token | `global/google_*` |

### Test Commands

```bash
# Load global credentials
node creds.js load global

# Test n8n
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length'

# Test HubSpot
curl -s "https://api.hubapi.com/crm/v3/objects/contacts?limit=1" \
  -H "Authorization: Bearer ${HUBSPOT_ACCESS_TOKEN}"

# Test Slack webhook
curl -X POST "${SLACK_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{"text": "Integration test"}'
```

---

## Integration Health Matrix

| Business | BigCommerce | Shopify | Unleashed | Klaviyo | HubSpot | Supabase | n8n |
|----------|-------------|---------|-----------|---------|---------|----------|-----|
| BOO | ✓ | - | - | - | - | ✓ | ✓ |
| Teelixir | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Elevate | - | ✓ | - | - | ✓ | ✓ | ✓ |
| RHF | - | - | - | - | - | ✓ | ✓ |

---

## Full Integration Test

```bash
#!/bin/bash
# Run complete integration test suite

echo "=== Integration Test Suite ==="

# Test each business
for project in boo teelixir elevate redhillfresh global; do
  echo -e "\n--- Testing $project ---"
  node creds.js load $project 2>/dev/null
  node creds.js verify 2>/dev/null | grep -E "✓|✗"
done

# Run TypeScript tests
echo -e "\n--- Running Integration Tests ---"
npx tsx run-integration-tests.ts --all
```

---

**Version:** 1.0 | **Updated:** 2025-12-01
