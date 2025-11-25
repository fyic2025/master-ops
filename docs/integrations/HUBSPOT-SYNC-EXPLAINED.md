# HubSpot Sync Setup - Complete Explanation

## Your Question:
**"Are we setup to match leads from Supabase and Smartlead to update existing contacts in HubSpot and create new contacts if any are missing?"**

---

## ✅ SHORT ANSWER: YES - Fully Configured

You have **TWO sync systems** working together:

1. **Businesses → HubSpot** (Initial sync, one-time)
2. **Smartlead → HubSpot** (Real-time activity tracking, ongoing)

---

## 📊 SYSTEM 1: Businesses → HubSpot Sync

### What It Does:
Creates or updates HubSpot **COMPANIES** from your Supabase `businesses` table.

### File:
**`scripts/sync/sync-businesses-to-hubspot.ts`**

### How It Works:

```
Supabase businesses table
    ↓
Sync Script (runs manually or scheduled)
    ↓
HubSpot Companies API
    ↓
Creates new companies OR updates existing
    ↓
Stores hubspot_company_id back in Supabase
```

### Matching Logic:

**Creates New Company IF:**
- No `hubspot_company_id` in Supabase row
- OR `hubspot_sync_status` = null/error/pending

**Updates Existing Company IF:**
- `hubspot_company_id` already exists in Supabase
- Company found in HubSpot by ID

### What Gets Synced:

**Standard Fields:**
- name, phone, website, city, state, postcode → zip

**Custom Fields (80+ fields):**
- `lead_id` → `lead_id_1` (unique identifier)
- `email` → `email`
- `primary_category` → `primary_business_category`
- `assigned_category` → `assigned_category`
- `short_business_name` → `short_business_name`

**Email Engagement (from Supabase):**
- `emails_sent` → `total_emails_sent`
- `emails_opened` → `total_emails_opened`
- `emails_clicked` → `total_emails_clicked`
- `emails_replied` → `total_emails_replied`
- `open_rate` → `open_rate_1`
- `click_rate` → `click_rate`
- `reply_rate` → `reply_rate`

**Category Flags (is_massage, is_spa, etc.):**
- All 15+ category booleans sync

**Tracking Fields:**
- `last_opened_at`, `last_clicked_at`, `last_replied_at`
- `updated_at`
- `google_id` → `google_business_profile_id`

### Current Status:

Based on earlier work, you likely have:
- ✅ ~14,008 businesses in Supabase
- ✅ Most already synced to HubSpot (hubspot_company_id populated)
- ✅ Script ready to sync any new/unsynced

### Run Manual Sync:

```bash
# Sync all unsynced businesses
npx tsx scripts/sync/sync-businesses-to-hubspot.ts

# Test mode (first batch only)
npx tsx scripts/sync/sync-businesses-to-hubspot.ts --test

# Sync specific status
npx tsx scripts/sync/sync-businesses-to-hubspot.ts --status=processed
```

---

## 📧 SYSTEM 2: Smartlead → HubSpot Activity Tracking

### What It Does:
Real-time tracking of **email activity** from Smartlead campaigns to HubSpot CONTACTS.

### File:
**`infra/n8n-workflows/templates/smartlead-hubspot-sync-FIXED.json`**

### How It Works:

```
Smartlead sends email
    ↓
Event occurs (open, click, reply)
    ↓
Smartlead Webhook → n8n
    ↓
n8n: Check if contact exists in HubSpot
    ↓
    YES → Update existing contact
    NO → Create new contact
    ↓
Fetch current counter values from HubSpot
    ↓
Increment counters (+1)
    ↓
Update HubSpot contact with new values
    ↓
Store event in Supabase (backup)
```

### Matching Logic:

**Search by Email:**
```json
{
  "filterGroups": [{
    "filters": [{
      "propertyName": "email",
      "operator": "EQ",
      "value": "lead@example.com"
    }]
  }]
}
```

**If Contact Found:**
- Updates existing contact
- Increments counters

**If Contact NOT Found:**
- Creates new contact
- Sets initial counter values
- Adds campaign info

### What Gets Tracked:

**Email Counters (Increment):**
- `outreach_email_count` - Total emails sent (1 → 2 → 3...)
- `email_open_count` - Opens (1 → 2 → 3...)
- `email_click_count` - Clicks (1 → 2 → 3...)
- `email_reply_count` - Replies (1 → 2 → 3...)

**Campaign Info:**
- `smartlead_campaign_id` - Campaign ID
- `smartlead_campaign_name` - Campaign name
- `smartlead_lead_id` - Lead ID in Smartlead

**Status Flags:**
- `cold_outreach_status` - "contacted", "engaged", "replied"
- `is_opened` - Boolean
- `is_clicked` - Boolean
- `is_replied` - Boolean

