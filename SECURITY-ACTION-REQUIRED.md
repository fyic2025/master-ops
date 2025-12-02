# SECURITY ACTION REQUIRED

**Date:** 2024-12-02
**Priority:** HIGH
**Status:** Awaiting local action

---

## Summary

During folder reorganization, hardcoded API credentials were found in **29 code files**. These credentials are exposed in git history and need to be migrated to the secure vault.

---

## Exposed Credentials

### Teelixir Unleashed API (19 files)
```
API ID: 7fda9404-7197-477b-89b1-dadbcefae168
API Key: a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==
```

**Files affected:**
- `unleashed-shopify-sync/src/config.ts`
- `fix-crypto-import.ts`
- `fix-with-pure-js-hmac.ts`
- `test-fixed-auth.ts`
- `test-unleashed-auth.ts`
- `apply-unleashed-fix.ts`
- `fix-crypto-restriction.ts`
- `scripts/fixes/fix-crypto-import.ts`
- `scripts/fixes/fix-with-pure-js-hmac.ts`
- `scripts/fixes/apply-unleashed-fix.ts`
- `scripts/fixes/fix-crypto-restriction.ts`
- `scripts/tests/test-fixed-auth.ts`
- `scripts/tests/test-unleashed-auth.ts`
- `scripts/unleashed-pricing-analysis.js`

### Elevate/KIK Unleashed API (4 files)
```
API ID: 336a6015-eae0-43ab-83eb-e08121e7655d
API Key: SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==
```

**Files affected:**
- `unleashed-shopify-sync/src/config.ts`
- `scripts/unleashed-pricing-analysis.js`
- `scripts/sync-gst-from-unleashed.js`
- `buy-organics-online/load-unleashed-products.js`

### Teelixir Shopify Token (6 files)
```
Token: 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
```

**Files affected:**
- `unleashed-shopify-sync/src/config.ts`
- `teelixir/scripts/reconcile-winback-conversions.ts`
- `scripts/create-missyou40-graphql.ts`
- `scripts/create-missyou40-discount.ts`
- `scripts/sync-teelixir-rrp-to-supabase.js`
- `scripts/shopify-rrp-check.js`

---

## Required Actions

### Step 1: Add Missing Credentials to Vault

The vault (`creds.js`) is missing Teelixir credentials. Run these commands:

```bash
# Add Teelixir Unleashed credentials
node creds.js store teelixir unleashed_api_id "7fda9404-7197-477b-89b1-dadbcefae168" "Teelixir Unleashed API ID"
node creds.js store teelixir unleashed_api_key "a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ==" "Teelixir Unleashed API Key"

# Add Teelixir Shopify credentials
node creds.js store teelixir shopify_access_token "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" "Teelixir Shopify Access Token"
node creds.js store teelixir shopify_shop_domain "teelixir.com.au" "Teelixir Shopify Domain"
node creds.js store teelixir shopify_location_id "78624784659" "Teelixir Shopify Location ID"

# Verify
node creds.js list teelixir
```

### Step 2: Verify Elevate Credentials in Vault

These should already be in the vault, but verify:

```bash
node creds.js list elevate
# Should show: unleashed_api_id, unleashed_api_key, shopify_access_token
```

If missing, add them:
```bash
node creds.js store elevate unleashed_api_id "336a6015-eae0-43ab-83eb-e08121e7655d" "Elevate Unleashed API ID"
node creds.js store elevate unleashed_api_key "SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==" "Elevate Unleashed API Key"
```

### Step 3: Update repopulate-vault.js Mappings

Add these mappings to `scripts/repopulate-vault.js`:

```javascript
// Teelixir - Add these to CREDENTIAL_MAPPINGS
'TEELIXIR_UNLEASHED_API_ID': { project: 'teelixir', name: 'unleashed_api_id', desc: 'Teelixir Unleashed API ID' },
'TEELIXIR_UNLEASHED_API_KEY': { project: 'teelixir', name: 'unleashed_api_key', desc: 'Teelixir Unleashed API Key' },
'TEELIXIR_SHOPIFY_ACCESS_TOKEN': { project: 'teelixir', name: 'shopify_access_token', desc: 'Teelixir Shopify Access Token' },
'TEELIXIR_SHOPIFY_SHOP_DOMAIN': { project: 'teelixir', name: 'shopify_shop_domain', desc: 'Teelixir Shopify Domain' },
'TEELIXIR_SHOPIFY_LOCATION_ID': { project: 'teelixir', name: 'shopify_location_id', desc: 'Teelixir Shopify Location ID' },
```

### Step 4: Update config.ts to Remove Fallbacks

Once credentials are in vault, update `unleashed-shopify-sync/src/config.ts`:

```typescript
// BEFORE (insecure - has hardcoded fallbacks)
apiId: process.env.TEELIXIR_UNLEASHED_API_ID || '7fda9404-...',

// AFTER (secure - requires env vars)
apiId: process.env.TEELIXIR_UNLEASHED_API_ID || '',
```

### Step 5: Consider Rotating Credentials

Since these credentials were in git history, consider rotating them:
- Unleashed: Settings → API Access → Regenerate Key
- Shopify: Apps → Your App → API Credentials → Regenerate

---

## What Was Already Fixed

- ✅ Documentation files redacted (no more credentials in .md files)
- ✅ `.env.example` updated with all required variables
- ✅ Folder structure reorganized (Phase 1 complete)

---

## Files Reference

| File | Purpose |
|------|---------|
| `creds.js` | Vault CLI - list/get/store credentials |
| `shared/libs/load-vault-credentials.js` | Load vault into process.env |
| `scripts/repopulate-vault.js` | Bulk import from .env to vault |
| `infra/supabase/vault-setup.sql` | Vault table schema |

---

## Testing Vault Access

```bash
# List all credentials
node creds.js list

# Test specific credential
node creds.js get teelixir unleashed_api_id

# Export as .env format
node creds.js export teelixir > .env.teelixir

# Verify integration
node creds.js verify
```

---

**Delete this file once all actions are complete.**
