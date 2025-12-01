# Email Campaign Troubleshooting Playbook

Quick reference for diagnosing and fixing common email issues.

## Decision Tree

```
Email not sending?
├── Check provider health → deliverability-monitor.ts check
│   ├── Gmail OAuth down → Re-run OAuth flow
│   ├── Smartlead down → Check API key
│   └── All healthy → Check campaign config
│
├── Check campaign status
│   ├── Draft → Activate campaign
│   ├── Paused → Resume or investigate why paused
│   └── Active → Check send queue
│
└── Check individual email
    ├── Suppressed → Check suppression reason
    ├── Bounced → Check bounce reason
    └── Pending → Check daily limits/send window
```

---

## Issue: Gmail OAuth Token Expired

**Symptoms:**
- Emails failing with `invalid_grant`
- 401 errors in logs

**Diagnosis:**
```bash
npx tsx .claude/skills/email-campaign-manager/scripts/deliverability-monitor.ts check
```

**Fix:**
```bash
# Re-run OAuth flow
npx tsx scripts/gmail-oauth-flow.ts teelixir

# Follow prompts to authorize
# Copy new refresh token to .env

# Verify fix
npx tsx .claude/skills/email-campaign-manager/scripts/deliverability-monitor.ts check
```

---

## Issue: High Bounce Rate

**Symptoms:**
- Bounce rate > 5%
- Smartlead showing many failures
- Delivery rate dropping

**Diagnosis:**
```sql
-- Check bounce breakdown
SELECT
  bounce_reason,
  COUNT(*) as count
FROM smartlead_emails
WHERE bounced_at IS NOT NULL
  AND sent_at > NOW() - INTERVAL '7 days'
GROUP BY bounce_reason
ORDER BY count DESC;

-- Check problem domains
SELECT
  SPLIT_PART(l.email, '@', 2) as domain,
  COUNT(*) as bounces
FROM smartlead_emails e
JOIN smartlead_leads l ON e.lead_id = l.lead_id
WHERE e.bounced_at IS NOT NULL
GROUP BY SPLIT_PART(l.email, '@', 2)
ORDER BY bounces DESC
LIMIT 10;
```

**Fix:**
```bash
# Process bounces into suppression list
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process

# Clean campaign list
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts clean-list <campaign-id>

# For new campaigns, validate list first
npx tsx .claude/skills/email-campaign-manager/scripts/email-validator.ts leads.csv
```

---

## Issue: Low Open Rates

**Symptoms:**
- Open rate < 10%
- Engagement dropping over sequences

**Diagnosis:**
```sql
-- Check open rates by sequence
SELECT
  sequence_number,
  COUNT(*) as sent,
  COUNT(CASE WHEN e.id IN (
    SELECT DISTINCT lead_id FROM smartlead_engagement WHERE event_type = 'EMAIL_OPEN'
  ) THEN 1 END) as opened
FROM smartlead_emails e
WHERE campaign_id = 'xxx'
GROUP BY sequence_number;

-- Check by subject line
SELECT
  subject,
  COUNT(*) as sent,
  SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opens
FROM campaign_emails
GROUP BY subject;
```

**Fix:**
1. **Subject Line Issues:**
   - Test different subject lines
   - Avoid spam triggers (FREE, URGENT, etc.)
   - Use personalization `{{first_name}}`

2. **Sender Reputation:**
   - Check SPF/DKIM/DMARC records
   - Warm up new sending domains
   - Reduce send volume temporarily

3. **List Quality:**
   - Remove unengaged contacts
   - Verify email addresses are valid
   - Segment by engagement history

---

## Issue: Anniversary Emails Not Sending

**Symptoms:**
- No new entries in `tlx_anniversary_discounts`
- Candidates exist but no sends

