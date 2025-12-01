# Error Patterns - n8n Workflow Manager

> Catalog of known n8n workflow errors with detection and resolution.

---

## Error Classification

| Category | Code | Description | Severity |
|----------|------|-------------|----------|
| AUTH | 401/403 | Authentication/Authorization failures | High |
| RATE | 429 | Rate limiting exceeded | Medium |
| CONN | ECONNREFUSED/ETIMEDOUT | Connection failures | Medium |
| DATA | Various | Data format/validation errors | Medium |
| HMAC | HMAC_INVALID | Signature generation errors | High |
| NODE | NODE_ERROR | n8n node-specific errors | Varies |
| CRED | CRED_MISSING | Credential configuration issues | High |

---

## 1. AUTHENTICATION ERRORS (AUTH)

### AUTH-001: 401 Unauthorized

**Pattern:**
```json
{
  "status": 401,
  "message": "Unauthorized",
  "errorCode": "UNAUTHORIZED"
}
```

**Detection Query:**
```javascript
// Check recent executions for 401 errors
const { data } = await n8nClient.listExecutions({ status: 'error', limit: 50 })
const auth401 = data.filter(e =>
  e.data?.resultData?.error?.message?.includes('401') ||
  e.data?.resultData?.error?.message?.includes('Unauthorized')
)
```

**Root Causes:**
1. API token expired
2. Token revoked by service provider
3. Wrong token environment (test vs prod)
4. Token not refreshed (OAuth)

**Resolution:**

| Service | Token Refresh Method |
|---------|---------------------|
| BigCommerce | Generate new token in store settings |
| Shopify | Reinstall private app |
| HubSpot | Re-authorize OAuth app |
| Unleashed | Generate new API key pair |
| Klaviyo | Create new private API key |
| Google | Re-run OAuth consent flow |

```bash
# Update credential in vault
node creds.js store <project> <cred_name> "<new_token>" "Updated after 401"

# Update in n8n UI
echo "Visit: https://automation.growthcohq.com/credentials"
```

---

### AUTH-002: 403 Forbidden

**Pattern:**
```json
{
  "status": 403,
  "message": "Forbidden",
  "error": "insufficient_scope"
}
```

**Root Causes:**
1. API key lacks required permissions
2. Resource access denied (wrong store/account)
3. IP not whitelisted
4. Subscription tier doesn't include API access

**Resolution:**
- Review API key permissions/scopes
- Check resource IDs (store_hash, account_id)
- Add server IP to whitelist
- Upgrade subscription if needed

---

### AUTH-003: OAuth Token Expired

**Pattern:**
```
{
  "error": "invalid_grant",
  "error_description": "Token has been expired or revoked"
}
```

**Affected Services:**
- Google (Sheets, Gmail, GSC)
- HubSpot
- Microsoft 365

**Resolution:**
```bash
# 1. Re-authorize in n8n
# Visit: https://automation.growthcohq.com/credentials
# Find OAuth credential → Click "Reconnect"

# 2. Complete OAuth flow in browser

# 3. Test workflow
curl -X POST "${N8N_BASE_URL}/api/v1/workflows/{id}/execute" \
  -H "X-N8N-API-KEY: ${N8N_API_KEY}"
```

---

## 2. RATE LIMITING ERRORS (RATE)

### RATE-001: 429 Too Many Requests

**Pattern:**
```json
{
  "status": 429,
  "message": "Too Many Requests",
  "retryAfter": 60
}
```

**Service Rate Limits:**

| Service | Limit | Window | Recommended Delay |
|---------|-------|--------|-------------------|
| BigCommerce | 150 | 30s | 200ms between calls |
| HubSpot | 100 | 10s | 100ms between calls |
| Shopify | 2 | 1s | 500ms between calls |
| Klaviyo | 75 | 1s | 50ms between calls |
| Unleashed | 200 | 60s | 300ms between calls |
| Google APIs | Varies | Varies | Check specific API |

**Resolution:**

```javascript
// Add Wait node after API calls
// Code node with exponential backoff
const retryCount = $input.item.json.retryCount || 0
const maxRetries = 3

if (retryCount < maxRetries) {
  const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
  await new Promise(resolve => setTimeout(resolve, delay))
  return [{ json: { ...item.json, retryCount: retryCount + 1 } }]
} else {
  throw new Error('Max retries exceeded for rate limit')
}
```

