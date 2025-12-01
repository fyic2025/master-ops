# Integration Tester - Quick Reference

> Single-page cheat sheet for testing integrations across all businesses.

---

## Quick Test Commands

```bash
# Load credentials first
node creds.js load <project>   # boo, elevate, teelixir, global

# Run integration tests
npx tsx test-bigcommerce.ts    # BigCommerce
npx tsx test-shopify.ts        # Shopify
npx tsx test-supabase.ts       # Supabase
npx tsx test-n8n-connection.ts # n8n
npx tsx run-integration-tests.ts --all  # All integrations
```

---

## Test Progression

```
1. Environment  → Check credentials exist
2. Connection   → Verify service reachable
3. Auth         → Validate credentials work
4. Read (GET)   → Fetch data
5. Create (POST)→ Add record (if safe)
6. Update (PUT) → Modify record
7. Delete       → Remove test record
8. Error cases  → Verify error handling
```

---

## Credential Loading

| Project | Command | Key Variables |
|---------|---------|---------------|
| BOO | `node creds.js load boo` | BC_ACCESS_TOKEN, SUPABASE_* |
| Teelixir | `node creds.js load teelixir` | SHOPIFY_*, UNLEASHED_*, KLAVIYO_* |
| Elevate | `node creds.js load elevate` | SHOPIFY_ACCESS_TOKEN |
| Global | `node creds.js load global` | N8N_*, HUBSPOT_*, SLACK_* |

---

## Common Endpoints

### BigCommerce (BOO)
```bash
BASE=https://api.bigcommerce.com/stores/${STORE_HASH}/v3
curl -s "$BASE/catalog/summary" \
  -H "X-Auth-Token: ${BC_ACCESS_TOKEN}"
```

### Shopify (Teelixir/Elevate)
```bash
BASE=https://${SHOP}.myshopify.com/admin/api/2024-01
curl -s "$BASE/shop.json" \
  -H "X-Shopify-Access-Token: ${SHOPIFY_ACCESS_TOKEN}"
```

### Supabase
```bash
curl -s "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

### n8n
```bash
curl -s "https://automation.growthcohq.com/api/v1/workflows" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"
```

### Unleashed
```bash
# Requires HMAC signature - use TypeScript client
npx tsx test-unleashed.ts
```

---

## Auth Methods by Service

| Service | Method | Header |
|---------|--------|--------|
| BigCommerce | API Token | `X-Auth-Token: {token}` |
| Shopify | Access Token | `X-Shopify-Access-Token: {token}` |
| Supabase | Bearer + API Key | `Authorization: Bearer {key}` + `apikey: {key}` |
| n8n | API Key | `X-N8N-API-KEY: {key}` |
| HubSpot | Bearer Token | `Authorization: Bearer {token}` |
| Unleashed | HMAC-SHA256 | `api-auth-id` + `api-auth-signature` |
| Klaviyo | API Key | `Authorization: Klaviyo-API-Key {key}` |

---

## Error Quick Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Invalid credentials | Refresh token in vault |
| 403 | Insufficient permissions | Check API scopes |
| 404 | Wrong endpoint | Verify URL path |
| 429 | Rate limited | Add delays |
| ECONNREFUSED | Service down | Check service status |
| ETIMEDOUT | Network slow | Increase timeout |
| HMAC invalid | Bad signature | Check encoding |

---

## Rate Limits

| Service | Limit | Window | Safe Delay |
|---------|-------|--------|------------|
| BigCommerce | 150 req | 30s | 200ms |
| Shopify | 2 req | 1s | 500ms |
| HubSpot | 100 req | 10s | 100ms |
| Unleashed | 200 req | 60s | 300ms |
| Klaviyo | 75 req | 1s | 50ms |

---

## Test Report Template

```typescript
const report = {
  service: 'ServiceName',
  timestamp: new Date().toISOString(),
  results: {
    environment: { status: 'pass', details: 'All vars present' },
    connection: { status: 'pass', latency: '145ms' },
    authentication: { status: 'pass', method: 'Bearer' },
    read: { status: 'pass', records: 10 },
    create: { status: 'skip', reason: 'Read-only test' },
    update: { status: 'skip', reason: 'Read-only test' },
    delete: { status: 'skip', reason: 'Read-only test' }
  },
  errors: [],
  recommendations: []
}
```

---

## Quick Diagnostics

```bash
# Check if service is up
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health

# Test DNS resolution
nslookup api.example.com

# Check SSL certificate
curl -vI https://api.example.com 2>&1 | grep -i "ssl\|certificate"

# Measure response time
curl -s -w "Time: %{time_total}s\n" -o /dev/null https://api.example.com
```

---

## Business Integration Summary

| Business | Platform | APIs | Database |
|----------|----------|------|----------|
| **BOO** | BigCommerce | BC Catalog, BC Orders | Supabase (boo_*) |
| **Teelixir** | Shopify | Shopify, Unleashed, Klaviyo | Supabase (tlx_*) |
| **Elevate** | Shopify | Shopify Admin | Supabase (elv_*) |
| **RHF** | WooCommerce | WC REST API | Supabase (rhf_*) |

---

## Test Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | Test(s) failed |
| 2 | Configuration error |

---

## Key Files

```
.claude/skills/integration-tester/
├── SKILL.md              # Skill definition
├── reference.md          # Full methodology
├── examples.md           # Real examples
├── AUTH-INTEGRATION-GUIDE.md  # Auth patterns
├── scripts/
│   ├── auth-strategies.ts    # Auth helpers
│   ├── error-solutions.ts    # Error database
│   └── validators.ts         # Validation utils
└── templates/
    └── test-report.template.md
```

---

**Version:** 1.0 | **Updated:** 2025-12-01
