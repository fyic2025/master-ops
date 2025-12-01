# Historical Issues Database - Supabase Expert

> Known issues, their root causes, and proven solutions. Learn from past problems.

---

## Issue Classification

| Severity | Response Time | Examples |
|----------|---------------|----------|
| 🔴 **CRITICAL** | Immediate | Data loss, complete outage, security breach |
| 🟠 **HIGH** | < 1 hour | Sync failures, API errors, checkout blocking |
| 🟡 **MEDIUM** | < 4 hours | Performance degradation, partial failures |
| 🟢 **LOW** | < 24 hours | Warnings, cosmetic issues, optimization |

---

## 1. BOO - BUY ORGANICS ONLINE

### Issue: Checkout Errors (Zero Stock Products)
**Severity:** 🟠 HIGH
**First Seen:** 2025-11-28
**Status:** IDENTIFIED - Fix documented

**Symptoms:**
- Customers add products to cart successfully
- Checkout fails with "Shopping cart has been updated"
- 20.9% of support conversations related to this

**Root Cause:**
- 2,310 products have stock_level = 0 but are still visible
- Stock sync updates quantity but doesn't hide zero-stock products
- BigCommerce allows adding unavailable products to cart

**Solution:**
```sql
-- Find affected products
SELECT COUNT(*) FROM bc_products
WHERE stock_level = 0 AND is_visible = true;

-- Fix: Update sync to hide zero-stock
UPDATE bc_products
SET is_visible = false
WHERE stock_level = 0 AND is_visible = true;
```

**Prevention:**
- Modify stock sync to auto-hide when stock = 0
- Add monitoring alert for zero-stock visible products > 100

---

### Issue: Supplier Sync FTP Timeout (Oborne)
**Severity:** 🟡 MEDIUM
**First Seen:** 2025-11-15
**Status:** RESOLVED

**Symptoms:**
- Oborne FTP connection times out
- supplier_products not updated for Oborne
- Stale stock data for 1,823 products

**Root Cause:**
- FTP server has 30-second idle timeout
- Large file downloads exceed timeout
- Connection drops mid-transfer

**Solution:**
```javascript
// Add keep-alive and retry logic
const ftpConfig = {
  host: oborne_ftp_host,
  user: oborne_ftp_user,
  password: oborne_ftp_password,
  keepAlive: 10000, // 10 second keep-alive
  timeout: 60000    // 60 second timeout
};

// Retry up to 3 times
for (let i = 0; i < 3; i++) {
  try {
    await downloadFile();
    break;
  } catch (e) {
    if (i === 2) throw e;
    await sleep(5000);
  }
}
```

**Prevention:**
- Monitor FTP success rate in integration_logs
- Alert if Oborne sync fails 2+ times consecutively

---

### Issue: BigCommerce API Rate Limiting
**Severity:** 🟡 MEDIUM
**First Seen:** 2025-11-20
**Status:** RESOLVED

**Symptoms:**
- API calls return 429 Too Many Requests
- Product sync incomplete
- Error: "Rate limit exceeded"

**Root Cause:**
- BigCommerce allows ~150 requests/30 seconds
- Bulk operations exceeded limit
- No rate limiting in sync scripts

**Solution:**
```javascript
// Add rate limiter
const rateLimiter = {
  requests: 0,
  windowStart: Date.now(),
  maxRequests: 140, // Leave buffer
  windowMs: 30000,

  async throttle() {
    if (Date.now() - this.windowStart > this.windowMs) {
      this.requests = 0;
      this.windowStart = Date.now();
    }
    if (this.requests >= this.maxRequests) {
      const wait = this.windowMs - (Date.now() - this.windowStart);
      await sleep(wait);
      this.requests = 0;
      this.windowStart = Date.now();
    }
    this.requests++;
  }
};
```

**Prevention:**
- All BigCommerce scripts use shared rate limiter
- Monitor api_metrics for 429 responses

---

## 2. TEELIXIR

### Issue: HubSpot Contact Sync 403 Errors
**Severity:** 🟠 HIGH
**First Seen:** 2025-11-25
**Status:** RESOLVED

**Symptoms:**
- HubSpot API returns 403 Forbidden
- Contacts not syncing to CRM
- integration_logs shows auth failures

**Root Cause:**
- HubSpot rate limiting (100 requests/10 seconds)
- Bulk operations triggering rate limits
- API returns 403 instead of 429 for some limits

**Solution:**
```javascript
// Add delay between HubSpot calls
const HUBSPOT_DELAY_MS = 200; // 5 requests/second max

async function syncContact(contact) {
  await hubspotClient.createContact(contact);
  await sleep(HUBSPOT_DELAY_MS);
}
```

**Prevention:**
- Always use 200ms minimum delay between HubSpot calls
- Monitor hubspot_sync_log for error patterns

---

### Issue: Unleashed HMAC Signature Failures
**Severity:** 🟠 HIGH
**First Seen:** 2025-11-22
**Status:** RESOLVED

**Symptoms:**
- Unleashed API returns 401 Unauthorized
- "Invalid signature" error message
- Sync completely blocked