**Workflow Modifications:**
1. Add SplitInBatches node (batch size < rate limit)
2. Add Wait node between batches (1-2 seconds)
3. Stagger cron schedules to avoid concurrent API calls

---

## 3. CONNECTION ERRORS (CONN)

### CONN-001: ECONNREFUSED

**Pattern:**
```
Error: connect ECONNREFUSED 192.168.1.1:443
```

**Root Causes:**
1. Service is down
2. Wrong hostname/port
3. Firewall blocking connection
4. DNS resolution failure

**Resolution:**
```bash
# Test connectivity
curl -v https://api.example.com/health

# Check DNS
nslookup api.example.com

# Test with timeout
curl --connect-timeout 10 https://api.example.com
```

---

### CONN-002: ETIMEDOUT

**Pattern:**
```
Error: connect ETIMEDOUT
```

**Root Causes:**
1. Network latency
2. Service overloaded
3. Request too large
4. Timeout too short

**Resolution:**
```javascript
// Increase timeout in HTTP Request node
// Options → Timeout: 120000 (120 seconds)

// Or in Code node
const response = await fetch(url, {
  timeout: 120000,
  signal: AbortSignal.timeout(120000)
})
```

---

### CONN-003: DNS Resolution Failed (EAI_AGAIN)

**Pattern:**
```
Error: getaddrinfo EAI_AGAIN api.example.com
```

**Resolution:**
1. Wait and retry (temporary DNS issue)
2. Check DNS server configuration
3. Use IP address directly (temporary workaround)
4. Add retry logic with exponential backoff

---

## 4. DATA ERRORS (DATA)

### DATA-001: JSON Parse Error

**Pattern:**
```
SyntaxError: Unexpected token < in JSON at position 0
```

**Root Causes:**
1. API returned HTML error page
2. Empty response body
3. Malformed JSON from API
4. Response encoding issue

**Resolution:**
```javascript
// Add error handling in Code node
try {
  const data = JSON.parse(response.body)
  return data
} catch (error) {
  console.log('Raw response:', response.body)
  throw new Error(`Invalid JSON: ${response.body.substring(0, 200)}`)
}
```

---

### DATA-002: Type Mismatch

**Pattern:**
```
TypeError: Cannot read property 'x' of undefined
```

**Root Causes:**
1. Missing expected field in response
2. Array vs object confusion
3. Null/undefined not handled
4. API response structure changed

**Resolution:**
```javascript
// Add defensive checks
const items = response?.data?.items || []
const firstItem = items[0] ?? {}
const value = firstItem.property ?? 'default'
```

---

### DATA-003: Supabase Constraint Violation

**Pattern:**
```json
{
  "code": "23505",
  "message": "duplicate key value violates unique constraint"
}
```

**Resolution:**
```javascript
// Use UPSERT instead of INSERT
const { data, error } = await supabase
  .from('table')
  .upsert(record, { onConflict: 'id' })
```

---

### DATA-004: Required Field Missing

**Pattern:**
```json
{
  "code": "23502",
  "message": "null value in column \"email\" violates not-null constraint"
}
```

**Resolution:**
```javascript
// Validate before insert
if (!record.email) {
  console.log('Skipping record without email:', record.id)
  continue
}
```

---

## 5. HMAC SIGNATURE ERRORS (HMAC)

### HMAC-001: Invalid Signature (Unleashed)

**Pattern:**
```json
{
  "status": 401,
  "message": "HMAC signature validation failed"
}
```

**Root Causes:**
1. Query string not properly encoded
2. Parameters not sorted alphabetically
3. Whitespace in API key
4. Wrong encoding (UTF-8 vs ASCII)

**Correct Implementation:**
```javascript
// Unleashed HMAC signature generation
const crypto = require('crypto')

function generateUnleashedAuth(apiId, apiKey, queryString = '') {
  // Query string must be decoded before signing
  const decodedQuery = decodeURIComponent(queryString)

  // Generate HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', apiKey)
    .update(decodedQuery)
    .digest('base64')

  return {
    'api-auth-id': apiId,
    'api-auth-signature': signature,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// Usage
const query = 'startDate=2024-01-01&endDate=2024-01-31'
const headers = generateUnleashedAuth(apiId, apiKey, query)
```

---

## 6. NODE-SPECIFIC ERRORS (NODE)

