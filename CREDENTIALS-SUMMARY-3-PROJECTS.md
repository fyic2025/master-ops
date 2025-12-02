# Credentials Summary - BOO, Elevate, Teelixir

## What Claude Currently Has Access To

### BOO (Buy Organics Online) - COMPLETE
| Service | Credential | Status |
|---------|-----------|--------|
| BigCommerce | store_hash | `hhhi` |
| BigCommerce | access_token | `d9y2srla...` |
| BigCommerce | client_id | `nvmcwck5...` |
| Supabase | url | `https://usibnysqelovfuctmkqw.supabase.co` |
| Supabase | service_role_key | `eyJhbGci...` |
| FTP Oborne | host | `ftp3.ch2.net.au` |
| FTP Oborne | username | `retail_310` |
| FTP Oborne | password | `am2SH6wW...` |
| Unleashed | api_secret | `a65AOqES...` |

### Elevate Wholesale - MISSING
| Service | Credential | Status |
|---------|-----------|--------|
| Shopify | access_token | NEED |
| Shopify | store_domain | NEED |
| HubSpot | access_token | NEED |
| Supabase | url | NEED (if separate) |
| Supabase | service_role_key | NEED (if separate) |

### Teelixir - MISSING
| Service | Credential | Status |
|---------|-----------|--------|
| Shopify | access_token | NEED |
| Shopify | store_domain | NEED |
| Xero | client_id | NEED |
| Xero | client_secret | NEED |
| Supabase | url | NEED (if separate) |
| Supabase | service_role_key | NEED (if separate) |

### Shared Services - MISSING
| Service | Credential | Status |
|---------|-----------|--------|
| Klaviyo | api_key | NEED |
| n8n | api_key | NEED |
| SmartLead | api_key | NEED |

---

## Quick Setup Instructions

### Step 1: Run SQL to Create Table

Open Supabase SQL Editor:
https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/sql/new

Paste and run: `CREDENTIALS-SETUP.sql`

This creates the `credentials` table and inserts all BOO credentials I found.

### Step 2: Add Missing Credentials

Go to Table Editor:
https://supabase.com/dashboard/project/usibnysqelovfuctmkqw/editor/credentials

Edit rows where `credential_value = 'NEEDS_VALUE'`

### Step 3: Verify

Run this query to see status:
```sql
SELECT * FROM v_credentials_status;
```

---

## Benefits of This Approach

1. **No credentials in git** - Safe from security warnings
2. **Easy to update** - Use Supabase Dashboard from anywhere
3. **Scripts read at runtime** - Always use latest values
4. **Centralized** - One place for all 3 projects
