# Secure Credentials Vault

> **Location:** BOO Supabase (`usibnysqelovfuctmkqw`)
> **Last Updated:** 2025-11-26

## Overview

All credentials for all projects are securely stored in Supabase using encrypted storage (pgcrypto AES encryption). This allows Claude Code (local and remote) to retrieve credentials without needing `.env` files.

## Quick Reference

### Retrieve a Credential
```bash
node infra/supabase/vault-helper.js get <project> <credential_name>

# Examples:
node infra/supabase/vault-helper.js get boo bc_access_token
node infra/supabase/vault-helper.js get elevate shopify_access_token
node infra/supabase/vault-helper.js get global hubspot_access_token
```

### List All Credentials
```bash
node infra/supabase/vault-helper.js list

# List by project:
node infra/supabase/vault-helper.js list boo
node infra/supabase/vault-helper.js list elevate
```

### Store a New Credential
```bash
node infra/supabase/vault-helper.js store <project> <name> <value> [description]

# Example:
node infra/supabase/vault-helper.js store boo new_api_key "abc123" "New API Key"
```

### Delete a Credential
```bash
node infra/supabase/vault-helper.js delete <project> <name>
```

---

## Projects

| Project | Description |
|---------|-------------|
| `global` | Shared infrastructure (n8n, HubSpot, Smartlead, Gmail, AWS) |
| `boo` | Buy Organics Online |
| `elevate` | Elevate Wholesale |
| `teelixir` | Teelixir |
| `redhillfresh` | Red Hill Fresh |

---

## Available Credentials

### Global (Shared)
- `master_supabase_url` - Master Supabase URL
- `master_supabase_service_role_key` - Master Supabase Service Key
- `n8n_url` - n8n Automation URL
- `n8n_api_key` - n8n API Key
- `hubspot_access_token` - HubSpot Access Token
- `hubspot_secret` - HubSpot Secret
- `smartlead_api_key` - Smartlead API Key
- `gmail_user` - Gmail User
- `gmail_app_password` - Gmail App Password
- `aws_access_key_id` - AWS Access Key ID
- `aws_secret_access_key` - AWS Secret Access Key

### BOO (Buy Organics Online)
- `supabase_url` - BOO Supabase URL
- `supabase_service_role_key` - BOO Supabase Service Key
- `supabase_db_password` - BOO Supabase DB Password
- `bc_store_hash` - BigCommerce Store Hash
- `bc_client_id` - BigCommerce Client ID (Primary)
- `bc_access_token` - BigCommerce Access Token (Primary)
- `bc_client_id_2` - BigCommerce Client ID (Alt)
- `bc_client_secret_2` - BigCommerce Client Secret (Alt)
- `bc_access_token_2` - BigCommerce Access Token (Alt)
- `klaviyo_api_key` - Klaviyo API Key
- `oborne_ftp_host` - Oborne FTP Host
- `oborne_ftp_user` - Oborne FTP User
- `oborne_ftp_password` - Oborne FTP Password
- `uhp_email` - UHP Email
- `uhp_password` - UHP Password
- `kadac_uid` - Kadac UID

### Elevate Wholesale
- `supabase_url` - Elevate Supabase URL
- `supabase_anon_key` - Elevate Supabase Anon Key
- `supabase_service_role_key` - Elevate Supabase Service Key
- `shopify_store_url` - Shopify Store URL
- `shopify_access_token` - Shopify Access Token
- `klaviyo_api_key` - Klaviyo API Key
- `unleashed_api_id` - Unleashed API ID
- `unleashed_api_key` - Unleashed API Key
- `xero_client_id` - Xero Client ID
- `xero_client_secret` - Xero Client Secret

### Teelixir
- `klaviyo_api_key` - Klaviyo API Key
- `xero_client_id` - Xero Client ID
- `xero_client_secret` - Xero Client Secret

### Red Hill Fresh
- `wp_url` - WordPress URL
- `wp_password` - WordPress Password
- `wp_app_password` - WordPress App Password

---

## Using in Scripts

### Node.js
```javascript
const { getCredential } = require('./infra/supabase/vault-helper.js');

async function example() {
  const apiKey = await getCredential('boo', 'bc_access_token');
  console.log('API Key:', apiKey);
}
```

### Direct SQL (in Supabase)
```sql
-- Get a credential
SELECT get_credential('bc_access_token', 'boo');

-- List all credentials
SELECT * FROM list_credentials();

-- List credentials for a project
SELECT * FROM list_credentials('boo');
```

---

## Security Notes

1. **Encryption:** All values are encrypted using AES (pgcrypto)
2. **Access:** Only `service_role` can access credentials via API
3. **Storage:** Credentials stored in `secure_credentials` table in BOO Supabase
4. **No .env needed:** Claude Code can retrieve credentials at runtime

---

## Supabase Connection Details

```
URL: https://usibnysqelovfuctmkqw.supabase.co
Project: Buy Organics Online (BOO)
Table: secure_credentials
Functions: store_credential, get_credential, list_credentials, delete_credential
```

---

## Adding New Credentials

When adding new API keys or passwords:

```bash
# 1. Store the credential
node infra/supabase/vault-helper.js store <project> <name> <value> "<description>"

# 2. Verify it was stored
node infra/supabase/vault-helper.js get <project> <name>

# 3. Update this README with the new credential name
```

---

## Troubleshooting

### "No credentials found"
- Check project name is correct (boo, elevate, teelixir, redhillfresh, global)
- Check credential name matches exactly

### API Error
- The vault-helper.js has the service role key embedded
- If key expires, update in vault-helper.js line 17

### Need to see raw table
- Go to Supabase Dashboard > Table Editor > secure_credentials
- Values are encrypted, you'll see base64 encoded data
