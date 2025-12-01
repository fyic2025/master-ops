# n8n API Access Guide

> Complete guide for connecting to the live n8n instance at automation.growthcohq.com

---

## Connection Requirements

### n8n Instance Details

| Setting | Value |
|---------|-------|
| **URL** | `https://automation.growthcohq.com` |
| **API Version** | v1 |
| **Auth Method** | API Key (X-N8N-API-KEY header) |
| **Credential Storage** | Supabase vault (`global/n8n_api_key`) |

### Health Check

```bash
# Test if n8n is reachable (no auth required)
curl -s https://automation.growthcohq.com/healthz
# Expected: {"status":"ok"}
```

---

## Loading Credentials

### Method 1: From Vault (Recommended)

```bash
# Load global credentials (includes n8n_api_key)
cd /home/user/master-ops
node creds.js load global

# Verify credentials loaded
node creds.js verify
# Should show: ✓ global/n8n_api_key
```

### Method 2: Export to .env File

```bash
# Export credentials to local .env
node creds.js export global > .env

# Source the .env file
export $(grep -v '^#' .env | xargs)

# Verify
echo $N8N_API_KEY | head -c 20
```

### Method 3: Get Single Credential

```bash
# Get just the n8n API key
export N8N_API_KEY=$(node creds.js get global n8n_api_key)
export N8N_BASE_URL=https://automation.growthcohq.com

# Verify
echo "Key: ${N8N_API_KEY:0:20}..."
```

---

## Vault Access Requirements

The credential vault uses Supabase with these details:

| Setting | Value |
|---------|-------|
| **Host** | `usibnysqelovfuctmkqw.supabase.co` |
| **Table** | `secure_credentials` |
| **Encryption** | AES-256-CBC (client-side) |
| **Credential Path** | `global/n8n_api_key`, `global/n8n_base_url` |

### Troubleshooting Vault Access

If vault access fails with DNS error:

```bash
# Test DNS resolution
nslookup usibnysqelovfuctmkqw.supabase.co

# If DNS fails, try:
# 1. Check network connectivity
curl -s https://api.github.com

# 2. Try alternate DNS server
# (may require network configuration)

# 3. Use cached credentials if available
# Check if credentials exist in local .env files
grep -r "N8N_API_KEY" ~/.env .env* 2>/dev/null
```

---

## API Authentication

All n8n API calls require the `X-N8N-API-KEY` header:

```bash
# Example: List all workflows
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length'
```

### TypeScript Client Usage

```typescript
import { N8nClient } from './shared/libs/n8n/client'

// Reads from process.env automatically
const client = new N8nClient()

// Or specify explicitly
const client = new N8nClient({
  baseUrl: 'https://automation.growthcohq.com',
  apiKey: 'your-api-key-here'
})

// List workflows
const { data: workflows } = await client.listWorkflows()
console.log(`Found ${workflows.length} workflows`)
```

---

## API Endpoints Reference

### Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/workflows` | List all workflows |
| GET | `/api/v1/workflows/{id}` | Get workflow details |
| POST | `/api/v1/workflows` | Create workflow |
| PUT | `/api/v1/workflows/{id}` | Update workflow |
| DELETE | `/api/v1/workflows/{id}` | Delete workflow |
| POST | `/api/v1/workflows/{id}/activate` | Activate workflow |
| POST | `/api/v1/workflows/{id}/deactivate` | Deactivate workflow |
| POST | `/api/v1/workflows/{id}/execute` | Execute workflow |

### Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/executions` | List executions |
| GET | `/api/v1/executions/{id}` | Get execution details |
| DELETE | `/api/v1/executions/{id}` | Delete execution |
| POST | `/api/v1/executions/{id}/retry` | Retry execution |

### Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/credentials` | List credentials (metadata only) |
| GET | `/api/v1/credentials/{id}` | Get credential details |

---

## Common API Queries

### Get All Active Workflows

```bash
curl -s "https://automation.growthcohq.com/api/v1/workflows?active=true" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data[] | {id, name, active}'
```

### Get Recent Errors

```bash
curl -s "https://automation.growthcohq.com/api/v1/executions?status=error&limit=20" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data[] | {id, workflowId, startedAt, error: .data.resultData.error.message}'
```

### Get Workflow Statistics

```bash
WORKFLOW_ID="abc123"
curl -s "https://automation.growthcohq.com/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=100" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '{
    total: .data | length,
    success: [.data[] | select(.status == "success")] | length,
    error: [.data[] | select(.status == "error")] | length
  }'
```

### Search Workflows by Name

```bash
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data[] | select(.name | contains("unleashed")) | {id, name, active}'
```

---

## Full Inventory Query

To get the complete list of 200+ workflows:

```bash
# Save full workflow list
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | \
  jq '.data | sort_by(.name) | .[] | {id, name, active}' > workflow-inventory.json

# Count by status
cat workflow-inventory.json | jq -s '{
  total: length,
  active: [.[] | select(.active == true)] | length,
  inactive: [.[] | select(.active == false)] | length
}'
```

---

## Existing Helper Scripts

These scripts are available in the repository:

| Script | Purpose |
|--------|---------|
| `list-n8n-workflows.ts` | List all workflows |
| `check-n8n-workflow.ts` | Check specific workflow status |
| `diagnose-workflow-errors.ts` | Diagnose recent failures |
| `test-n8n-connection.ts` | Test API connectivity |
| `activate-n8n-workflow.ts` | Activate a workflow |
| `shared/libs/n8n/client.ts` | Full TypeScript API client |

### Running Scripts

```bash
# Ensure credentials are loaded first
node creds.js load global

# Then run scripts
npx tsx list-n8n-workflows.ts
npx tsx diagnose-workflow-errors.ts
npx tsx test-n8n-connection.ts
```

---

## Environment Setup Checklist

Before using n8n API:

- [ ] Vault is accessible (`node creds.js verify`)
- [ ] N8N_BASE_URL set to `https://automation.growthcohq.com`
- [ ] N8N_API_KEY loaded from vault
- [ ] Health check returns `{"status":"ok"}`
- [ ] Can list workflows via API

---

## Network Requirements

For environments where vault DNS fails:

1. **Direct Supabase access** requires DNS for:
   - `usibnysqelovfuctmkqw.supabase.co`

2. **n8n access** requires:
   - `automation.growthcohq.com` (confirmed reachable)

3. **Workaround if vault unavailable**:
   - Store credentials in GitHub Secrets
   - Use CI/CD to inject credentials
   - Maintain local encrypted .env

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
