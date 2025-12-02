# Remote vs Local Capabilities

> Guide for what runs where between remote Claude sessions and local machine

---

## Quick Reference

| Task | Where | Tool |
|------|-------|------|
| Database queries | Remote | `curl` REST API |
| Database writes | Remote | `curl` REST API |
| Vault credentials | Remote | `curl` + decrypt |
| Code editing | Remote | Full access |
| Git operations | Remote | Full (non-interactive) |
| npm install/build | Remote | Works |
| Node.js scripts with HTTP | **Local** | `node` / `npx tsx` |
| TypeScript scripts | **Local** | `npx tsx` |
| Long-running servers | **Local** | Terminal |
| Scheduled automations | **Local** | Task Scheduler |

---

## Remote Claude Capabilities

### ✅ Full Capability

```bash
# All Supabase operations via curl
curl -s "https://usibnysqelovfuctmkqw.supabase.co/rest/v1/businesses" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY"

# Git operations
git add . && git commit -m "message" && git push

# npm operations
npm install
npm run build
npm test

# File operations
# Full read/write to all files

# Web search and fetch
# Built-in tools work
```

### ✅ Remote Operations Script

Use `scripts/remote-ops.sh` for common operations:

```bash
# Job monitoring
./scripts/remote-ops.sh jobs-status
./scripts/remote-ops.sh jobs-unhealthy
./scripts/remote-ops.sh jobs-update "stock-sync" "boo" true

# Vault
./scripts/remote-ops.sh vault-list boo
./scripts/remote-ops.sh vault-get teelixir klaviyo_api_key

# Teelixir
./scripts/remote-ops.sh tlx-winback-stats
./scripts/remote-ops.sh tlx-config

# Generic queries
./scripts/remote-ops.sh query businesses "name,slug"
./scripts/remote-ops.sh query dashboard_job_status "*" "status=eq.failed"
```

### ❌ Cannot Do (DNS Blocked)

```bash
# Node.js scripts with network calls
node creds.js verify  # ❌ EAI_AGAIN
npx tsx teelixir/scripts/sync-klaviyo-unengaged.ts  # ❌
node buy-organics-online/sync-all-suppliers.js  # ❌

# Supabase JS client
# Any script using createClient()  # ❌

# Interactive git
git rebase -i  # ❌ No TTY
```

---

## Local Machine Requirements

### Scripts That Must Run Locally

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `teelixir/scripts/sync-klaviyo-unengaged.ts` | Sync Klaviyo → Supabase | Weekly |
| `teelixir/scripts/send-winback-emails.ts` | Send winback emails | Daily |
| `teelixir/scripts/reconcile-winback-conversions.ts` | Track conversions | Daily |
| `teelixir/scripts/send-anniversary-emails.ts` | Anniversary emails | Daily |
| `teelixir/scripts/sync-distributor-orders.ts` | Unleashed orders sync | Daily |
| `buy-organics-online/sync-all-suppliers.js` | Stock sync | 8am/8pm |
| `node creds.js verify` | Test credentials | On-demand |

### Local Automation Runner

Run all due automations:
```bash
node scripts/local-automation-runner.js all
```

Run specific automation:
```bash
node scripts/local-automation-runner.js tlx-winback
node scripts/local-automation-runner.js boo-stock
```

Check status:
```bash
node scripts/local-automation-runner.js status
node scripts/local-automation-runner.js schedule
```

### Windows Task Scheduler Setup

1. Open Task Scheduler
2. Create Basic Task:
   - Name: `Master-Ops Daily Automations`
   - Trigger: Daily at 9:00 AM
   - Action: Start a program
   - Program: `node`
   - Arguments: `C:\Users\jayso\master-ops\scripts\local-automation-runner.js all`
   - Start in: `C:\Users\jayso\master-ops`

3. For twice-daily (stock sync):
   - Name: `Master-Ops Stock Sync`
   - Trigger: Daily at 8:00 AM, repeat every 12 hours
   - Program: `node`
   - Arguments: `C:\Users\jayso\master-ops\scripts\local-automation-runner.js boo-stock`

---

## Workarounds for Remote

### 1. Trigger Local Scripts via File

Remote can create a trigger file:
```bash
# Remote creates trigger
echo '{"run": ["tlx-winback", "tlx-reconcile"]}' > triggers/pending.json
git add triggers/ && git commit -m "Trigger automations" && git push
```

Local watches and runs:
```bash
# Local runs (could be scheduled)
if [ -f triggers/pending.json ]; then
  node scripts/local-automation-runner.js $(cat triggers/pending.json | jq -r '.run[]')
  rm triggers/pending.json
  git add . && git commit -m "Ran triggered automations" && git push
fi
```

### 2. n8n Webhook Triggers

If n8n is configured, remote can trigger workflows via curl:
```bash
curl -X POST "https://n8n.growthcohq.com/webhook/run-automation" \
  -H "Content-Type: application/json" \
  -d '{"automation": "tlx-winback"}'
```

### 3. Direct API Calls via Curl

For simple operations, remote can call APIs directly:
```bash
# Klaviyo API
curl -s "https://a.klaviyo.com/api/profiles" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_KEY" \
  -H "revision: 2024-10-15"

# Shopify API
curl -s "https://teelixir.myshopify.com/admin/api/2024-01/orders.json" \
  -H "X-Shopify-Access-Token: $SHOPIFY_TOKEN"
```

---

## Environment Setup

### Required for Local

```env
# .env file
SUPABASE_URL=https://usibnysqelovfuctmkqw.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Or use creds.js for vault access
```

### Required for Remote (curl)

```bash
export SUPABASE_SERVICE_KEY="eyJ..."
# Then use curl or remote-ops.sh
```

---

## Summary

| Capability | Remote | Local | Notes |
|------------|--------|-------|-------|
| Code changes | ✅ | ✅ | Both can edit |
| Database read/write | ✅ curl | ✅ JS client | Remote uses curl |
| Run automations | ❌ | ✅ | DNS blocks Node.js |
| Git push/pull | ✅ | ✅ | Both work |
| API integrations | ⚠️ curl only | ✅ | Remote limited |
| Job monitoring | ✅ | ✅ | Via Supabase |
| Credential access | ✅ curl | ✅ creds.js | Both work |

**Bottom line:**
- Remote: Best for code work, planning, database ops via curl
- Local: Required for running automation scripts
