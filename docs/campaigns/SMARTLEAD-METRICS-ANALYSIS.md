# Smartlead Metrics Tracking Analysis

**Date:** November 21, 2025
**Status:** ⚠️ ISSUES IDENTIFIED - FIXES REQUIRED

---

## Executive Summary

There are **two critical issues** preventing proper metrics tracking between Smartlead, Supabase, and HubSpot:

1. **🔴 Critical: Counter Increment Logic Broken** - n8n workflow cannot properly increment counters
2. **🟡 Warning: Smartlead Open/Click Tracking at 0%** - No engagement events being captured

---

## Issue 1: Counter Increment Logic (Critical)

### Problem

The n8n workflow attempts to increment counters like this:

```json
{
  "properties": {
    "email_open_count": {{ ($json.properties?.email_open_count || 0) + 1 }}
  }
}
```

**This will NOT work** because:
- `$json.properties?.email_open_count` references data from the **webhook payload**
- Smartlead webhooks **do not include** the current HubSpot counter values
- Result: Counter gets set to `1` every time, never increments properly

### Current Workflow Flow

```
Smartlead Webhook → Parse Event → Route by Type → Update HubSpot
                                                    ↑
                                                    Missing: Fetch current value!
```

### Required Fix

The workflow needs to be restructured:

```
Smartlead Webhook → Parse Event → Route by Type → Fetch HubSpot Contact
                                                    ↓
                                                  Get Current Counter
                                                    ↓
                                                  Increment + Update
```

### Impact

**Current Behavior:**
- `email_open_count` always shows `1` (not actual count)
- `email_click_count` always shows `1` (not actual count)
- `outreach_email_count` always shows `1` (not actual count)

**Expected Behavior:**
- Counters should increment: 1, 2, 3, 4... for each event
- Historical data should accumulate over time

### Files Affected

- `/root/master-ops/infra/n8n-workflows/templates/smartlead-hubspot-sync.json`
  - Lines ~320: Email Open handler
  - Lines ~352: Email Click handler
  - Lines ~283: Email Sent handler

---

## Issue 2: Smartlead Open/Click Tracking (Warning)

### Problem

Validation results show:
```
Opens: 0 (unique: 0)       → 0.0% open rate
Clicks: 0 (unique: 0)      → 0.0% click rate
Replies: 31                → 2.9% reply rate ✓
```

**This indicates:**
- Smartlead is **NOT tracking** email opens
- Smartlead is **NOT tracking** link clicks
- Reply tracking **IS working** (31 replies captured)

### Possible Causes

1. **Tracking Pixels Disabled**
   - Smartlead account settings may have open tracking disabled
   - Check: Settings → Email Tracking → Open Tracking

2. **Email Clients Blocking Pixels**
   - Modern email clients (Apple Mail, Gmail) block tracking pixels by default
   - Privacy features prevent open tracking

3. **Plain Text Emails**
   - Campaign settings show: `"send_as_plain_text": true`
   - Plain text emails **cannot track opens** (no HTML, no pixels)

4. **Link Tracking Disabled**
   - Click tracking may be disabled in campaign settings
   - Check individual campaign configurations

### Impact on Integration

**If Smartlead is not capturing opens/clicks:**
- Webhooks for `EMAIL_OPEN` and `EMAIL_LINK_CLICK` **will never fire**
- HubSpot counters `email_open_count` and `email_click_count` **will stay at 0**
- Supabase engagement table **will have no open/click records**
- Only replies will be tracked (which IS working - 2.9% reply rate)

**This may be acceptable if:**
- You're focusing on reply tracking (the most valuable metric)
- Privacy-conscious outreach is preferred
- Plain text emails are your strategy

---

## Data Flow Analysis

### Current Implementation

```
┌─────────────┐
│  Smartlead  │
│   Campaign  │
└──────┬──────┘
       │
       │ Webhook Events:
       │ • EMAIL_SENT ✓
       │ • EMAIL_OPEN ❌ (0%)
       │ • EMAIL_LINK_CLICK ❌ (0%)
       │ • EMAIL_REPLY ✓
       │ • LEAD_UNSUBSCRIBED ✓
       │
       ▼
┌─────────────┐
│  n8n Flow   │ ⚠️ Broken counter increment
└──────┬──────┘
       │
       ├───────────────┬───────────────┐
       ▼               ▼               ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Supabase │    │ HubSpot  │    │   Logs   │
│  ✓ Store │    │ ⚠️ Wrong │    │  ✓ Track │
│  Events  │    │  Counters│    │          │
└──────────┘    └──────────┘    └──────────┘
```

