# Deploy Fixed Smartlead → HubSpot Workflow

**Critical Fix:** Counter increment logic now works correctly

---

## What Was Fixed

### Before (Broken) ❌
```
Webhook → Route → Update HubSpot
                   ↓
                   Counter = 1 (always resets!)
```

The workflow was trying to reference `$json.properties?.email_open_count` which **doesn't exist** in the Smartlead webhook payload. Every event would reset the counter to 1.

### After (Fixed) ✅
```
Webhook → Route → Fetch Current Counter → Increment → Update HubSpot
                   ↓
                   Counter = 5 (current value)
                   ↓
                   Counter = 6 (incremented!)
```

Now the workflow **fetches the current HubSpot value first**, then increments it properly.

---

## Changes Made

### 1. Added "Fetch" Nodes Before Updates

**For EMAIL_SENT:**
- Added: "Fetch Current Email Count" node
- Fetches: `outreach_email_count` from HubSpot
- Then increments in: "Update: Email Sent"

**For EMAIL_OPEN:**
- Added: "Fetch Current Open Count" node
- Fetches: `email_open_count` from HubSpot
- Then increments in: "Update: Email Opened"

**For EMAIL_LINK_CLICK:**
- Added: "Fetch Current Click Count" node
- Fetches: `email_click_count` from HubSpot
- Then increments in: "Update: Link Clicked"

### 2. Updated Counter Logic

**Old (Broken):**
```json
"email_open_count": {{ ($json.properties?.email_open_count || 0) + 1 }}
```

**New (Fixed):**
```json
"email_open_count": {{ (parseInt($node['Fetch Current Open Count'].json.properties.email_open_count) || 0) + 1 }}
```

**Key Changes:**
- References `$node['Fetch Current Open Count'].json` instead of `$json.properties`
- Uses `parseInt()` to ensure numeric value
- Defaults to 0 if property doesn't exist yet
- Then adds 1 to increment

### 3. Reply & Unsubscribe (No Changes Needed)

These events don't need counters, so they weren't affected by the bug:
- **Email Reply:** Just sets `last_email_reply_date` and status
- **Unsubscribe:** Just sets boolean flag and date

---

## Deployment Steps

### Step 1: Backup Current Workflow

Before deploying, backup your existing workflow:

1. Log into n8n: `https://automation.growthcohq.com`
2. Open: "Smartlead → HubSpot Outreach Tracking"
3. Click: **⋮ (menu) → Duplicate**
4. Rename duplicate to: "Smartlead HubSpot Sync BACKUP [DATE]"

### Step 2: Import Fixed Workflow

**Option A: Import as New Workflow (Recommended)**

1. In n8n, click **"+ Add workflow"**
2. Click **"⋮ (menu) → Import from File"**
3. Select: `infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json`
4. Workflow imports with name: "Smartlead → HubSpot Outreach Tracking (FIXED)"

**Option B: Replace Existing Workflow**

1. Open existing "Smartlead → HubSpot Outreach Tracking" workflow
2. Delete all nodes
3. Click **"⋮ (menu) → Import from File"**
4. Select: `smartlead-hubspot-sync-FIXED.json`
5. Save workflow

### Step 3: Configure Credentials

The workflow needs two credentials configured:

**1. HubSpot API Credential**
- Type: HTTP Header Auth
- Name: "HubSpot API"
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_HUBSPOT_ACCESS_TOKEN`

**2. Supabase PostgreSQL Credential**
- Type: Postgres
- Name: "Supabase"
- Host: Extract from `SUPABASE_URL`
- Database: `postgres`
- User: `postgres`
- Password: Use `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Test the Workflow

**Manual Test:**

1. Click **"Execute Workflow"** button
2. Send test webhook payload:

```json
{
  "event_type": "EMAIL_OPEN",
  "campaign_id": "2613831",
  "campaign_name": "Test Campaign",
  "lead_id": "test-lead-123",
  "lead_email": "test@example.com",
  "lead_first_name": "Test",
  "lead_last_name": "User",
  "timestamp": "2025-11-21T10:00:00Z",
  "data": {}
}
```

