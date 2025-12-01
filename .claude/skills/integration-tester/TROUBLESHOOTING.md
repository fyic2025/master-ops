# Integration Troubleshooting Decision Trees

> Step-by-step diagnosis for common integration failures.

---

## Decision Tree 1: Connection Failures

```
Integration not connecting?
│
├─ Can you reach any external URL?
│  ├─ NO → Network/DNS issue
│  │       • Check internet connection
│  │       • Verify DNS server settings
│  │       • Try: curl -s https://api.github.com
│  │
│  └─ YES → Service-specific issue
│           │
│           ├─ Does the URL resolve?
│           │  ├─ NO (ENOTFOUND) → Wrong hostname
│           │  │   • Check URL spelling
│           │  │   • Verify in .env file
│           │  │
│           │  └─ YES → Connection refused/timeout
│           │           │
│           │           ├─ ECONNREFUSED → Service down or wrong port
│           │           │   • Check service status page
│           │           │   • Verify port number (443 for HTTPS)
│           │           │
│           │           └─ ETIMEDOUT → Network latency or firewall
│           │               • Check if IP is whitelisted
│           │               • Increase timeout value
│           │               • Try from different network
```

---

## Decision Tree 2: Authentication Failures

```
Getting 401 or 403 errors?
│
├─ 401 Unauthorized
│  │
│  ├─ Is the token/key present?
│  │  ├─ NO → Load credentials
│  │  │       • node creds.js load <project>
│  │  │       • Check .env file exists
│  │  │
│  │  └─ YES → Token may be invalid
│  │           │
│  │           ├─ Is token format correct?
│  │           │  • Bearer vs API Key vs Basic
│  │           │  • Check header name (Authorization, X-Auth-Token, etc.)
│  │           │
│  │           ├─ Is token expired?
│  │           │  • OAuth tokens expire (refresh needed)
│  │           │  • Some API keys rotate
│  │           │
│  │           └─ Is token for correct environment?
│  │              • Test vs Production keys
│  │              • Sandbox vs Live
│  │
└─ 403 Forbidden
   │
   ├─ Token is valid but lacks permissions
   │  • Check API scopes/permissions
   │  • Review OAuth consent granted
   │  • Verify resource access level
   │
   └─ IP restriction?
      • Check if server IP is whitelisted
      • Some APIs require IP registration
```

---

## Decision Tree 3: Data Errors

```
Getting 400/422 errors?
│
├─ 400 Bad Request
│  │
│  ├─ Check request body
│  │  • Is JSON valid? (use jq to validate)
│  │  • Are required fields present?
│  │  • Are data types correct?
│  │
│  ├─ Check Content-Type header
│  │  • application/json for JSON body
│  │  • application/x-www-form-urlencoded for forms
│  │
│  └─ Check URL encoding
│     • Special characters must be encoded
│     • Query parameters properly formatted
│
├─ 404 Not Found
│  │
│  ├─ Check endpoint path
│  │  • Typos in URL
│  │  • Missing version prefix (/v1, /v2, /v3)
│  │  • Wrong resource name
│  │
│  └─ Check resource ID
│     • ID may not exist
│     • ID format incorrect (UUID vs numeric)
│
└─ 422 Unprocessable Entity
   │
   ├─ Validation failed
   │  • Field value out of range
   │  • Enum value not in allowed list
   │  • String too long/short
   │
   └─ Business rule violation
      • Duplicate key constraint
      • Referenced record doesn't exist
      • State transition not allowed
```

---

## Decision Tree 4: Rate Limiting

```
Getting 429 Too Many Requests?
│
├─ Immediate fix
│  │
│  ├─ Check Retry-After header
│  │  • Wait the specified seconds
│  │  • Then retry request
│  │
│  └─ Implement exponential backoff
│     • 1s, 2s, 4s, 8s delays
│     • Max 3-5 retries
│
├─ Long-term fix
│  │
│  ├─ Add delays between requests
│  │  • await new Promise(r => setTimeout(r, 200))
│  │  • Use rate limit table from QUICK-REFERENCE.md
│  │
│  ├─ Batch requests where possible
│  │  • Use bulk endpoints
│  │  • Reduce API calls
│  │
│  └─ Implement request queue
│     • Throttle concurrent requests
│     • Process sequentially if needed
│
└─ Check if hitting limits
   │
   ├─ Review API rate limit headers
   │  • X-RateLimit-Remaining
   │  • X-RateLimit-Reset
   │
   └─ Stagger cron jobs
      • Don't run multiple syncs simultaneously
      • Spread schedules across time windows
```

---

## Decision Tree 5: HMAC Signature Errors

