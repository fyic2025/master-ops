# Smartlead Campaign Setup Guide
## Step-by-Step: Create Beauty Blast Campaigns

**Time Required:** 60-90 minutes
**Campaigns to Create:** 3 (Massage/Spa, Hair/Beauty, Cosmetic)
**Total Leads:** 3,293 contacts

---

## 📋 PRE-SETUP CHECKLIST

Before you begin, ensure you have:
- [ ] Exported CSV files from Supabase (4 files)
- [ ] Smartlead account login: https://app.smartlead.ai
- [ ] Email templates ready ([BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md))
- [ ] 10 email accounts configured in Smartlead
- [ ] Daily send limits set (540 per account recommended)

---

## STEP 1: Export Leads from Supabase (15 minutes)

### Option A: Using psql command line

```bash
# From your terminal in /root/master-ops directory

# Connect to Supabase and run export script
psql "postgresql://postgres:YOUR_PASSWORD@qcvfxxsnqvdfmpbcgdni.supabase.co:5432/postgres" \
  -f scripts/export-beauty-leads-FINAL.sql
```

### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: `qcvfxxsnqvdfmpbcgdni`
3. Click **SQL Editor** (left sidebar)
4. Copy/paste each query from `export-beauty-leads-FINAL.sql`
5. Run each query and download results as CSV

### Expected Output Files:

```
/tmp/massage_spa_leads.csv         (1,821 rows)
/tmp/hair_beauty_leads.csv         (1,200 rows)
/tmp/cosmetic_aesthetic_leads.csv  (272 rows)
/tmp/mixed_beauty_leads.csv        (1,000 rows)
```

### Verify CSV Format:

Each CSV should have these columns:
```
email,business_name,company_name,primary_category,city,state,website,phone_number,lead_id,segment,priority
```

---

## STEP 2: Create Campaign 1 - Massage & Spa (20 minutes)

### 2.1 Create New Campaign

1. Login to Smartlead: https://app.smartlead.ai
2. Click **Campaigns** (left sidebar)
3. Click **+ New Campaign** (top right)
4. Campaign Name: `Beauty Blast 2025 - Massage & Spa`

### 2.2 Upload Leads

1. Click **Add Leads**
2. Select **Upload CSV**
3. Choose file: `massage_spa_leads.csv`
4. Map columns:
   ```
   Email → email
   Company Name → business_name (or company_name)
   Custom Field 1 → primary_category (label: "Category")
   Custom Field 2 → city (label: "City")
   Custom Field 3 → website (label: "Website")
   Custom Field 4 → lead_id (label: "Lead ID")
   ```
5. Click **Import** (should show 1,821 leads imported)

### 2.3 Configure Email Sequence

Click **Sequence** tab:

**Email 1 - Day 1 (Send Immediately)**

Subject:
```
Earn from your existing massage/spa clients
```

Body: (Copy from [BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md) - Campaign 1, Email 1)
```
Hi there,

Quick question for {{company_name}}:

Would you be interested in earning 10-25% commission just by having a poster in your space?

No inventory, no investment, no selling required.

Here's how it works:
→ We give you a custom QR code poster
→ Your clients scan it and order online
→ You earn commission on every order
→ We ship directly to them

Teelixir makes premium organic mushroom supplements (think: beauty from within, stress relief, better sleep). Perfect fit for wellness-conscious spa & massage clients.

300+ Australian businesses already earning passive income this way.

Interested? Takes 2 minutes to apply:
https://teelixir.com.au/pages/teelixir-wholesale-support?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_massage_spa

(Or if you'd rather stock products for 40% margins, that's an option too)

Jayson
Teelixir Ambassador Program
```

**Email 2 - Day 3 (2 days after Email 1)**

Click **+ Add Email**

Delay: 2 days after previous email
Condition: No reply received

Subject:
```
RE: Passive income for massage & spa
```

Body: (Copy from [BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md) - Campaign 1, Email 2)

**Email 3 - Day 5 (2 days after Email 2)**

Click **+ Add Email**

Delay: 2 days after previous email
Condition: No reply received

Subject:
```
Why you haven't replied (probably)
```

