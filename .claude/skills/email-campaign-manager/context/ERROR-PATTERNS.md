# Email Error Patterns & Solutions

Common email delivery errors and their solutions.

## Gmail OAuth2 Errors

### `invalid_grant` - Token Revoked or Expired

**Symptoms:**
```json
{
  "error": "invalid_grant",
  "error_description": "Token has been expired or revoked."
}
```

**Causes:**
1. User revoked app access in Google Account settings
2. Refresh token expired (6 months inactive)
3. Password changed on Google account
4. OAuth consent screen settings changed

**Solution:**
```bash
# Re-run OAuth flow for affected business
npx tsx scripts/gmail-oauth-flow.ts teelixir

# Update refresh token in .env
TEELIXIR_GMAIL_REFRESH_TOKEN=new_token_here

# Restart affected services
```

### `access_denied` - Insufficient Permissions

**Symptoms:**
```json
{
  "error": "access_denied",
  "error_description": "Access blocked: This app's request is invalid"
}
```

**Causes:**
1. Gmail API not enabled in Google Cloud Console
2. App not verified for production
3. Scopes changed after initial authorization

**Solution:**
1. Enable Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
2. Verify OAuth consent screen
3. Re-authorize with correct scopes

### `quota_exceeded` - Rate Limit Hit

**Symptoms:**
```json
{
  "error": {
    "code": 429,
    "message": "Rate Limit Exceeded"
  }
}
```

**Causes:**
1. Sending too many emails per day (limit: ~500/day for regular accounts)
2. Too many API requests per second

**Solution:**
```typescript
// Implement exponential backoff
async function sendWithRetry(email, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendGmailEmail(email);
    } catch (error) {
      if (error.code === 429) {
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}

// Add delay between sends
await sleep(1000); // 1 second between emails
```

---

## Smartlead Errors

### `401 Unauthorized` - Invalid API Key

**Symptoms:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

**Solution:**
1. Verify API key in Smartlead dashboard
2. Update `SMARTLEAD_API_KEY` in .env
3. Check for extra whitespace in key

### `429 Too Many Requests` - Rate Limited

**Symptoms:**
```
429 Too Many Requests
```

**Solution:**
```typescript
// Implement request queuing
const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });
await queue.add(() => smartleadApi.createCampaign(data));
```

### `400 Bad Request` - Invalid Lead Data

**Symptoms:**
```json
{
  "error": "Bad Request",
  "message": "Invalid email format"
}
```

**Common Issues:**
- Email contains spaces
- Missing required fields
- Duplicate email in campaign

**Solution:**
```typescript
// Pre-validate leads before upload
function validateLead(lead) {
  const email = lead.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    throw new Error(`Invalid email: ${lead.email}`);
  }
  return { ...lead, email };
}
```

---

## Bounce Errors

### Hard Bounces (Permanent)

| Code | Reason | Action |
|------|--------|--------|
| 550 | User unknown | Suppress permanently |
| 551 | User not local | Suppress permanently |
| 552 | Mailbox full | Soft bounce (retry later) |
| 553 | Mailbox name invalid | Suppress permanently |
| 554 | Transaction failed | Investigate |

**Pattern Detection:**
```typescript
function classifyBounce(reason: string): 'hard' | 'soft' {
  const hardPatterns = [
    'user unknown', 'not exist', 'invalid address',
    'no such user', 'rejected', 'does not exist'
  ];

  const lower = reason.toLowerCase();
  return hardPatterns.some(p => lower.includes(p)) ? 'hard' : 'soft';
}
```

### Soft Bounces (Temporary)

| Code | Reason | Action |
|------|--------|--------|
| 421 | Service unavailable | Retry in 1 hour |
| 450 | Mailbox busy | Retry in 1 hour |
| 451 | Local error | Retry in 1 hour |
| 452 | Insufficient storage | Retry in 24 hours |