**Diagnosis:**
```sql
-- Check if automation is enabled
SELECT * FROM tlx_automation_config WHERE automation_type = 'anniversary_15';

-- Check for candidates
SELECT COUNT(*) FROM v_tlx_anniversary_candidates WHERE send_date <= CURRENT_DATE;

-- Check today's sends
SELECT COUNT(*), status
FROM tlx_anniversary_discounts
WHERE created_at >= CURRENT_DATE
GROUP BY status;

-- Check for errors
SELECT email, error_message, retry_count
FROM tlx_anniversary_discounts
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Fix:**

If automation disabled:
```sql
UPDATE tlx_automation_config
SET enabled = true
WHERE automation_type = 'anniversary_15';
```

If Gmail OAuth issue:
```bash
npx tsx scripts/gmail-oauth-flow.ts teelixir
```

If daily limit reached:
```sql
-- Check today's count
SELECT COUNT(*) FROM tlx_anniversary_discounts
WHERE sent_at >= CURRENT_DATE;
-- If at limit (50), wait until tomorrow
```

If outside send window:
```
Send window: 9AM-7PM AEST
Current Melbourne time must be within window
```

---

## Issue: Smartlead Not Syncing to HubSpot

**Symptoms:**
- Replies in Smartlead but not in HubSpot
- `hubspot_synced_at` is NULL

**Diagnosis:**
```sql
-- Check sync status
SELECT
  status,
  COUNT(*) as total,
  COUNT(hubspot_synced_at) as synced
FROM smartlead_leads
WHERE campaign_id = 'xxx'
GROUP BY status;

-- Check sync failures
SELECT *
FROM smartlead_sync_log
WHERE status = 'failed'
ORDER BY synced_at DESC
LIMIT 10;
```

**Fix:**

If n8n workflow issue:
1. Check n8n dashboard for workflow status
2. Review execution logs
3. Restart workflow if stuck

If HubSpot API issue:
```typescript
// Test HubSpot connection
const response = await fetch('https://api.hubapi.com/contacts/v1/contact/vid/0', {
  headers: { 'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}` }
});
// 401 = invalid key, 403 = insufficient permissions
```

Manual sync:
```sql
-- Mark for re-sync
UPDATE smartlead_leads
SET hubspot_synced_at = NULL
WHERE campaign_id = 'xxx' AND status = 'replied';
```

---

## Issue: Duplicate Emails in Campaign

**Symptoms:**
- Same person receiving multiple emails
- Database constraint violations

**Diagnosis:**
```sql
-- Find duplicates
SELECT email, COUNT(*) as count
FROM smartlead_leads
WHERE campaign_id = 'xxx'
GROUP BY email
HAVING COUNT(*) > 1;
```

**Fix:**
```sql
-- Remove duplicates (keep first)
DELETE FROM smartlead_leads
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY campaign_id, email ORDER BY created_at) as rn
    FROM smartlead_leads
  ) t WHERE rn > 1
);
```

**Prevention:**
```typescript
// Always validate before import
const uniqueEmails = [...new Set(leads.map(l => l.email.toLowerCase()))];
```

---

## Issue: Email Content Not Rendering

**Symptoms:**
- `{{first_name}}` showing literally in emails
- Broken HTML in email clients

**Diagnosis:**
Check template rendering:
```typescript
// Test template
const template = 'Hello {{first_name}}, ...';
const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
console.log(rendered);
```

**Fix:**

For Smartlead:
- Ensure lead data includes all template variables
- Check Smartlead template syntax

For Anniversary/Winback:
- Verify data is passed to email function
- Check MIME encoding is correct

```typescript
// Ensure proper MIME encoding
const mimeMessage = [
  'Content-Type: text/html; charset=utf-8',
  'MIME-Version: 1.0',
  `To: ${to}`,
  `Subject: ${subject}`,
  '',
  htmlBody
].join('\r\n');
```

---

## Emergency Contacts

**Smartlead Issues:**
- Dashboard: https://app.smartlead.ai
- Support: support@smartlead.ai

**Gmail/Google Issues:**
- Admin Console: https://admin.google.com
- API Console: https://console.cloud.google.com

**HubSpot Issues:**
- Dashboard: https://app.hubspot.com
- API Status: https://status.hubspot.com

---

## Quick Commands Reference

```bash
# Health check
npx tsx .claude/skills/email-campaign-manager/scripts/deliverability-monitor.ts check

# Bounce report
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts report 7

# Process bounces
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process

# Campaign analytics
npx tsx .claude/skills/email-campaign-manager/scripts/campaign-analytics.ts all 7

# Check if email suppressed
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts check email@example.com

# Re-run Gmail OAuth
npx tsx scripts/gmail-oauth-flow.ts <business>
```