Body: (Copy from [BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md) - Campaign 1, Email 3)

**Email 4 - Day 7 (2 days after Email 3)**

Click **+ Add Email**

Delay: 2 days after previous email
Condition: No reply received

Subject:
```
Closing your file
```

Body: (Copy from [BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md) - Campaign 1, Email 4)

### 2.4 Configure Sending Settings

Click **Settings** tab:

**Sending Schedule:**
```
Days: Monday - Friday
Time: 8:00 AM - 6:00 PM (AEST/AEDT)
Timezone: Australia/Sydney
```

**Daily Limits:**
```
Max emails per day per account: 540
Total daily limit: 5,400 (across 10 accounts)
```

**Email Accounts:**
```
Select all 10 accounts:
☑ jayson.rodda@teelixirau.com
☑ jayse.rodda@teelixirau.com
☑ jays.rodda@teelixirau.com
☑ jayjay.rodda@teelixirau.com
☑ jaysone.rodda@teelixirau.com
☑ rodda@getteelixir.com
☑ rajani.sharma@getteelixir.com
☑ jayson.rodda@getteelixir.com
☑ jayson.roda@getteelixir.com
☑ rajanii.sharma@getteelixir.com
```

**Distribution:**
```
◉ Evenly distribute across all accounts
```

### 2.5 Test Campaign (IMPORTANT!)

Before activating:

1. Click **Test Email** (top right)
2. Enter your own email address
3. Send test to yourself
4. Verify:
   - [ ] {{company_name}} populated correctly
   - [ ] {{primary_category}} populated correctly
   - [ ] Links work and have UTM tracking
   - [ ] No formatting issues
   - [ ] Plain text (not HTML)

### 2.6 Save (Don't Activate Yet)

1. Click **Save Campaign**
2. Status should show: **Draft**
3. Leave inactive until all 3 campaigns are set up

---

## STEP 3: Create Campaign 2 - Hair & Beauty (15 minutes)

### 3.1 Duplicate Campaign 1

1. Go to **Campaigns** list
2. Find "Beauty Blast 2025 - Massage & Spa"
3. Click **⋮** (three dots) → **Duplicate**
4. Rename: `Beauty Blast 2025 - Hair & Beauty`

### 3.2 Replace Leads

1. Click **Leads** tab
2. **Delete all leads** from Campaign 1
3. Click **Add Leads** → **Upload CSV**
4. Choose: `hair_beauty_leads.csv`
5. Map columns (same as Campaign 1)
6. Import (should show 1,200 leads)

### 3.3 Update Email Content

**Email 1:**
- Subject: `Free money for your salon?`
- Body: Copy from [BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md) - Campaign 2, Email 1
- **Update UTM:** Change `beauty_blast_massage_spa` → `beauty_blast_hair_beauty`

**Email 2:**
- Subject: `Beauty salons averaging $250-400/month`
- Body: Copy from Campaign 2, Email 2
- **Update UTM:** `beauty_blast_hair_beauty`

**Email 3 & 4:**
- Same content as Campaign 1
- **Update UTM:** `beauty_blast_hair_beauty`

### 3.4 Test & Save

1. Send test email to yourself
2. Verify all links have correct UTM: `beauty_blast_hair_beauty`
3. Save as **Draft**

---

## STEP 4: Create Campaign 3 - Cosmetic & Aesthetic (15 minutes)

### 4.1 Duplicate Campaign 1

1. Go to **Campaigns** list
2. Duplicate "Beauty Blast 2025 - Massage & Spa"
3. Rename: `Beauty Blast 2025 - Cosmetic Pro`

### 4.2 Replace Leads

1. Delete all leads
2. Upload: `cosmetic_aesthetic_leads.csv`
3. Import (should show 272 leads)

### 4.3 Update Email Content

**Email 1:**
- Subject: `Passive income opportunity for cosmetic practices`
- Body: Copy from [BEAUTY-EMAIL-TEMPLATES-FINAL.md](BEAUTY-EMAIL-TEMPLATES-FINAL.md) - Campaign 3, Email 1
- **Update UTM:** `beauty_blast_cosmetic`