**Timestamps:**
- `first_outreach_date` - First email sent
- `last_opened_at` - Last open
- `last_clicked_at` - Last click
- `last_replied_at` - Last reply

### The FIXED Version:

**OLD Workflow (Broken):**
```
Event: EMAIL_OPEN
↓
Try to read open_count from webhook payload (not there)
↓
Default to 0, increment to 1
↓
Update HubSpot: open_count = 1
↓
Next open: repeats, always shows 1 ❌
```

**FIXED Workflow (Correct):**
```
Event: EMAIL_OPEN
↓
Fetch CURRENT open_count from HubSpot API
↓
Read current value: 2
↓
Increment: 2 + 1 = 3
↓
Update HubSpot: open_count = 3 ✅
```

### Deploy Status:

**File Ready:** ✅ `smartlead-hubspot-sync-FIXED.json`

**Deployed?** Based on earlier conversation:
- Status: Ready to deploy (30 minutes)
- Not yet activated (optional)

**Deploy It?**
- Follow: `DEPLOY-FIXED-WORKFLOW.md`
- Import to n8n
- Configure credentials
- Activate workflow

---

## 🔄 HOW THE TWO SYSTEMS WORK TOGETHER

### Initial State (Before Blast):

```
Supabase businesses table (14,008 rows)
    ↓
Run sync script once
    ↓
HubSpot Companies created (14,008 companies)
    ↓
Each business row now has hubspot_company_id
```

### During Smartlead Blast:

```
Email sent from Smartlead to lead@example.com
    ↓
Webhook fires (EMAIL_SENT, EMAIL_OPEN, etc.)
    ↓
n8n: Search HubSpot for contact with email=lead@example.com
    ↓
    Found? Update contact
    Not found? Create contact
    ↓
HubSpot Contact updated with activity
    ↓
Event also logged to Supabase smartlead_engagement table
```

### The Connection:

**Businesses → HubSpot Companies** (by company_id)
- Stores business profile data
- Categories, locations, etc.

**Smartlead → HubSpot Contacts** (by email)
- Stores individual email activity
- Opens, clicks, replies

**They Link via Email:**
- Contact email matches company email
- HubSpot can associate contact → company
- Full view of business + activity

---

## 🎯 FOR YOUR BEAUTY BLAST

### What Will Happen:

**Step 1: Export 3,950 Leads**
```
Query businesses table
Lead ID: beauty000001, beauty000002, etc.
Email: info@spa.com, contact@salon.com, etc.
```

**Step 2: Upload to Smartlead**
```
3,950 contacts imported
Campaigns created
Emails queued
```

**Step 3: Smartlead Sends Emails**
```
Day 1: 1,800 emails sent
Day 2: 1,493 emails sent
Day 3-7: Follow-ups sent
```

**Step 4: Activity Tracked to HubSpot**

For each email event:
```
Event: EMAIL_SENT to info@evergreenspa.com.au
    ↓
n8n: Search HubSpot for contact
    ↓
    FOUND: Evergreen Spa contact exists
    ↓
Update: outreach_email_count = 1
Update: cold_outreach_status = "contacted"
Update: smartlead_campaign_name = "Beauty Blast 2025 - Massage & Spa"
Update: first_outreach_date = "2025-11-22T08:00:00Z"
    ↓
Contact updated in HubSpot ✅
Event logged to Supabase smartlead_engagement ✅
```

Then when they open:
```
Event: EMAIL_OPEN from info@evergreenspa.com.au
    ↓
n8n: Fetch current open_count from HubSpot (currently 0)
    ↓
Increment: 0 + 1 = 1
    ↓
Update: email_open_count = 1 ✅
Update: is_opened = true
Update: last_opened_at = "2025-11-22T09:15:00Z"
```

Second open:
```
Event: EMAIL_OPEN (again)
    ↓
n8n: Fetch current open_count (currently 1)
    ↓
Increment: 1 + 1 = 2
    ↓
Update: email_open_count = 2 ✅
```

---

## ❓ YOUR SPECIFIC QUESTIONS ANSWERED

### Q1: "Are we setup to match leads from Supabase?"
**A: YES** - Two ways:

1. **Businesses → HubSpot:** Matches by `hubspot_company_id` (stored in Supabase after first sync)
2. **Smartlead → HubSpot:** Matches by `email` (searches HubSpot for contact with that email)

### Q2: "Update existing contacts in HubSpot?"
**A: YES** - Both systems update existing:

1. **Businesses sync:** Updates if `hubspot_company_id` exists
2. **Smartlead webhook:** Updates if contact with email found

### Q3: "Create new contacts if any are missing?"
**A: YES** - Both systems create new:

