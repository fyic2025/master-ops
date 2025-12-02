# n8n Workflow Manager - Quick Reference

> Single-page reference for n8n operations at automation.growthcohq.com

---

## Connection Info

| Setting | Value |
|---------|-------|
| **URL** | `https://automation.growthcohq.com` |
| **API** | `/api/v1/` |
| **Auth** | `X-N8N-API-KEY` header |
| **Workflows** | 200+ active |

---

## Load Credentials

```bash
# From vault (recommended)
node creds.js load global

# Or export to .env
node creds.js export global > .env && source .env

# Or get single key
export N8N_API_KEY=$(node creds.js get global n8n_api_key)
export N8N_BASE_URL=https://automation.growthcohq.com
```

---

## Quick Commands

```bash
# Health check (no auth)
curl -s https://automation.growthcohq.com/healthz

# List all workflows
curl -s "${N8N_BASE_URL}/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}" | jq '.data | length'

# Get workflow
curl -s "${N8N_BASE_URL}/api/v1/workflows/{id}" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Activate workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/{id}/activate" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Execute workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/{id}/execute" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Recent failures
curl -s "${N8N_BASE_URL}/api/v1/executions?status=error&limit=10" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"

# Retry failed execution
curl -X POST "${N8N_BASE_URL}/api/v1/executions/{id}/retry" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"
```

---

## Helper Scripts

```bash
# NEW (2025-12-02) - Audit scripts using curl (bypasses DNS issues)
node scripts/audit-all-workflows.js 1        # Audit batch 1 (20 workflows)
node scripts/fix-n8n-workflows.js show {id}  # Show workflow structure
node scripts/fix-n8n-workflows.js disable {id}  # Disable a workflow
node scripts/get-workflow-errors.js          # Get detailed error info

# Legacy scripts
npx tsx list-n8n-workflows.ts          # List all workflows
npx tsx check-n8n-workflow.ts {id}     # Check workflow status
npx tsx diagnose-workflow-errors.ts    # Diagnose failures
npx tsx test-n8n-connection.ts         # Test connectivity
```

---

## Business Workflows

| Business | Key Workflows |
|----------|--------------|
| **BOO** | bc-product-sync, supplier-sync, gsc-tracker |
| **Teelixir** | unleashed-orders, smartlead-hubspot, winback |
| **Elevate** | prospecting-daily, login-detector, trial-expiration |
| **Shared** | health-check, error-monitor, daily-summary |

---

## Rate Limits

| API | Limit | Delay |
|-----|-------|-------|
| BigCommerce | 150/30s | 200ms |
| HubSpot | 100/10s | 100ms |
| Shopify | 2/s | 500ms |
| Klaviyo | 75/s | 50ms |
| Unleashed | 200/60s | 300ms |

---

## Credential Fix Guide (2025-12-02 Audit)

| Credential Type | Fix Method | Via API? |
|-----------------|------------|----------|
| `gmailOAuth2` | Re-authenticate via Google OAuth flow | No - UI only |
| `googleSheetsOAuth2Api` | Re-authenticate via Google OAuth flow | No - UI only |
| `supabaseApi` | Update API key in n8n credentials | No - UI only |
| `postgres` | Update connection string/password | No - UI only |
| `httpHeaderAuth` | Update Bearer token | Yes - inline in node |
| `hubspotAppToken` | Update Bearer token | Yes - inline in node |

**What CAN be fixed via API:**
- Inline Bearer tokens in HTTP Request nodes
- Node logic changes (IF conditions, Code nodes)
- Removing broken nodes entirely

---

## Common Errors

| Error | Code | Quick Fix |
|-------|------|-----------|
| 401 Unauthorized | AUTH-001 | Refresh credentials |
| 429 Rate Limited | RATE-001 | Add delays |
| ECONNREFUSED | CONN-001 | Check service status |
| HMAC signature | HMAC-001 | Check encoding |
| Credential not found | CRED-001 | Re-link in n8n UI |
| password auth failed | CRED-002 | Update postgres creds in UI |
| EAI_AGAIN DNS | CONN-003 | Use curl -sk, not Node.js https |

---

## Troubleshooting

```
Not triggering?
├─ Is workflow active? → Activate
├─ Cron expression valid? → Check schedule
└─ Webhook URL correct? → Verify in n8n

Execution failing?
├─ 401/403? → Refresh credentials
├─ 429? → Add rate limit delays
├─ ECONNREFUSED? → Check if service up
└─ Data error? → Check transformation

Slow performance?
├─ Add SplitInBatches node
├─ Add Wait nodes between calls
└─ Optimize Code node logic
```

---

## Self-Healing

| Error Type | Auto-Fix Level |
|------------|----------------|
| Rate limit (429) | L0 - Auto retry |
| Connection timeout | L0 - Retry with backoff |
| DNS failure | L0 - Wait and retry |
| Auth expired | L2 - Alert, needs human |
| HMAC error | L3 - Manual fix needed |

---

## Key Files

```
shared/libs/n8n/client.ts              # TypeScript API client
infra/n8n-workflows/templates/         # Workflow templates
.claude/skills/n8n-workflow-manager/   # This skill
```

---

## Vault Credentials

| Path | Env Var |
|------|---------|
| `global/n8n_api_key` | `N8N_API_KEY` |
| `global/n8n_base_url` | `N8N_BASE_URL` |

---

## Emergency Contacts

- n8n Issues: Check https://automation.growthcohq.com/healthz
- Vault Issues: Check Supabase status
- API Issues: Check rate limits first

---

## Daily Checklist

- [ ] n8n health check returns OK
- [ ] <5 failed executions in 24h
- [ ] Critical workflows ran successfully
- [ ] No stale workflows (>24h overdue)

---

**Document Version:** 1.1 | **Last Updated:** 2025-12-02
