# Credentials Setup Guide

This guide explains how to configure credentials for autonomous operation across all projects.

## 📋 Quick Start

### 1. Copy the Template

```bash
copy .env.template MASTER-CREDENTIALS-COMPLETE.env
```

### 2. Fill in Your Credentials

Open `MASTER-CREDENTIALS-COMPLETE.env` and fill in the credentials for services you use.

**Required for each business:**
- BigCommerce: Store Hash, Access Token, Client ID
- Supabase: URL, Service Role Key

### 3. Load Credentials

**Windows PowerShell:**
```powershell
. .\load-credentials.ps1
```

**Windows CMD:**
```cmd
for /f "tokens=1,2 delims==" %a in (MASTER-CREDENTIALS-COMPLETE.env) do set %a=%b
```

**Git Bash / WSL:**
```bash
export $(grep -v '^#' MASTER-CREDENTIALS-COMPLETE.env | xargs)
```

### 4. Verify Credentials

```bash
npx tsx verify-credentials.ts
```

## 🏢 Supported Services

### Buy Organics Online (BOO)
- ✅ BigCommerce Store API
- ✅ Supabase Database
- ✅ Product matching & syncing
- ✅ Redirect management

### Teelixir
- ✅ BigCommerce Store API
- ✅ Supabase Database
- ✅ Product catalog

### Elevate Wholesale
- ✅ BigCommerce Store API
- ✅ Supabase Database
- ✅ Wholesale operations

### Red Hill Fresh
- ✅ BigCommerce Store API
- ✅ Supabase Database
- ✅ Fresh produce management

### Shared Services
- ✅ N8N Workflow Automation
- ✅ HubSpot CRM
- ✅ SmartLead Email Campaigns
- ✅ AWS RDS (Newsync6)
- ✅ Slack Notifications
- ✅ Email Alerts

## 🔐 Security Best Practices

### ✅ DO:
- Store credentials in `MASTER-CREDENTIALS-COMPLETE.env` (already gitignored)
- Use environment variables for all scripts
- Back up credentials securely (1Password, Bitwarden, etc.)
- Rotate credentials regularly
- Use service role keys for automation

### ❌ DON'T:
- Commit credentials to git
- Hardcode credentials in scripts
- Share credentials in chat/email
- Use production credentials for testing
- Store credentials in plain text files without .gitignore

## 📝 Credential Sources

### Where to Find Each Credential:

**BigCommerce:**
- Go to: Store Control Panel → Settings → API → Store-level API Accounts
- Create new API account with required scopes
- Save Store Hash, Access Token, Client ID

**Supabase:**
- Go to: Project Dashboard → Settings → API
- Copy Project URL and service_role key
- ⚠️ Service role bypasses RLS - use carefully!

**N8N:**
- Go to: Settings → API
- Generate new API key
- Base URL is your N8N instance URL

**HubSpot:**
- Go to: Settings → Integrations → Private Apps
- Create private app with required scopes
- Copy access token

**SmartLead:**
- Go to: Settings → API
- Generate API key

**AWS RDS:**
- Get from AWS Console or your database administrator
- Need: host, port, username, password, database name

**Slack:**
- Go to: https://api.slack.com/apps
- Create app → Incoming Webhooks
- Copy webhook URL

**Email (SMTP):**
- Get from your email provider (Gmail, SendGrid, etc.)
- Need: host, port, username, password

## 🚀 Usage Examples

### Running Scripts with Credentials

**Option 1: Load then run**
```powershell
# Load credentials first
. .\load-credentials.ps1

# Then run any script
npx tsx buy-organics-online/analyze-store-logs-final.ts
node buy-organics-online/match-products.js
```

**Option 2: One-line execution**
```powershell
# PowerShell
. .\load-credentials.ps1; npx tsx verify-credentials.ts

# Bash/WSL
export $(grep -v '^#' MASTER-CREDENTIALS-COMPLETE.env | xargs) && npx tsx verify-credentials.ts
```

### Testing Specific Service

```typescript
// test-bigcommerce.ts
import { BigCommerceConnector } from './shared/libs/integrations/bigcommerce'

const client = new BigCommerceConnector({
  storeHash: process.env.BOO_BC_STORE_HASH!,
  accessToken: process.env.BOO_BC_ACCESS_TOKEN!,
  clientId: process.env.BOO_BC_CLIENT_ID!,
})

const store = await client.store.get()
console.log('Connected to:', store.name)
```

## 🔧 Troubleshooting

### Issue: "Environment variable not found"
**Solution:** Make sure you've loaded credentials with `load-credentials.ps1`

### Issue: "Authentication failed"
**Solution:**
1. Run `npx tsx verify-credentials.ts` to test connections
2. Check if credentials are correct in MASTER-CREDENTIALS-COMPLETE.env
3. Verify API scopes/permissions in the service dashboard

### Issue: "MASTER-CREDENTIALS-COMPLETE.env not found"
**Solution:** Copy `.env.template` to `MASTER-CREDENTIALS-COMPLETE.env` and fill it out

### Issue: Scripts can't find credentials
**Solution:** Make sure variable names match exactly:
- `BOO_BC_STORE_HASH` (not `BOO_STORE_HASH`)
- `SUPABASE_URL` (not `SUPABASE_URI`)

## 📊 Verification Checklist

Run this checklist to ensure everything is set up:

- [ ] Copied `.env.template` to `MASTER-CREDENTIALS-COMPLETE.env`
- [ ] Filled in all required credentials for services I use
- [ ] Loaded credentials using `load-credentials.ps1`
- [ ] Ran `npx tsx verify-credentials.ts` successfully
- [ ] Tested running a sample script
- [ ] Backed up credentials to secure password manager
- [ ] Verified `MASTER-CREDENTIALS-COMPLETE.env` is in `.gitignore`

## 🌙 Overnight Automation

For autonomous overnight work, ensure:

1. ✅ All credentials loaded into environment
2. ✅ Credentials have sufficient API rate limits
3. ✅ Service role keys have required permissions
4. ✅ Scripts are idempotent (safe to re-run)
5. ✅ Error handling in place
6. ✅ Slack/email alerts configured for notifications

## 📞 Support

If you need help:
1. Run `npx tsx verify-credentials.ts` to diagnose issues
2. Check service status pages
3. Review API documentation for required scopes
4. Verify credentials in service dashboards

## 🔄 Credential Rotation

Recommended rotation schedule:
- **BigCommerce API tokens:** Every 90 days
- **Supabase service keys:** Every 6 months
- **Third-party API keys:** Per service policy
- **Database passwords:** Every 3 months

To rotate:
1. Generate new credentials in service dashboard
2. Update `MASTER-CREDENTIALS-COMPLETE.env`
3. Run `npx tsx verify-credentials.ts` to test
4. Deactivate old credentials after confirming new ones work