**Root Cause:**
- HMAC-SHA256 signature timing sensitive
- Query string order matters
- Encoding issues with special characters

**Solution:**
```javascript
// Correct HMAC signature generation
function generateSignature(queryString, apiKey) {
  // Query string must be URL-decoded for signing
  const decoded = decodeURIComponent(queryString);

  // Use exact API key, no trimming
  const hmac = crypto.createHmac('sha256', apiKey);
  hmac.update(decoded);

  return hmac.digest('base64');
}

// Query params must be sorted alphabetically
function buildQueryString(params) {
  return Object.keys(params)
    .sort()
    .map(k => `${k}=${encodeURIComponent(params[k])}`)
    .join('&');
}
```

**Prevention:**
- Use shared Unleashed client with correct signing
- Test signature generation before bulk operations

---

### Issue: Gmail OAuth Refresh Token Expiry
**Severity:** 🟠 HIGH
**First Seen:** 2025-11-30
**Status:** DOCUMENTED

**Symptoms:**
- Winback emails fail to send
- "invalid_grant" error from Google
- Gmail refresh token rejected

**Root Cause:**
- Google refresh tokens expire after 6 months inactivity
- Or if user revokes access
- Or if too many tokens issued

**Solution:**
```javascript
// Refresh token handling
async function getGmailAccessToken() {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      // Refresh token expired - need manual re-auth
      throw new Error('GMAIL_REAUTH_REQUIRED');
    }

    return (await response.json()).access_token;
  } catch (e) {
    // Log and alert
    await logError('gmail_oauth', e.message);
    throw e;
  }
}
```

**Prevention:**
- Monitor gmail token refresh in automation_config
- Alert if refresh fails - requires manual OAuth flow

---

### Issue: Klaviyo Segment Pagination
**Severity:** 🟡 MEDIUM
**First Seen:** 2025-11-28
**Status:** RESOLVED

**Symptoms:**
- Only first 100 unengaged profiles synced
- tlx_klaviyo_unengaged missing records
- Winback pool smaller than expected

**Root Cause:**
- Klaviyo API paginates at 100 records
- Initial sync didn't handle cursor pagination
- Cursor-based, not offset-based

**Solution:**
```javascript
// Correct Klaviyo pagination
async function getAllProfiles(segmentId) {
  let profiles = [];
  let cursor = null;

  do {
    const url = cursor
      ? `${KLAVIYO_API}/segments/${segmentId}/profiles?page[cursor]=${cursor}`
      : `${KLAVIYO_API}/segments/${segmentId}/profiles`;

    const response = await fetch(url, { headers: klaviyoHeaders });
    const data = await response.json();

    profiles = profiles.concat(data.data);
    cursor = data.links?.next ? new URL(data.links.next).searchParams.get('page[cursor]') : null;

    await sleep(50); // Rate limit
  } while (cursor);

  return profiles;
}
```

**Prevention:**
- All Klaviyo syncs use cursor pagination
- Log total count vs synced count for verification

---

## 3. ELEVATE WHOLESALE

### Issue: Trial Expiration Cron Not Running
**Severity:** 🟡 MEDIUM
**First Seen:** 2025-11-29
**Status:** DOCUMENTED

**Symptoms:**
- Expired trials not being disabled
- Discount codes still active past 30 days
- trial_customers.trial_status not updating

**Root Cause:**
- Supabase Edge Function cron not configured
- sync-trial-expirations function exists but not scheduled
- Manual deployment step missed

**Solution:**
```sql
-- In Supabase Dashboard > Database > Extensions
-- Enable pg_cron if not enabled

-- Schedule daily expiration check (2 AM AEST = 4 PM UTC previous day)
SELECT cron.schedule(
  'expire-trials',
  '0 16 * * *',  -- 4 PM UTC = 2 AM AEST next day
  $$SELECT net.http_post(
    'https://usibnysqelovfuctmkqw.supabase.co/functions/v1/sync-trial-expirations',
    '{}',
    'application/json',
    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.service_role_key'))]
  )$$
);
```

**Prevention:**
- Document cron setup in deployment checklist
- Add health check for last expiration run

---

### Issue: Shopify B2B Company Creation Failing
**Severity:** 🟠 HIGH
**First Seen:** 2025-11-27
**Status:** RESOLVED

**Symptoms:**
- New trial customers not getting Shopify accounts
- hubspot-to-shopify-sync function errors
- Error: "Company already exists"

**Root Cause:**
- Email used as company identifier
- Same person signing up twice
- No deduplication check

**Solution:**
```javascript
// Check for existing company first
async function createShopifyB2BAccount(customer) {
  // Check if company exists
  const existing = await shopifyAdmin.query(`
    query {
      companies(first: 1, query: "email:${customer.email}") {
        edges { node { id } }
      }
    }
  `);

  if (existing.companies.edges.length > 0) {
    // Update existing instead of create
    return updateCompany(existing.companies.edges[0].node.id, customer);
  }

  // Create new
  return createCompany(customer);
}
```

**Prevention:**
- Always check for existing before create
- Use email as unique identifier

---

## 4. RED HILL FRESH

