# 🚀 Beauty Blast 2025 - Campaign Creation Guide

**Time Required:** 30 minutes  
**Campaigns to Create:** 3  
**Total Leads:** 2,200 (1,000 + 1,000 + 200)

---

## Pre-Flight Checklist

✅ CSV files exported:
- `massage_spa_leads.csv` (1,000 leads)
- `hair_beauty_leads.csv` (1,000 leads) 
- `cosmetic_leads.csv` (200 leads)

✅ SmartLead API key working  
✅ 10 email accounts available  
✅ Email templates ready (BEAUTY-EMAIL-TEMPLATES-FINAL.md)

---

## Campaign 1: Massage & Spa (1,000 leads)

### Step 1: Create Campaign (2 min)

1. Go to: https://app.smartlead.ai/campaigns
2. Click: **"+ New Campaign"**
3. Campaign Name: `Beauty Blast 2025 - Massage & Spa`
4. Click: **"Create"**

### Step 2: Upload Leads (3 min)

1. Click: **"Add Leads"** tab
2. Click: **"Upload CSV"**
3. Select: `c:\Users\jayso\master-ops\massage_spa_leads.csv`
4. Map columns:
   - `email` → Email
   - `name` → Company Name
   - `city` → City (custom field)
5. Click: **"Import"**
6. Verify: "1,000 leads imported successfully"

### Step 3: Configure Email Sequence (15 min)

Click: **"Email Sequence"** tab

**Email 1 - Day 1:**
- Subject: `Earn from your existing massage/spa clients`
- Body: [Copy from BEAUTY-EMAIL-TEMPLATES-FINAL.md - Email 1 Massage & Spa version]
- Delay: Send immediately

**Email 2 - Day 3:**
- Subject: `RE: Passive income for massage & spa`
- Body: [Copy from BEAUTY-EMAIL-TEMPLATES-FINAL.md - Email 2]
- Delay: 2 days after Email 1

**Email 3 - Day 5:**
- Subject: `Why you haven't replied (probably)`
- Body: [Copy from BEAUTY-EMAIL-TEMPLATES-FINAL.md - Email 3]
- Delay: 2 days after Email 2

**Email 4 - Day 7:**
- Subject: `Closing your file`
- Body: [Copy from BEAUTY-EMAIL-TEMPLATES-FINAL.md - Email 4]
- Delay: 2 days after Email 3

### Step 4: Configure Settings (5 min)

Click: **"Settings"** tab

**Sending Schedule:**
- Days: Monday - Friday
- Time: 8:00 AM - 6:00 PM AEST
- Timezone: Australia/Sydney

**Email Accounts:**
- Select: All 10 email accounts
- Daily limit per account: 540 emails
- Total daily: 5,400 emails

**Tracking:**
- Open tracking: OFF (per your data showing 0 opens)
- Click tracking: ON
- Reply tracking: ON

### Step 5: Save as Draft

1. Click: **"Save"**
2. Status should show: **"DRAFT"**
3. Do NOT activate yet

---

## Campaign 2: Hair & Beauty (1,000 leads)

### Quick Method: Duplicate Campaign 1

1. Go to Campaign 1 (Massage & Spa)
2. Click: **"⋮" → "Duplicate"**
3. Rename to: `Beauty Blast 2025 - Hair & Beauty`
4. Replace leads:
   - Delete existing leads
   - Upload `hair_beauty_leads.csv`
5. Update email content:
   - Use Hair & Beauty versions from templates
   - Change UTM from `massage_spa` to `hair_beauty`
6. Save as Draft

**Time:** 10 minutes (using duplicate feature)

---

## Campaign 3: Cosmetic Pro (200 leads)

### Quick Method: Duplicate Campaign 1

1. Go to Campaign 1 (Massage & Spa)
2. Click: **"⋮" → "Duplicate"**
3. Rename to: `Beauty Blast 2025 - Cosmetic Pro`
4. Replace leads:
   - Delete existing leads
   - Upload `cosmetic_leads.csv`
5. Update email content:
   - Use Cosmetic versions from templates
   - Change UTM from `massage_spa` to `cosmetic`
6. Save as Draft

**Time:** 10 minutes

---

## Final Review Checklist

Before activating, verify for ALL 3 campaigns:

### Campaign Settings
- [ ] Campaign name correct
- [ ] Status: DRAFT

### Leads
- [ ] Correct CSV imported
- [ ] Lead count matches (1,000 / 1,000 / 200)
- [ ] No duplicate emails

### Email Sequence
- [ ] 4 emails configured
- [ ] Subjects are unique
- [ ] UTM parameters correct for each campaign
- [ ] Delays: Day 1, Day 3, Day 5, Day 7
- [ ] No {{first_name}} tokens (removed)
- [ ] {{company_name}} tokens present

### Sending Settings
- [ ] Schedule: Mon-Fri, 8am-6pm AEST
- [ ] 10 email accounts selected
- [ ] Daily limit: 540/account
- [ ] Total daily sends: 5,400

### Tracking
- [ ] Open tracking: OFF
- [ ] Click tracking: ON
- [ ] Reply tracking: ON

---

## Activation Day

### When Ready to Launch:

1. **Morning Check (8:00 AM):**
   - Verify all email accounts are healthy
   - Check daily quota available (27,000)

2. **Activate Campaigns (8:05 AM):**
   - Campaign 1: Massage & Spa → Click **"Activate"**
   - Campaign 2: Hair & Beauty → Click **"Activate"**
   - Campaign 3: Cosmetic Pro → Click **"Activate"**

3. **Monitor First Hour (8:05-9:00 AM):**
   - Watch dashboard for sends
   - Verify delivery rate >95%
   - Check bounce rate <3%
   - Look for any errors

4. **First Check-In (10:00 AM):**
   - Should have ~1,500 emails sent
   - Verify campaigns running smoothly
   - Check for any replies

---

## Expected Results

### Day 1-2:
- Emails sent: 8,800-10,800
- Replies: 5-15
- Applications: 0-5

### Day 3-5:
- Cumulative sent: All 8,800 emails
- Replies: 50-100
- Applications: 30-60

### Day 7-10:
- Total replies: 143-176 (6.5% rate)
- Total applications: 100-130
- Approved ambassadors: 35-50

---

## Troubleshooting

### Issue: Email accounts not sending
**Fix:** Go to Email Accounts → Check "Active" status → Enable if needed

### Issue: High bounce rate (>3%)
**Action:** Pause campaign → Review lead quality → Resume with cleaned list

### Issue: Low reply rate (<2% by Day 3)
**Action:** Continue monitoring → May need to adjust messaging for future campaigns

### Issue: Spam complaints
**Action:** Pause immediately → Review email content → Check unsubscribe links working

---

## Next Steps After Launch

1. **Daily monitoring** (Days 1-3)
2. **Reply management** (use scripts from BEAUTY-BLAST-READY-TO-LAUNCH.md)
3. **Track applications** in separate spreadsheet
4. **Week 2:** Review results and plan next batch if performing well

---

**Ready to create campaigns?**  
Follow this guide step-by-step. Total time: ~30 minutes.

---

*Last Updated: November 23, 2025*