3. Watch execution flow - should see:
   - ✅ Parse Webhook Data
   - ✅ Check HubSpot Contact
   - ✅ Contact found or created
   - ✅ Event routed to "EMAIL_OPEN"
   - ✅ **Fetch Current Open Count** ← NEW!
   - ✅ Update: Email Opened (with incremented value)
   - ✅ Log to Supabase

4. Check HubSpot contact:
   - First test: `email_open_count = 1`
   - Second test: `email_open_count = 2` ✅ Incrementing!
   - Third test: `email_open_count = 3` ✅ Working!

### Step 5: Update Smartlead Webhook URL

1. Log into Smartlead: `https://smartlead.ai`
2. Go to: **Settings → Integrations → Webhooks**
3. Set webhook URL to: `https://automation.growthcohq.com/webhook/smartlead-webhook`
4. Enable event types:
   - ✅ EMAIL_SENT
   - ✅ EMAIL_OPEN
   - ✅ EMAIL_LINK_CLICK
   - ✅ EMAIL_REPLY
   - ✅ LEAD_UNSUBSCRIBED
5. Save configuration

### Step 6: Monitor Initial Sync

Watch the first few webhook events:

```bash
# Check n8n execution history
# Look for successful executions with proper counter increments

# Check HubSpot contact
# Verify counters are incrementing: 1, 2, 3, 4...

# Check Supabase logs
psql $SUPABASE_URL -c "
SELECT
  event_type,
  COUNT(*) as count,
  MAX(synced_at) as last_sync
FROM smartlead_sync_log
WHERE synced_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY count DESC;
"
```

### Step 7: Deactivate Old Workflow

Once confirmed working:

1. Open old "Smartlead → HubSpot Outreach Tracking" workflow
2. Click **"Active"** toggle to deactivate
3. Keep as backup for 7 days
4. Activate new FIXED workflow

---

## Verification Checklist

After deployment, verify these metrics are working:

### HubSpot Contact Properties

Pick a test contact and trigger multiple events, then check:

```
✅ outreach_email_count: 1 → 2 → 3 → 4 (incrementing)
✅ email_open_count: 1 → 2 → 3 (incrementing)
✅ email_click_count: 1 → 2 (incrementing)
✅ last_outreach_email_sent: [timestamp]
✅ last_email_open_date: [timestamp]
✅ last_email_click_date: [timestamp]
✅ last_email_reply_date: [timestamp]
✅ cold_outreach_status: contacted → engaged → replied
✅ smartlead_campaign_id: [campaign ID]
✅ smartlead_campaign_name: [campaign name]
```

### Supabase Sync Log

```sql
-- Check sync success rate
SELECT
  sync_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM smartlead_sync_log
WHERE synced_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_status;

-- Expected: 100% success
```

### n8n Execution History

- ✅ All executions showing "Success"
- ✅ No errors in logs
- ✅ Execution time < 5 seconds per webhook
- ✅ "Fetch Current [X] Count" nodes executing before updates

---

## Troubleshooting

### Issue: Counter Still Not Incrementing

**Check:**
1. Verify "Fetch" nodes are executing BEFORE "Update" nodes
2. Check n8n execution log - does `$node['Fetch Current Open Count'].json.properties` exist?
3. Verify HubSpot API credential has correct token
4. Check HubSpot property exists: `email_open_count` (number type)

**Debug:**
Add a "Set" node after "Fetch" to inspect data:
```json
{
  "debug_current_value": "={{ $json.properties?.email_open_count }}",
  "debug_incremented": "={{ (parseInt($json.properties?.email_open_count) || 0) + 1 }}"
}
```

### Issue: "Fetch" Node Returns Error

**Possible Causes:**
- Contact doesn't exist in HubSpot yet (check "Create Contact" node)
- Invalid contact ID (check merge logic)
- HubSpot API rate limit (429 error)
- Invalid credential