```
Unleashed HMAC signature failing?
│
├─ Check signature generation
│  │
│  ├─ Query string handling
│  │  • Must be decoded before signing
│  │  • decodeURIComponent(queryString)
│  │
│  ├─ Algorithm
│  │  • HMAC-SHA256
│  │  • Base64 encoded output
│  │
│  └─ Parameter order
│     • Must match URL order exactly
│     • No extra whitespace
│
├─ Check credentials
│  │
│  ├─ API ID correct?
│  │  • api-auth-id header
│  │
│  └─ API Key correct?
│     • Used as HMAC secret
│     • No leading/trailing whitespace
│
└─ Test with known-good request
   │
   └─ Use minimal query (empty string)
      • Sign empty string first
      • Add parameters one by one
```

**Correct HMAC implementation:**
```javascript
const crypto = require('crypto')

function sign(apiKey, queryString = '') {
  // CRITICAL: Decode query string before signing
  const decoded = decodeURIComponent(queryString)
  return crypto
    .createHmac('sha256', apiKey)
    .update(decoded)
    .digest('base64')
}
```

---

## Decision Tree 6: Supabase Errors

```
Supabase operation failing?
│
├─ Connection issues
│  │
│  ├─ Check SUPABASE_URL format
│  │  • https://[project-ref].supabase.co
│  │
│  └─ Check keys
│     • SUPABASE_ANON_KEY for public access
│     • SUPABASE_SERVICE_ROLE_KEY for admin
│
├─ RLS (Row Level Security) errors
│  │
│  ├─ Using anon key?
│  │  • RLS policies apply
│  │  • May need service role key instead
│  │
│  └─ Check RLS policies
│     • SELECT policy exists?
│     • INSERT/UPDATE/DELETE policies?
│
├─ Constraint violations
│  │
│  ├─ 23505 - Duplicate key
│  │  • Use UPSERT instead of INSERT
│  │  • .upsert(data, { onConflict: 'id' })
│  │
│  ├─ 23502 - NOT NULL violation
│  │  • Required field missing
│  │  • Add default value or validate before insert
│  │
│  └─ 23503 - Foreign key violation
│     • Referenced record doesn't exist
│     • Insert parent record first
│
└─ Query errors
   │
   ├─ Column doesn't exist
   │  • Check table schema
   │  • Column name typo
   │
   └─ Type mismatch
      • JSON vs TEXT
      • UUID vs STRING
```

---

## Decision Tree 7: Shopify Errors

```
Shopify API failing?
│
├─ Authentication
│  │
│  ├─ Check access token
│  │  • X-Shopify-Access-Token header
│  │
│  └─ Check API version
│     • 2024-01, 2024-04, etc.
│     • Some endpoints deprecated
│
├─ Rate limits (2 req/sec)
│  │
│  ├─ Add 500ms delay between requests
│  │
│  └─ Use bulk operations for large datasets
│     • bulkOperationRunQuery
│     • bulkOperationCancel
│
├─ Webhook issues
│  │
│  ├─ Webhook not firing
│  │  • Check webhook is registered
│  │  • Verify topic is correct
│  │
│  └─ Webhook signature invalid
│     • HMAC-SHA256 of body with secret
│     • Compare with X-Shopify-Hmac-Sha256 header
│
└─ GraphQL errors
   │
   ├─ Query too complex
   │  • Reduce fields requested
   │  • Add pagination
   │
   └─ Cost exceeded
      • Check X-Shopify-Shop-Api-Call-Limit header
      • Simplify query
```

---

## Decision Tree 8: BigCommerce Errors

```
BigCommerce API failing?
│
├─ Authentication
│  │
│  ├─ Check headers
│  │  • X-Auth-Token: {access_token}
│  │  • Content-Type: application/json
│  │
│  └─ Check store hash
│     • Embedded in URL path
│     • /stores/{store_hash}/v3/...
│
├─ Rate limits (150 req/30s)
│  │
│  ├─ Check rate limit headers
│  │  • X-Rate-Limit-Requests-Left
│  │  • X-Rate-Limit-Time-Reset-Ms
│  │
│  └─ Implement throttling
│     • 200ms delay between requests
│     • Batch updates where possible
│
├─ Catalog errors
│  │
│  ├─ Product not found
│  │  • Check product ID exists
│  │  • Product may be deleted
│  │
│  └─ Variant errors
│     • SKU must be unique
│     • Option values must exist
│
└─ Order errors
   │
   ├─ Read-only fields
   │  • Cannot update certain order fields
   │
   └─ Status transitions
      • Some status changes not allowed
```

---

## Diagnostic Commands

```bash
# Test connectivity
curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://api.example.com

# Validate JSON
echo '{"key": "value"}' | jq .

# Check DNS
nslookup api.example.com

# Test with verbose output
curl -v https://api.example.com 2>&1 | head -30

# Check SSL
openssl s_client -connect api.example.com:443 -servername api.example.com 2>/dev/null | openssl x509 -noout -dates

# Load and verify credentials
node creds.js verify
```

---

## Emergency Contacts

| Issue Type | Check First |
|------------|-------------|
| BigCommerce down | status.bigcommerce.com |
| Shopify down | status.shopify.com |
| Supabase down | status.supabase.com |
| n8n issues | automation.growthcohq.com/healthz |

---

**Version:** 1.0 | **Updated:** 2025-12-01
