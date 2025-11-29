# 🚨 REMOTE CLAUDE CODE - MUST READ FIRST

> **Last Updated:** 2025-11-30
> **Purpose:** Essential setup for remote Claude Code sessions

---

## ✅ Credentials System - UNIFIED

All 57 credentials stored in **Supabase Vault** (AES-256 encrypted).
Works identically local and remote - **no .env files needed.**

### Quick Commands

```bash
# List all credentials
node creds.js

# List for specific project
node creds.js list boo

# Get a specific credential
node creds.js get boo bc_access_token

# Store a new credential
node creds.js store boo api_key "value" "Description"

# Verify vault access
node creds.js verify
```

### In Your Scripts

```javascript
const creds = require('./creds');
await creds.load('boo');  // Loads BOO + global into process.env
// Now use process.env.BOO_BC_ACCESS_TOKEN, etc.
```

### Available Projects
- `boo` - Buy Organics Online (20 credentials)
- `elevate` - Elevate Wholesale (10 credentials)
- `teelixir` - Teelixir (3 credentials)
- `redhillfresh` - Red Hill Fresh (6 credentials)
- `global` - Shared infrastructure (11 credentials)

**Full documentation:** [CREDS.md](CREDS.md)

---

## 📋 Pending Action Items

### High Priority
1. **BOO Customer Interactions Sync** - LiveChat credentials ready, run sync
2. **Category Setup** - Apply migrations from `claude/setup-category-pages-*` branch

### Branches to Review
Several feature branches have work ready to merge:
```bash
git branch -r | grep "origin/claude/"
```

---

## 🔑 Key Credentials Available

### BOO (Buy Organics Online)
- BigCommerce API (2 accounts)
- Klaviyo
- LiveChat (full API access)
- Supplier feeds: Oborne FTP, UHP, Kadac
- **Google Ads** (Customer ID: 527-516-9559) ⏳ Developer token pending
- **Google Merchant Center** (ID: 10043678)
- **Google Search Console** (via global)

### Elevate Wholesale
- Shopify
- Klaviyo
- Unleashed Inventory
- Xero Accounting

### Teelixir
- Klaviyo
- Xero Accounting

### Red Hill Fresh
- WordPress Admin
- WooCommerce API

### Global/Shared
- n8n Automation
- HubSpot CRM
- Smartlead Email
- Gmail (jayson@teelixir.com)
- AWS (read-only)
- **Google OAuth** (Client ID/Secret for all Google APIs)
- **Google Search Console** (jayson@fyic.com.au)

---

## ⚠️ Not Yet Configured

| Credential | Needed For |
|------------|------------|
| `boo/sales_imap_pass` | Email sync for customer interactions |
| `global/google_ads_developer_token` | Google Ads API access (approval pending) |

---

## 🤖 PPC - AI Google Ads Team

**Project Label: PPC** - Reference this in remote sessions to continue work on Google Ads/Merchant Center.

Full Google Ads automation system for BOO (Teelixir/RHF later).

**Plan file:** `~/.claude/plans/vast-zooming-llama.md`

### Current Status (2025-11-27)
- ✅ GMC connected - 3,223 products synced to Supabase
- ✅ Database schema applied (10 tables)
- ⚠️ 2,047 products disapproved (robots.txt blocking crawl)
- ⏳ Google Ads Developer Token - pending approval

### Quick Check
```bash
# Check Google Ads credentials status
node creds.js list boo | grep google

# Load all credentials into environment
node creds.js load boo
```

### Slash Commands (once dev token approved)
- `/ads-briefing` - Evening performance summary
- `/ads-sync` - Sync data from Google Ads
- `/ads-opportunities` - Review optimization opportunities

### Key Files
- `shared/libs/integrations/google-ads/` - API connector
- `shared/libs/integrations/google-merchant/` - Merchant Center connector
- `.claude/skills/google-ads-manager/` - AI skill definition
- `infra/supabase/migrations/20251126_google_ads_schema.sql` - Database schema

---

## 📁 Key Directories

```
master-ops/
├── creds.js                 # Unified credential loader
├── CREDS.md                 # Credential documentation
├── buy-organics-online/     # BOO project files
├── elevate-wholesale/       # Elevate project files
├── shared/libs/integrations/# API connectors
└── infra/supabase/          # Database schemas
```

---

## 🚀 Starting a Task

1. Pull latest: `git pull`
2. Verify credentials: `node creds.js verify`
3. Review pending branches: `git branch -r | grep "origin/claude/"`
4. Start work!

---

## Need Help?

- Credential issues: See [CREDS.md](CREDS.md)
- Project structure: Run `tree -L 2`
- Recent commits: `git log --oneline -20`