**Fix:**
- Ensure contact is created/found before routing to event handlers
- Check credential configuration
- Add retry logic if hitting rate limits

### Issue: Webhook Not Firing

**Check:**
1. Smartlead webhook URL is correct
2. Webhook is enabled in Smartlead settings
3. n8n workflow is **Active** (not just saved)
4. Firewall/proxy not blocking webhook endpoint

**Test:**
Use curl to manually trigger webhook:
```bash
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_OPEN",
    "lead_email": "test@example.com",
    "campaign_id": "123",
    "timestamp": "2025-11-21T10:00:00Z"
  }'
```

---

## Performance Impact

### Additional API Calls

The fixed workflow makes **one extra HubSpot API call** per counter event:

**Before:**
- 1 API call: Update contact

**After:**
- 1 API call: Fetch current counter
- 1 API call: Update contact
- **Total: 2 API calls**

### Events Without Counters (No Change)

- EMAIL_REPLY: Still 1 API call
- LEAD_UNSUBSCRIBED: Still 1 API call

### Expected Load

For 1,000 webhook events per day:
- EMAIL_SENT: 1,000 events × 2 calls = 2,000 API calls
- EMAIL_OPEN: ~0 events × 2 calls = 0 API calls (tracking disabled)
- EMAIL_CLICK: ~0 events × 2 calls = 0 API calls (tracking disabled)
- EMAIL_REPLY: ~29 events × 1 call = 29 API calls
- **Total: ~2,029 API calls/day**

HubSpot API limits:
- Free: 100 calls per 10 seconds
- Pro: 150 calls per 10 seconds
- Well within limits ✅

---

## Rollback Plan

If issues occur:

1. **Deactivate FIXED workflow**
2. **Reactivate BACKUP workflow**
3. Check Supabase logs to see where sync failed
4. Investigate issue in test environment
5. Fix and redeploy

**Data Safety:**
- No data is lost during rollback
- Supabase maintains event history
- HubSpot contact data preserved
- Counters may be slightly inaccurate but can be recalculated

---

## Long-Term Monitoring

### Daily Checks (First Week)

```sql
-- Check sync success rate
SELECT
  DATE(synced_at) as date,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN sync_status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM smartlead_sync_log
WHERE synced_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(synced_at)
ORDER BY date DESC;
```

### Weekly Report

```sql
-- Campaign engagement summary
SELECT
  campaign_name,
  COUNT(DISTINCT lead_id) as unique_leads,
  SUM(CASE WHEN event_type = 'EMAIL_SENT' THEN 1 ELSE 0 END) as emails_sent,
  SUM(CASE WHEN event_type = 'EMAIL_OPEN' THEN 1 ELSE 0 END) as opens,
  SUM(CASE WHEN event_type = 'EMAIL_REPLY' THEN 1 ELSE 0 END) as replies
FROM smartlead_sync_log
WHERE synced_at > NOW() - INTERVAL '7 days'
GROUP BY campaign_name;
```

---

## Summary

### What Changed
- ✅ Added 3 new "Fetch" nodes to get current counter values
- ✅ Updated 3 "Update" nodes to use fetched values
- ✅ Counter increment logic now works correctly
- ✅ No changes to Reply/Unsubscribe handlers

### Impact
- ✅ Counters will now accumulate properly: 1, 2, 3, 4...
- ✅ Historical engagement data will be accurate
- ✅ HubSpot dashboards will show correct metrics
- ⚠️ 2x API calls for counter events (still well within limits)

### Next Steps
1. Deploy fixed workflow
2. Test with sample webhook
3. Monitor for 24 hours
4. Verify counters incrementing
5. Deactivate old workflow

**Deployment Time:** 15 minutes
**Testing Time:** 30 minutes
**Total Time:** 45 minutes

---

**Status:** ✅ Ready to Deploy
**Risk:** Low (easily reversible)
**Impact:** High (fixes critical counter bug)
