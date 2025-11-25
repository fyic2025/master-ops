# Setup Auto-Sync NOW - 10 Minute Guide

**Goal:** Enable automatic Smartlead → HubSpot syncing before tomorrow's blast

**Time:** 10-15 minutes
**Status:** HubSpot credential already created ✅

---

## ✅ WHAT I'VE DONE FOR YOU

1. **Created HubSpot API credential in n8n** ✅
   - Credential ID: `MT202DxaZvLEbrIq`
   - Type: HTTP Header Auth
   - Already configured with your HubSpot token

2. **Prepared workflow file** ✅
   - File: `infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json`
   - 17 nodes configured
   - Counter increment logic fixed

---

## 🚀 WHAT YOU NEED TO DO (10 minutes)

### Step 1: Login to n8n (1 min)

1. Go to: https://automation.growthcohq.com
2. Login with your credentials

### Step 2: Import Workflow (3 min)

1. Click **Workflows** (left sidebar)
2. Click **+ Add workflow** (top right)
3. Click **⋮** (three dots menu) → **Import from File**
4. Select file: `/root/master-ops/infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json`
5. Workflow imports with 17 nodes ✅

### Step 3: Configure Credentials (4 min)

The workflow has two types of nodes that need credentials:

**A. HubSpot Nodes (already done!)**
1. Click any node with red triangle (missing credential)
2. If it's a "HTTP Request" node calling HubSpot:
   - Credential dropdown → Select **"HubSpot API (Auto-created)"**
   - This is the one I just created for you ✅

**B. Supabase/Postgres Nodes**
1. Click any "Postgres" node (database icon)
2. Credential dropdown → Select existing **"Supabase"** credential
   - Should already exist from your other workflows
   - Look for one that works in "Supabase to HubSpot - Lead Metrics Push"

**Quick way to fix all at once:**
1. Click first node with missing credential
2. Select the credential
3. n8n will ask "Apply to all similar nodes?" → Click **YES**
4. Repeat for other credential type

### Step 4: Rename & Activate (1 min)

1. Workflow name (top): Change to **"🚀 Smartlead → HubSpot Auto-Sync"**
2. Click **Active** toggle (top right) → ON
3. Click **Save** (top right)

### Step 5: Get Webhook URL (1 min)

1. Find the first node: "Smartlead Webhook" (webhook icon)
2. Click it
3. Look for **"Webhook URLs"** section
4. Copy the "Production URL"
   - Should be: `https://automation.growthcohq.com/webhook/smartlead-webhook`

---

## 🧪 STEP 6: Test It (3 min)

### Test from terminal:

```bash
curl -X POST https://automation.growthcohq.com/webhook/smartlead-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "EMAIL_SENT",
    "campaign_id": "test-123",
    "campaign_name": "Test Campaign",
    "lead_id": "test-lead",
    "lead_email": "test@example.com",
    "lead_first_name": "Test",
    "lead_last_name": "User",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "data": {
      "email_sequence_number": 1,
      "email_subject": "Test Subject"
    }
  }'
```

**Expected:**
```
{"status":"ok"}
```

or

```
{"webhookId":"...","executionId":"..."}
```

### Check in n8n:

1. Go to **Executions** (left sidebar)
2. You should see a new execution
3. Click it
4. All nodes should be green ✅

### Check in HubSpot:

1. Go to HubSpot Contacts
2. Search for: `test@example.com`
3. Contact should exist with:
   - `outreach_email_count` = 1
   - `smartlead_campaign_name` = "Test Campaign"
   - `cold_outreach_status` = "contacted"

---

## ✅ VERIFICATION CHECKLIST

Before launching tomorrow's blast:

- [ ] Workflow imported to n8n
- [ ] HubSpot credential assigned (auto-created one)
- [ ] Supabase credential assigned (existing one)
- [ ] Workflow activated (toggle ON)
- [ ] Webhook URL obtained
- [ ] Test webhook sent successfully
- [ ] Test execution shows in n8n (all green)
- [ ] Test contact created in HubSpot

