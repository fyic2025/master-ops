# 🚨 REMOTE CLAUDE CODE - MUST READ FIRST

> **Last Updated:** 2025-11-26
> **Purpose:** Essential setup for remote Claude Code sessions

---

## ✅ Credentials System - READY

All API credentials are stored securely in Supabase Vault. **No .env files needed.**

### Quick Commands

```bash
# List all available credentials
node infra/supabase/vault-helper.js list

# Get a specific credential
node infra/supabase/vault-helper.js get boo bc_access_token
node infra/supabase/vault-helper.js get elevate shopify_access_token

# Store a new credential
node infra/supabase/vault-helper.js store <project> <name> <value> "<description>"
```

### Available Projects
- `boo` - Buy Organics Online (20 credentials)
- `elevate` - Elevate Wholesale (10 credentials)
- `teelixir` - Teelixir (3 credentials)
- `redhillfresh` - Red Hill Fresh (6 credentials)
- `global` - Shared infrastructure (11 credentials)

**Full documentation:** [infra/supabase/CREDENTIALS-VAULT-README.md](infra/supabase/CREDENTIALS-VAULT-README.md)

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
node shared/libs/load-vault-credentials.js google-ads boo

# Load all credentials into environment
node shared/libs/load-vault-credentials.js boo
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
├── infra/supabase/          # Credential vault system
│   ├── vault-helper.js      # CLI tool for credentials
│   └── CREDENTIALS-VAULT-README.md
├── buy-organics-online/     # BOO project files
├── elevate-wholesale/       # Elevate project files
└── docs/plans/              # Project plans
```

---

## 🚀 Starting a Task

1. Pull latest: `git pull`
2. Check credentials: `node infra/supabase/vault-helper.js list`
3. Review pending branches: `git branch -r | grep "origin/claude/"`
4. Start work!

---

## Need Help?

- Credential issues: Check [CREDENTIALS-VAULT-README.md](infra/supabase/CREDENTIALS-VAULT-README.md)
- Project structure: Run `tree -L 2`
- Recent commits: `git log --oneline -20`