**Email 2:**
- Subject: `Passive income for aesthetic practices`
- Body: Copy from Campaign 3, Email 2
- **Update UTM:** `beauty_blast_cosmetic`

**Email 3 & 4:**
- Same as Campaign 1
- **Update UTM:** `beauty_blast_cosmetic`

### 4.4 Test & Save

1. Send test email
2. Verify UTMs: `beauty_blast_cosmetic`
3. Save as **Draft**

---

## STEP 5: Final Review (10 minutes)

### 5.1 Campaign Summary Check

You should now have 3 campaigns:

| Campaign | Leads | Emails | Status |
|----------|-------|--------|--------|
| Massage & Spa | 1,821 | 4 | Draft |
| Hair & Beauty | 1,200 | 4 | Draft |
| Cosmetic Pro | 272 | 4 | Draft |
| **TOTAL** | **3,293** | **13,172 sends** | - |

### 5.2 Settings Verification

For **each campaign**, verify:

**Sending Schedule:**
- [ ] Monday-Friday only
- [ ] 8am-6pm AEST
- [ ] 540 emails/day per account
- [ ] 10 accounts selected

**Email Sequence:**
- [ ] 4 emails configured
- [ ] Delays: Day 1, 3, 5, 7
- [ ] Condition: No reply received
- [ ] Plain text format (not HTML)

**Personalization:**
- [ ] {{company_name}} or {{business_name}} used
- [ ] {{primary_category}} used where relevant
- [ ] NO {{first_name}} (not in database)

**Links:**
- [ ] All links include UTM tracking
- [ ] UTM campaign matches (massage_spa, hair_beauty, cosmetic)
- [ ] Links go to: https://teelixir.com.au/pages/teelixir-wholesale-support

---

## STEP 6: LAUNCH (Nov 22, 8am AEST)

### 6.1 Final Pre-Flight Check

**Morning of Nov 22:**

1. Check email account health:
   ```
   Go to Settings → Email Accounts
   Verify all 10 accounts show:
   - Status: Active
   - Warmup: Complete or High reputation
   - Daily sent today: 0
   ```

2. Check Smartlead quota:
   ```
   Go to Settings → Billing
   Verify: 27,000 emails remaining
   ```

### 6.2 Activate Campaigns

**8:00 AM AEST, November 22:**

1. Go to **Campaigns** list
2. Campaign 1 (Massage & Spa):
   - Click campaign
   - Click **Activate Campaign** (top right)
   - Status → **Active**
   - First emails will send immediately

3. Wait 5 minutes, then activate:
   - Campaign 2 (Hair & Beauty) → **Activate**
   - Campaign 3 (Cosmetic Pro) → **Activate**

**All 3 campaigns should now show: Active** ✅

### 6.3 Monitor First Hour

**8:00-9:00 AM:**

Watch the dashboard:
- Emails sending: Should see 200-300 sent in first hour
- Delivery rate: Should be >95%
- Bounces: Should be <2%

**If anything looks wrong:**
- Bounce rate >5% → **Pause immediately**, check list quality
- Delivery rate <90% → **Pause**, check email account reputation
- Errors/failures → Check Smartlead logs

---

## STEP 7: Daily Monitoring (Nov 22-28)

### Morning Check (8:30 AM daily)

1. Go to **Dashboard**
2. Check across all 3 campaigns:
   ```
   Total sent yesterday: ~5,400
   Delivery rate: >95%
   Bounce rate: <3%
   Reply rate: Track daily
   ```

### Evening Check (6:00 PM daily)

1. Go to **Inbox** (left sidebar)
2. Check replies:
   - Positive interest → Tag as "Qualified"
   - Questions → Respond quickly
   - Unsubscribe → Will auto-remove
   - Out of office → Skip

3. Update tracking spreadsheet:
   ```
   Day | Sent | Delivered | Bounced | Opened | Replied
   1   | 1,800 | 1,750    | 30      | 0      | 5
   2   | 3,600 | 3,500    | 60      | 0      | 18
   ...
   ```

---

## TROUBLESHOOTING

### Issue: Campaign won't activate

**Possible causes:**
- Email accounts not verified → Go to Settings → Email Accounts → Verify all
- No sending schedule set → Check Settings tab → Set 8am-6pm Mon-Fri
- Daily limit too low → Increase to 540 per account