### Issue: WooCommerce REST API Authentication
**Severity:** 🟡 MEDIUM
**First Seen:** 2025-11-30
**Status:** DOCUMENTED (Pre-deployment)

**Symptoms:**
- 401 Unauthorized from WooCommerce API
- Consumer key/secret rejected
- Sync script fails immediately

**Root Cause:**
- WooCommerce requires HTTPS for OAuth
- HTTP sites need query string auth
- Key permissions may be read-only

**Solution:**
```javascript
// WooCommerce auth for HTTPS sites
const WooCommerceAPI = require('@woocommerce/woocommerce-rest-api').default;

const woo = new WooCommerceAPI({
  url: 'https://redhillfresh.com.au',
  consumerKey: WC_CONSUMER_KEY,
  consumerSecret: WC_CONSUMER_SECRET,
  version: 'wc/v3',
  queryStringAuth: false // true for HTTP sites
});
```

**Prevention:**
- Verify key has Read/Write permissions in WP Admin
- Test connection before bulk operations

---

## 5. SHARED / INFRASTRUCTURE

### Issue: Supabase Connection Pool Exhaustion
**Severity:** 🔴 CRITICAL
**First Seen:** 2025-11-18
**Status:** RESOLVED

**Symptoms:**
- "too many connections" error
- All database operations failing
- Multiple services affected simultaneously

**Root Cause:**
- Default connection pool size = 10
- Multiple scripts running concurrently
- Connections not being released

**Solution:**
```javascript
// Use connection pooler (port 6543) for transient connections
const connectionString = process.env.DATABASE_URL.replace(':5432', ':6543');

// Always release connections
const client = await pool.connect();
try {
  await client.query('SELECT ...');
} finally {
  client.release(); // ALWAYS release
}

// Set pool limits
const pool = new Pool({
  connectionString,
  max: 5, // Limit concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
```

**Prevention:**
- Use connection pooler for all scripts
- Monitor active connections
- Set reasonable pool limits

---

### Issue: RLS Policy Blocking Service Role
**Severity:** 🟠 HIGH
**First Seen:** 2025-11-19
**Status:** RESOLVED

**Symptoms:**
- Service role queries return empty
- RLS enabled but no service policy
- Automation scripts see no data

**Root Cause:**
- RLS enabled without service_role bypass
- Default deny-all policy
- Service role needs explicit USING(true)

**Solution:**
```sql
-- Always add service role bypass when enabling RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Service role bypass (required for automation)
CREATE POLICY "service_role_all" ON my_table
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Then add restrictive policies for other roles
CREATE POLICY "authenticated_read" ON my_table
FOR SELECT TO authenticated
USING (user_id = auth.uid());
```

**Prevention:**
- Template includes service_role policy
- Test queries as service_role after RLS enable

---

### Issue: n8n Workflow Credential Mismatch
**Severity:** 🟡 MEDIUM
**First Seen:** 2025-11-21
**Status:** RESOLVED

**Symptoms:**
- Imported workflow shows "Credential not found"
- Workflow fails on first node
- Credential ID doesn't match

**Root Cause:**
- Workflow JSON has credential IDs from source environment
- Target n8n has different credential IDs
- Import doesn't auto-map credentials

**Solution:**
```javascript
// After import, update credential IDs
const workflow = await n8nClient.getWorkflow(workflowId);

// Map old IDs to new IDs
const credentialMap = {
  'old-supabase-id': 'new-supabase-id',
  'old-hubspot-id': 'new-hubspot-id'
};

// Update all nodes
workflow.nodes.forEach(node => {
  if (node.credentials) {
    Object.keys(node.credentials).forEach(type => {
      const oldId = node.credentials[type].id;
      if (credentialMap[oldId]) {
        node.credentials[type].id = credentialMap[oldId];
      }
    });
  }
});

await n8nClient.updateWorkflow(workflowId, workflow);
```

**Prevention:**
- Document credential mapping per environment
- Create credential setup script for new environments

---

## Issue Template

```markdown
### Issue: [Title]
**Severity:** 🔴/🟠/🟡/🟢
**First Seen:** YYYY-MM-DD
**Status:** ACTIVE/RESOLVED/DOCUMENTED

**Symptoms:**
- [What user/system sees]

**Root Cause:**
- [Why it happens]

**Solution:**
[Code or steps to fix]

**Prevention:**
- [How to prevent recurrence]
```

---

## Quick Reference: Common Errors

| Error Message | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `429 Too Many Requests` | Rate limiting | Add delays, use rate limiter |
| `401 Unauthorized` | Bad credentials | Verify vault credentials |
| `403 Forbidden` | Permissions/rate limit | Check scopes, add delays |
| `ECONNREFUSED` | Service down | Check service status |
| `EAI_AGAIN` | DNS resolution | Use IP or wait/retry |
| `invalid_grant` | OAuth token expired | Re-authenticate |
| `duplicate key` | Unique constraint | Check for existing record |
| `too many connections` | Pool exhausted | Use pooler, release connections |
| `relation does not exist` | Table not deployed | Run migration |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-01
**Total Issues Documented:** 15