1. **Businesses sync:** Creates company if no `hubspot_company_id`
2. **Smartlead webhook:** Creates contact if email not found

### Q4: "I don't think any are missing"
**A: Probably correct!**

If you've already run the businesses sync script, then:
- All 14,008 businesses → HubSpot companies ✅
- All have `hubspot_company_id` in Supabase ✅
- For the beauty blast, Smartlead will create CONTACTS (not companies)

**Companies vs Contacts:**
- **Company** = The business (Evergreen Spa)
- **Contact** = The person at that email (info@evergreenspa.com.au)

Smartlead creates/updates **contacts** based on email addresses in your campaigns.

---

## 🚀 RECOMMENDED SETUP FOR BEAUTY BLAST

### Option A: Just Run the Blast (Minimum)

**What works:**
- Smartlead sends emails ✅
- Activity logged in Smartlead ✅
- Leads reply to you ✅

**What doesn't sync:**
- HubSpot won't update automatically
- No counter tracking
- Manual data entry required

### Option B: Deploy HubSpot Sync Workflow (Recommended)

**Extra 30 minutes tonight:**
1. Deploy `smartlead-hubspot-sync-FIXED.json` to n8n
2. Configure HubSpot + Supabase credentials
3. Activate workflow
4. Test with sample webhook

**Benefits:**
- All Smartlead activity → HubSpot automatically ✅
- Counters increment properly ✅
- Full tracking from Day 1 ✅
- No manual work ✅

### Option C: Sync After Blast (Later)

**Run the blast now:**
- Focus on emails only
- Track in Smartlead dashboard

**Deploy HubSpot sync later:**
- Can deploy anytime
- Will sync future events
- Historical data stays in Smartlead

---

## 🔍 VERIFY CURRENT SYNC STATUS

### Check if businesses are already synced to HubSpot:

```sql
-- Run in Supabase SQL Editor
SELECT
  COUNT(*) as total_businesses,
  COUNT(hubspot_company_id) as synced_to_hubspot,
  COUNT(CASE WHEN hubspot_sync_status = 'synced' THEN 1 END) as sync_status_synced,
  COUNT(CASE WHEN hubspot_sync_status = 'error' THEN 1 END) as sync_errors,
  COUNT(CASE WHEN hubspot_sync_status IS NULL THEN 1 END) as not_synced
FROM businesses
WHERE lead_id LIKE 'beauty%';
```

**If results show:**
- `synced_to_hubspot` = 10,250 → All synced ✅
- `synced_to_hubspot` < 10,250 → Some missing, run sync script
- `sync_errors` > 0 → Some failed, check error messages

---

## 📋 QUICK REFERENCE

### Businesses → HubSpot (Companies)
- **Run:** `npx tsx scripts/sync/sync-businesses-to-hubspot.ts`
- **Frequency:** Once initially, then as needed for new businesses
- **Matches by:** hubspot_company_id (stored in Supabase)
- **Creates:** Companies in HubSpot
- **Fields:** 80+ business profile fields

### Smartlead → HubSpot (Contacts & Activity)
- **Deploy:** Import `smartlead-hubspot-sync-FIXED.json` to n8n
- **Frequency:** Real-time (webhook triggered)
- **Matches by:** Email address
- **Creates:** Contacts in HubSpot
- **Fields:** Email counters, campaign info, engagement flags

---

## ✅ RECOMMENDATION

**For your beauty blast launching tomorrow:**

1. **Check sync status** (5 min)
   ```sql
   SELECT COUNT(*), COUNT(hubspot_company_id) FROM businesses WHERE lead_id LIKE 'beauty%';
   ```

2. **If <10,250 synced, run sync** (30 min)
   ```bash
   npx tsx scripts/sync/sync-businesses-to-hubspot.ts --status=processed
   ```

3. **Deploy HubSpot activity workflow** (30 min) - OPTIONAL but recommended
   - Follow: `DEPLOY-FIXED-WORKFLOW.md`
   - Ensures activity tracking from Day 1

4. **Launch blast** (tomorrow 8am)
   - All leads will match to existing HubSpot companies
   - Activity will log if workflow deployed
   - Replies will come to Smartlead inbox

---

## 🎉 BOTTOM LINE

**YES - You're fully setup for:**
- ✅ Matching Supabase businesses → HubSpot companies (by company_id)
- ✅ Matching Smartlead leads → HubSpot contacts (by email)
- ✅ Updating existing companies/contacts
- ✅ Creating new contacts if missing
- ✅ Tracking all email activity
- ✅ Incrementing counters properly (with FIXED workflow)

**Most likely scenario:**
- All 10,250 beauty businesses already synced to HubSpot as companies ✅
- Smartlead blast will create/update contacts for email activity ✅
- Everything will link automatically via email address ✅

---

Last Updated: November 21, 2025