---

## 🎯 WHAT HAPPENS AFTER THIS

### Tomorrow When You Launch Smartlead Blast:

```
Smartlead sends email to info@spa.com
    ↓
Smartlead webhook fires: EMAIL_SENT
    ↓
n8n receives webhook (your new workflow)
    ↓
Searches HubSpot for contact: info@spa.com
    ↓
    Found? → Updates contact
    Not found? → Creates contact
    ↓
Sets: outreach_email_count = 1
Sets: smartlead_campaign_name = "Beauty Blast 2025 - Massage & Spa"
Sets: cold_outreach_status = "contacted"
    ↓
Logs event to Supabase smartlead_engagement table
    ↓
DONE ✅
```

### When Lead Opens Email:

```
Lead opens email
    ↓
Smartlead webhook: EMAIL_OPEN
    ↓
n8n: Fetch current open_count from HubSpot (e.g., 0)
    ↓
Increment: 0 + 1 = 1
    ↓
Update HubSpot: email_open_count = 1 ✅
    ↓
Next open:
Fetch: 1 → Increment: 1 + 1 = 2 → Update: 2 ✅
```

**This is the FIX - counters will increment properly now!**

---

## 🚨 TROUBLESHOOTING

### Workflow import fails:
- **Error:** "Invalid JSON"
- **Fix:** Check file path, ensure it's the FIXED version

### Can't find HubSpot credential:
- **Look for:** "HubSpot API (Auto-created)"
- **ID:** MT202DxaZvLEbrIq
- **If missing:** Create new httpHeaderAuth credential:
  - Name: `Authorization`
  - Value: `Bearer YOUR_HUBSPOT_ACCESS_TOKEN`

### Can't find Supabase credential:
- **Look in:** Existing "Supabase to HubSpot - Lead Metrics Push" workflow
- **Copy:** The same Supabase credential used there
- **OR create new:** Postgres credential:
  - Host: `db.qcvfxxsnqvdfmpbcgdni.supabase.co`
  - Database: `postgres`
  - User: `postgres`
  - Password: (from .env SUPABASE_SERVICE_ROLE_KEY)
  - Port: `5432`
  - SSL: Allow

### Test webhook returns error:
- **Check:** Workflow is ACTIVE (toggle on)
- **Check:** All nodes have credentials assigned
- **Try:** Click "Execute Workflow" button in n8n
- **Check:** Execution log for specific error

### Contact not created in HubSpot:
- **Check:** HubSpot credential is valid (test in another node)
- **Check:** Execution log shows which step failed
- **Verify:** Your HubSpot API token has write permissions

---

## 📊 MONITORING AFTER LAUNCH

### Daily Check (Takes 1 min):

1. **Go to n8n Executions**
   - Filter: "Smartlead → HubSpot Auto-Sync"
   - Should see executions for each email event
   - Green = success, Red = error

2. **Check HubSpot**
   - Pick a few contacts from your blast
   - Verify counters incrementing (1 → 2 → 3...)
   - Verify campaign names populated

3. **Check Supabase**
   - Table: `smartlead_engagement`
   - Should see new rows for each event
   - Backup of all activity

---

## 💡 QUICK SUMMARY

**What you're setting up:**
- Real-time sync from Smartlead → HubSpot
- Automatic contact creation/updates
- Proper counter incrementing (the FIX!)
- Event logging to Supabase

**Why you need it:**
- Track all email activity automatically
- No manual data entry
- Accurate engagement metrics
- Full history in HubSpot + Supabase

**Time investment:**
- 10 minutes now = saves hours of manual work later

---

## 🎉 FINAL STEP

Once setup complete, reply here:

**"Auto-sync is active!"**

And I'll give you the final pre-launch checklist for tomorrow's beauty blast.

---

**Let's get this done!** Follow Steps 1-6 above, it'll take 10 minutes.

Questions? Check troubleshooting section or ask.

---

Last Updated: November 21, 2025
Status: HubSpot credential already created, ready for import