**Retry Logic:**
```typescript
async function handleSoftBounce(email: string, retryCount: number) {
  if (retryCount >= 3) {
    // After 3 failures, suppress for 30 days
    await addToSuppressionList(email, 'soft', 30);
    return;
  }

  // Schedule retry
  const delay = Math.pow(2, retryCount) * 3600000; // Exponential backoff in hours
  await scheduleRetry(email, delay);
}
```

---

## Deliverability Issues

### Low Open Rates (<10%)

**Possible Causes:**
1. Subject lines not engaging
2. Sender reputation issues
3. Landing in spam folder
4. List quality issues

**Diagnostic Steps:**
```sql
-- Check engagement by subject line pattern
SELECT
  SUBSTRING(subject, 1, 30) as subject_preview,
  COUNT(*) as sent,
  COUNT(CASE WHEN opened THEN 1 END) as opens,
  ROUND(COUNT(CASE WHEN opened THEN 1 END)::numeric / COUNT(*) * 100, 2) as open_rate
FROM smartlead_emails
GROUP BY SUBSTRING(subject, 1, 30)
ORDER BY sent DESC;
```

**Solutions:**
1. A/B test subject lines
2. Warm up sender domain
3. Clean list (remove unengaged)
4. Check SPF/DKIM/DMARC records

### High Bounce Rate (>5%)

**Possible Causes:**
1. Old/stale email list
2. Purchased lists
3. Role-based emails (info@, admin@)
4. Typos in email collection

**Diagnostic Steps:**
```sql
-- Analyze bounce patterns by domain
SELECT
  SPLIT_PART(email, '@', 2) as domain,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
  ROUND(COUNT(CASE WHEN status = 'bounced' THEN 1 END)::numeric / COUNT(*) * 100, 2) as bounce_rate
FROM smartlead_leads
GROUP BY SPLIT_PART(email, '@', 2)
HAVING COUNT(*) > 10
ORDER BY bounce_rate DESC;
```

**Solutions:**
1. Validate emails before sending (MX check)
2. Remove role-based emails
3. Use double opt-in for new signups
4. Regular list hygiene

### Spam Complaints

**Warning Signs:**
- Complaint rate > 0.1%
- Sudden drop in open rates
- Emails going to spam folder

**Immediate Actions:**
1. Stop current campaigns
2. Review recent content for spam triggers
3. Check sender reputation
4. Remove complaining addresses

**Prevention:**
```html
<!-- Always include unsubscribe link -->
<a href="{{unsubscribe_url}}">Unsubscribe</a>

<!-- Include physical address -->
<p>Teelixir Pty Ltd, 123 Example St, Melbourne VIC 3000</p>
```

---

## Database Errors

### Foreign Key Violations

**Symptom:**
```
ERROR: insert or update on table "smartlead_leads" violates foreign key constraint
```

**Solution:**
```typescript
// Ensure campaign exists before inserting leads
const { data: campaign } = await supabase
  .from('smartlead_campaigns')
  .select('campaign_id')
  .eq('campaign_id', campaignId)
  .single();

if (!campaign) {
  // Create campaign first
  await supabase.from('smartlead_campaigns').insert({
    campaign_id: campaignId,
    campaign_name: 'New Campaign',
    status: 'draft'
  });
}
```

### Unique Constraint Violations

**Symptom:**
```
ERROR: duplicate key value violates unique constraint "smartlead_leads_campaign_id_email_key"
```

**Solution:**
```typescript
// Use upsert instead of insert
await supabase.from('smartlead_leads').upsert({
  campaign_id: campaignId,
  email: email,
  // ... other fields
}, {
  onConflict: 'campaign_id,email',
  ignoreDuplicates: true
});
```

---

## Quick Reference: Error → Solution

| Error | Category | Quick Fix |
|-------|----------|-----------|
| `invalid_grant` | Gmail OAuth | Re-run OAuth flow |
| `401 Unauthorized` | Smartlead | Check API key |
| `429 Rate Limit` | Any | Implement backoff |
| `550 User unknown` | Bounce | Suppress email |
| `Connection refused` | Network | Check firewall/DNS |
| `Duplicate key` | Database | Use upsert |
| Low open rate | Deliverability | Check subject lines |
| High bounce rate | List quality | Validate list |