### NODE-001: HTTP Request Node Errors

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| SSL_ERROR | Certificate issue | Enable "Ignore SSL Issues" |
| BODY_TOO_LARGE | Response > 16MB | Use streaming or pagination |
| INVALID_URL | Malformed URL | Check URL encoding |

---

### NODE-002: Code Node Errors

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| ReferenceError | Undefined variable | Check variable scope |
| Maximum call stack | Infinite recursion | Fix loop logic |
| Out of memory | Large data processing | Use streaming |

---

### NODE-003: Supabase Node Errors

**Common Issues:**
| Error | Cause | Fix |
|-------|-------|-----|
| RLS violation | No matching policy | Check RLS policies |
| Connection timeout | Network issue | Increase timeout |
| Schema mismatch | Column doesn't exist | Update schema |

---

## 7. CREDENTIAL ERRORS (CRED)

### CRED-001: Credential Not Found

**Pattern:**
```
Credential with ID "abc123" not found
```

**Root Causes:**
1. Credential deleted from n8n
2. Workflow imported from different instance
3. Credential ID mismatch

**Resolution:**
1. Open workflow in n8n UI
2. Find nodes with red warning
3. Re-select credential from dropdown
4. Save workflow

---

### CRED-002: Credential Type Mismatch

**Pattern:**
```
Credential type "shopifyApi" not compatible with node
```

**Resolution:**
1. Check node documentation for required credential type
2. Create new credential of correct type
3. Re-link credential to node

---

## Error Detection Script

```typescript
// scripts/detect-n8n-errors.ts
import { n8nClient } from '../shared/libs/n8n'

interface ErrorPattern {
  pattern: RegExp
  category: string
  code: string
  severity: 'high' | 'medium' | 'low'
}

const ERROR_PATTERNS: ErrorPattern[] = [
  { pattern: /401|Unauthorized/i, category: 'AUTH', code: 'AUTH-001', severity: 'high' },
  { pattern: /403|Forbidden/i, category: 'AUTH', code: 'AUTH-002', severity: 'high' },
  { pattern: /invalid_grant/i, category: 'AUTH', code: 'AUTH-003', severity: 'high' },
  { pattern: /429|Too Many/i, category: 'RATE', code: 'RATE-001', severity: 'medium' },
  { pattern: /ECONNREFUSED/i, category: 'CONN', code: 'CONN-001', severity: 'medium' },
  { pattern: /ETIMEDOUT/i, category: 'CONN', code: 'CONN-002', severity: 'medium' },
  { pattern: /EAI_AGAIN/i, category: 'CONN', code: 'CONN-003', severity: 'medium' },
  { pattern: /HMAC|signature/i, category: 'HMAC', code: 'HMAC-001', severity: 'high' },
  { pattern: /Credential.*not found/i, category: 'CRED', code: 'CRED-001', severity: 'high' },
]

async function detectErrors() {
  const { data: executions } = await n8nClient.listExecutions({
    status: 'error',
    limit: 100
  })

  const categorizedErrors: Record<string, any[]> = {}

  for (const exec of executions) {
    const errorMessage = exec.data?.resultData?.error?.message || ''

    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(errorMessage)) {
        if (!categorizedErrors[pattern.code]) {
          categorizedErrors[pattern.code] = []
        }
        categorizedErrors[pattern.code].push({
          executionId: exec.id,
          workflowId: exec.workflowId,
          startedAt: exec.startedAt,
          message: errorMessage.substring(0, 200)
        })
        break
      }
    }
  }

  return categorizedErrors
}

// Run detection
detectErrors().then(console.log)
```

---

## Error Monitoring Dashboard Queries

```sql
-- Recent errors by category (for Supabase dashboard)
SELECT
  CASE
    WHEN error_message LIKE '%401%' THEN 'AUTH-001'
    WHEN error_message LIKE '%403%' THEN 'AUTH-002'
    WHEN error_message LIKE '%429%' THEN 'RATE-001'
    WHEN error_message LIKE '%ECONNREFUSED%' THEN 'CONN-001'
    WHEN error_message LIKE '%ETIMEDOUT%' THEN 'CONN-002'
    ELSE 'UNKNOWN'
  END as error_code,
  COUNT(*) as count,
  MAX(created_at) as last_seen
FROM workflow_execution_logs
WHERE status = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY count DESC;
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
