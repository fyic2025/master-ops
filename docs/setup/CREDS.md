# Credentials - Quick Reference

All credentials stored in **Supabase Vault** (AES-256 encrypted).
Works identically **local** and **remote** - no .env files needed.

---

## Quick Start

### LOCAL (Windows PowerShell)

```powershell
# Load ALL credentials into environment
. .\load-creds.ps1

# Load specific project (+ global)
. .\load-creds.ps1 boo
. .\load-creds.ps1 elevate
```

### REMOTE (Claude Code / Any Node.js)

```bash
# List all credentials
node creds.js

# Get specific credential
node creds.js get boo bc_access_token

# Load into running script
node creds.js load boo

# Export to .env file (if needed)
node creds.js export boo > .env.local
```

### IN YOUR CODE

```javascript
const creds = require('./creds');

// Load credentials into process.env
await creds.load('boo');

// Now use them
console.log(process.env.BOO_BC_ACCESS_TOKEN);
console.log(process.env.N8N_API_KEY);  // global creds have no prefix

// Or get a single value
const token = await creds.get('boo', 'bc_access_token');
```

---

## Projects

| Project | Credentials | Description |
|---------|-------------|-------------|
| `boo` | 20 | Buy Organics Online - BigCommerce, LiveChat, Suppliers |
| `elevate` | 10 | Elevate Wholesale - Shopify, Unleashed, Xero |
| `teelixir` | 3 | Teelixir - Klaviyo, Xero |
| `redhillfresh` | 6 | Red Hill Fresh - WordPress, WooCommerce |
| `global` | 11 | Shared - n8n, Google APIs, AWS, Gmail, HubSpot |

---

## Environment Variable Naming

Vault names automatically convert to env vars:

```
boo/bc_access_token      → BOO_BC_ACCESS_TOKEN
elevate/shopify_store_url → ELEVATE_SHOPIFY_STORE_URL
global/n8n_api_key       → N8N_API_KEY  (no prefix for global)
```

---

## Commands Reference

```bash
# List all credentials (masked)
node creds.js

# List for specific project
node creds.js list boo

# Get credential value
node creds.js get boo bc_access_token

# Store new credential
node creds.js store boo new_key "secret_value" "Description"

# Delete credential
node creds.js delete boo old_key

# Export as .env format
node creds.js export boo

# Verify vault access
node creds.js verify
```

---

## Key Credentials by Project

### BOO (Buy Organics Online)
- `bc_store_hash`, `bc_client_id`, `bc_access_token` - BigCommerce API
- `supabase_url`, `supabase_service_role_key` - Database
- `livechat_account_id`, `livechat_pat` - Customer support
- `oborne_ftp_*`, `uhp_*`, `kadac_uid` - Supplier feeds
- `google_merchant_*`, `google_ads_*` - Google PPC

### Elevate Wholesale
- `shopify_store_url`, `shopify_access_token` - Shopify API
- `unleashed_api_id`, `unleashed_api_key` - Inventory
- `xero_client_id`, `xero_client_secret` - Accounting

### Global (Shared)
- `n8n_url`, `n8n_api_key` - Workflow automation
- `google_ads_client_id`, `google_ads_client_secret` - Google OAuth
- `hubspot_access_token` - CRM
- `gmail_user`, `gmail_app_password` - Email sending
- `aws_access_key_id`, `aws_secret_access_key` - AWS

---

## Troubleshooting

**"Credential not found"**
```bash
# Check if it exists
node creds.js list boo
```

**"Cannot decrypt"**
- Credential may have been stored with different encryption key
- Re-store: `node creds.js store boo name "value"`

**PowerShell variables not loading**
- Must dot-source: `. .\load-creds.ps1` (note the dot and space)
- Check with: `echo $env:BOO_BC_ACCESS_TOKEN`

**Node.js can't find credentials**
```javascript
// Make sure you await the load
await creds.load('boo');  // Not just creds.load('boo')
```

---

## Security Notes

- Vault uses AES-256-CBC encryption
- Service key is embedded (private repo only)
- Never commit credential values to git
- All access logged in Supabase

---

## Files

| File | Purpose |
|------|---------|
| `creds.js` | Unified credential loader (Node.js) |
| `load-creds.ps1` | Windows PowerShell quick loader |
| `infra/supabase/vault-helper.js` | Legacy CLI (still works) |