### Issue: Low delivery rate (<90%)

**Possible causes:**
- Bad email list quality → Check bounce reasons in logs
- Sender reputation issues → Reduce daily volume by 50%
- Spam triggers in content → Remove salesy language

### Issue: High bounce rate (>5%)

**Stop immediately and:**
1. Pause all campaigns
2. Export bounced emails (Leads → Bounced)
3. Check bounce reasons (hard bounce vs soft bounce)
4. If mostly hard bounces → List quality issue
5. Remove bounced emails from database

### Issue: Emails going to spam

**Check:**
- SPF/DKIM/DMARC records for sending domains
- Email content (use mail-tester.com to check spam score)
- Sending volume (reduce by 50%)
- Warmup status of email accounts

### Issue: No replies after 3 days

**Don't panic - this is normal:**
- Email 1 typically gets 1-2% reply rate
- Most replies come on Days 3-5 (Email 2 & 3)
- Breakup email (Email 4) often gets highest response
- Total expected: 5-7% reply rate by Day 10

---

## EXPECTED TIMELINE

### Day 1 (Nov 22):
- Sends: 1,800 (Email 1 to 1,800 contacts)
- Replies: 5-10

### Day 2 (Nov 23):
- Sends: 1,493 (remaining Email 1s)
- Replies: 10-15

### Day 3 (Nov 24):
- Sends: 3,100 (Email 2 to non-responders)
- Replies: 25-35

### Day 4 (Nov 25):
- Sends: 200 (remaining Email 2s)
- Replies: 35-50

### Day 5 (Nov 26):
- Sends: 2,900 (Email 3 to non-responders)
- Replies: 60-80

### Day 6 (Nov 27):
- Sends: 100 (remaining Email 3s)
- Replies: 80-100

### Day 7 (Nov 28):
- Sends: 2,700 (Email 4 - breakup)
- Replies: 120-150

### Day 8-10:
- Sends: 200 (remaining Email 4s)
- Replies: 150-200 (total)

**Campaign Complete:** ~Nov 30

---

## SUCCESS METRICS

### Green (Excellent):
- Reply rate: >5%
- Delivery rate: >97%
- Bounce rate: <2%
- Qualified leads: >100
- Applications: >75

### Yellow (Good):
- Reply rate: 3-5%
- Delivery rate: 93-97%
- Bounce rate: 2-3%
- Qualified leads: 50-100
- Applications: 30-75

### Red (Needs Attention):
- Reply rate: <3%
- Delivery rate: <93%
- Bounce rate: >3%
- Qualified leads: <50
- Applications: <30

**If you hit "Red" metrics by Day 3:**
1. Pause campaigns
2. Review email content (A/B test new subject lines)
3. Check sender reputation
4. Reduce daily volume by 50%

---

## QUICK REFERENCE

### Smartlead URLs:
- Login: https://app.smartlead.ai
- Dashboard: https://app.smartlead.ai/dashboard
- Campaigns: https://app.smartlead.ai/campaigns
- Inbox: https://app.smartlead.ai/inbox
- Settings: https://app.smartlead.ai/settings

### File Locations:
- Email templates: `/root/master-ops/BEAUTY-EMAIL-TEMPLATES-FINAL.md`
- SQL export: `/root/master-ops/scripts/export-beauty-leads-FINAL.sql`
- CSV exports: `/tmp/*.csv`

### Support:
- Smartlead support: support@smartlead.ai
- Smartlead docs: https://docs.smartlead.ai

---

## NEXT ACTIONS

- [ ] Export leads from Supabase (Step 1)
- [ ] Create 3 campaigns in Smartlead (Steps 2-4)
- [ ] Test all campaigns (Step 5)
- [ ] Launch Nov 22 at 8am AEST (Step 6)
- [ ] Monitor daily (Step 7)

---

**You're ready to launch!** 🚀

Questions? Review this guide or check [BEAUTY-BLAST-LAUNCH-CHECKLIST.md](BEAUTY-BLAST-LAUNCH-CHECKLIST.md)

---

Last Updated: November 21, 2025