### Supabase: ✅ Working Correctly

**What's Working:**
- Engagement events stored in `smartlead_engagement` table
- Campaign data tracked in `smartlead_campaigns`
- Lead data stored in `smartlead_leads`
- Email sends recorded in `smartlead_emails`
- Views aggregate data correctly

**Example Query:**
```sql
SELECT
  campaign_name,
  total_leads,
  unique_opens,
  unique_clicks,
  unique_replies,
  open_rate,
  reply_rate
FROM v_smartlead_campaign_performance
WHERE campaign_id = '2613831';
```

**Expected Result:**
```
campaign_name: All Beauty Leads 2025
total_leads: 1075
unique_opens: 0        ← No data from Smartlead
unique_clicks: 0       ← No data from Smartlead
unique_replies: 31     ← Working!
open_rate: 0.0%
reply_rate: 2.9%       ← Accurate!
```

### HubSpot: ⚠️ Needs Fixing

**What's Working:**
- Contact properties defined correctly
- Date fields updated (last_email_open_date, etc.)
- Status transitions working
- Campaign ID/name stored

**What's Broken:**
- Counter fields NOT incrementing properly
- Always show 1 or 0, never accumulate

**Properties Affected:**
```
✓ cold_outreach_status         (enumeration - working)
✓ smartlead_campaign_id        (string - working)
✓ smartlead_campaign_name      (string - working)
✓ first_outreach_date          (datetime - working)
✓ last_email_open_date         (datetime - working)
✓ last_email_click_date        (datetime - working)
✓ last_email_reply_date        (datetime - working)
⚠️ outreach_email_count         (number - BROKEN)
⚠️ email_open_count             (number - BROKEN)
⚠️ email_click_count            (number - BROKEN)
✓ unsubscribed_from_outreach   (boolean - working)
```

---

## Recommended Fixes

### Fix 1: Update n8n Workflow to Fetch Current Values

**Required Changes to Each Event Handler:**

#### Before (Broken):
```json
{
  "name": "Update: Email Opened",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.hubapi.com/crm/v3/objects/contacts/{{ $json.contact_id }}",
    "jsonBody": {
      "properties": {
        "email_open_count": {{ ($json.properties?.email_open_count || 0) + 1 }}
      }
    }
  }
}
```

#### After (Fixed):
```json
[
  {
    "name": "Fetch Contact Data",
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "method": "GET",
      "url": "https://api.hubapi.com/crm/v3/objects/contacts/{{ $json.contact_id }}?properties=email_open_count",
      "authentication": "headerAuth",
      "headerAuth": {
        "name": "Authorization",
        "value": "Bearer {{ $credentials.hubspotToken }}"
      }
    }
  },
  {
    "name": "Update: Email Opened",
    "type": "n8n-nodes-base.httpRequest",
    "parameters": {
      "method": "PATCH",
      "url": "https://api.hubapi.com/crm/v3/objects/contacts/{{ $json.contact_id }}",
      "jsonBody": {
        "properties": {
          "last_email_open_date": "{{ $json.timestamp }}",
          "email_open_count": {{ (parseInt($node["Fetch Contact Data"].json.properties.email_open_count) || 0) + 1 }},
          "cold_outreach_status": "engaged"
        }
      }
    }
  }
]
```

**Key Changes:**
1. Add "Fetch Contact Data" node **before** each update
2. GET request to fetch current property values
3. Reference fetched data: `$node["Fetch Contact Data"].json.properties.email_open_count`
4. Parse to integer and increment

**Apply to:**
- EMAIL_SENT handler (outreach_email_count)
- EMAIL_OPEN handler (email_open_count)
- EMAIL_LINK_CLICK handler (email_click_count)

### Fix 2: Enable Smartlead Tracking (If Desired)

**Option A: Enable Open/Click Tracking**

1. Log into Smartlead account
2. Navigate to Settings → Email Tracking
3. Enable:
   - ✓ Open Tracking
   - ✓ Click Tracking
4. Update existing campaigns:
   - Edit each campaign
   - Change "Send as Plain Text" to **false** (enable HTML)
   - Save changes

**Option B: Accept Reply-Only Tracking**

If you prefer privacy-conscious outreach:
- Keep plain text emails
- Keep tracking disabled
- Focus on reply tracking (which is working perfectly)
- 2.9% reply rate is excellent!

### Fix 3: Alternative - Use Supabase as Source of Truth

Instead of incrementing in n8n, query Supabase for counts:

**Add Supabase Query Node:**
```json
{
  "name": "Get Engagement Counts",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "query": "SELECT COUNT(*) as open_count FROM smartlead_engagement WHERE lead_id = $1 AND event_type = 'EMAIL_OPEN'",
    "parameters": ["{{ $json.lead_id }}"]
  }
}
```

**Then Update HubSpot:**
```json
{
  "properties": {
    "email_open_count": {{ $node["Get Engagement Counts"].json.open_count }}
  }
}
```

**Pros:**
- Supabase is source of truth
- No risk of lost increments
- Can recalculate from history

**Cons:**
- Extra database query per webhook
- Slightly slower
- More complex workflow

---

## Testing Plan

### Test 1: Verify Counter Increment

1. Deploy fixed n8n workflow
2. Send test email from Smartlead
3. Trigger open event (if tracking enabled)
4. Check HubSpot contact:
   ```
   First open:  email_open_count = 1
   Second open: email_open_count = 2
   Third open:  email_open_count = 3
   ```

### Test 2: Verify Supabase Storage

```sql
-- Check engagement events stored
SELECT event_type, COUNT(*)
FROM smartlead_engagement
WHERE lead_id = 'test-lead-id'
GROUP BY event_type;

-- Expected:
-- EMAIL_SENT: 1
-- EMAIL_OPEN: 3 (if tracking enabled)
-- EMAIL_REPLY: 1 (if replied)
```

### Test 3: Verify View Aggregation

```sql
SELECT * FROM v_smartlead_campaign_performance
WHERE campaign_id = 'test-campaign-id';

-- Verify counts match individual event counts
```

---

## Impact Assessment

### If Left Unfixed

**High Impact:**
- ❌ Cannot track engagement trends over time
- ❌ Reporting dashboards show incorrect data
- ❌ Unable to identify highly engaged leads
- ❌ Metrics for outreach effectiveness are wrong

**Medium Impact:**
- ⚠️ Supabase has correct data, but HubSpot doesn't
- ⚠️ Data inconsistency between systems
- ⚠️ Manual queries needed to get accurate counts

**Low Impact:**
- ✓ Date fields still work (last_email_open_date, etc.)
- ✓ Status transitions still work
- ✓ Reply tracking fully functional

### If Fixed

**Benefits:**
- ✅ Accurate cumulative counters in HubSpot
- ✅ Proper lead scoring based on engagement
- ✅ Reliable reporting and dashboards
- ✅ Data consistency across systems
- ✅ Historical trend analysis possible

---

## Recommended Action Plan

### Phase 1: Immediate Fix (Critical) 🔴
**Timeline:** 1 hour

1. Update n8n workflow to fetch current counter values
2. Test with manual webhook trigger
3. Verify counters increment correctly
4. Deploy to production

**Files to Update:**
- `infra/n8n-workflows/templates/smartlead-hubspot-sync.json`

### Phase 2: Enable Tracking (Optional) 🟡
**Timeline:** 30 minutes

1. Review Smartlead account settings
2. Enable open/click tracking (if desired)
3. Update campaign settings (disable plain text)
4. Test with sample campaign

### Phase 3: Validation (Required) ✅
**Timeline:** 1 day monitoring

1. Monitor webhook events for 24 hours
2. Verify counter increments in HubSpot
3. Check Supabase for consistency
4. Create test report

---

## Summary

| Component | Status | Issue | Priority |
|-----------|--------|-------|----------|
| Supabase Schema | ✅ Working | None | - |
| Supabase Views | ✅ Working | None | - |
| HubSpot Properties | ✅ Defined | None | - |
| n8n Counter Logic | ❌ Broken | Not fetching current values | **CRITICAL** |
| Smartlead Open Tracking | ⚠️ Disabled | 0% open rate | Medium |
| Smartlead Click Tracking | ⚠️ Disabled | 0% click rate | Medium |
| Smartlead Reply Tracking | ✅ Working | None | - |

**Overall Status:** 🟡 Partially Functional - Requires Fixes

**Critical Path:**
1. Fix n8n counter increment logic ← **Do this first**
2. Test and validate
3. Optionally enable Smartlead tracking

---

**Next Step:** Update n8n workflow with proper counter increment logic
