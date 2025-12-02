# 🚀 ONE Campaign Setup - Beauty Blast 2025

**Time:** 15 minutes  
**Leads:** 2,200 (all beauty businesses combined)  
**File:** `beauty_blast_2025_ALL_LEADS.csv`

---

## Why ONE Campaign is Better:

✅ **Simpler:** One campaign to manage vs 3  
✅ **Smarter:** HubSpot handles segmentation using business type flags  
✅ **Faster:** 15 min setup vs 30 min  
✅ **Flexible:** Can analyze by segment in HubSpot after sync  
✅ **Unified:** All engagement data in one stream  

---

## Step-by-Step Setup (15 minutes)

### 1. Create Campaign (2 min)

1. Go to: https://app.smartlead.ai/campaigns
2. Click: **"+ New Campaign"**
3. Name: `Beauty Blast 2025 - Ambassador Program`
4. Click: **"Create"**

---

### 2. Upload Leads (3 min)

1. Click: **"Add Leads"** tab
2. Click: **"Upload CSV"**
3. Select: `c:\Users\jayso\master-ops\beauty_blast_2025_ALL_LEADS.csv`
4. Map columns:
   - `email` → Email
   - `name` → Company Name
   - `city` → City
   - `phone` → Phone
   - `website` → Website
5. Click: **"Import"**
6. Verify: **"2,200 leads imported"** ✅

---

### 3. Configure Email Sequence (8 min)

Click: **"Email Sequence"** tab

#### Email 1 - Day 1
- **Subject:** `Passive income for your beauty business?`
- **Body:** [Copy from UNIVERSAL-EMAIL-SEQUENCE.md - Email 1]
- **Delay:** Send immediately

#### Email 2 - Day 3
- **Subject:** `RE: Beauty businesses earning $150-500/month`
- **Body:** [Copy from UNIVERSAL-EMAIL-SEQUENCE.md - Email 2]
- **Delay:** 2 days after Email 1

#### Email 3 - Day 5
- **Subject:** `Why you haven't replied (probably)`
- **Body:** [Copy from UNIVERSAL-EMAIL-SEQUENCE.md - Email 3]
- **Delay:** 2 days after Email 2

#### Email 4 - Day 7
- **Subject:** `Closing your file`
- **Body:** [Copy from UNIVERSAL-EMAIL-SEQUENCE.md - Email 4]
- **Delay:** 2 days after Email 3

---

### 4. Configure Settings (5 min)

Click: **"Settings"** tab

**Sending Schedule:**
- Days: Monday - Friday
- Time: 8:00 AM - 6:00 PM AEST
- Timezone: Australia/Sydney

**Email Accounts:**
- Select: All 10 email accounts
- Daily limit per account: 540
- Total daily sends: 5,400

**Tracking:**
- Open tracking: OFF
- Click tracking: ON
- Reply tracking: ON

---

### 5. Save as Draft

1. Click: **"Save"**
2. Status: **"DRAFT"**
3. ✅ Ready to launch!

---

## Launch Checklist

Before activating:

### Campaign
- [ ] Name: "Beauty Blast 2025 - Ambassador Program"
- [ ] Leads: 2,200 imported
- [ ] Status: DRAFT

### Email Sequence
- [ ] 4 emails configured
- [ ] Delays: Day 1, 3, 5, 7
- [ ] UTM: `beauty_blast_2025` in all links
- [ ] No {{first_name}} tokens
- [ ] {{company_name}} present in all emails

### Settings
- [ ] Schedule: Mon-Fri, 8am-6pm AEST
- [ ] 10 accounts selected
- [ ] 540/account daily limit
- [ ] Click + Reply tracking ON

---

## After Sync to HubSpot

You'll be able to segment by business type:

**In HubSpot, create Smart Lists:**

1. **"Massage/Spa - Engaged"**
   - is_massage = true OR is_spa_and_wellness = true
   - email_click_count > 0

2. **"Hair/Beauty - High Intent"**
   - is_hair_services = true OR is_beauty_salon = true
   - is_replied = true

3. **"Cosmetic - Hot Leads"**
   - is_cosmetic_clinic = true
   - email_click_count > 0
   - is_replied = true

**Much more powerful than 3 separate campaigns!**

---

## Expected Results

### Campaign Performance:
- **Total Emails:** 8,800 (2,200 × 4)
- **Duration:** ~2 days at 5,400/day
- **Quota Used:** 33% of 27K

### Outcomes (Days 1-10):
- **Replies:** 143-176 (6.5% rate)
- **Applications:** 100-130
- **Ambassadors:** 35-50
- **Stockists:** 7-12

### Segmentation in HubSpot:
- Massage/Spa: ~1,000 leads (45%)
- Hair/Beauty: ~1,000 leads (45%)
- Cosmetic: ~200 leads (9%)

---

## Files You Need

**Lead Data:**
- `beauty_blast_2025_ALL_LEADS.csv` ✅ (2,200 leads combined)

**Email Content:**
- `UNIVERSAL-EMAIL-SEQUENCE.md` ✅ (copy/paste ready)

**Reference:**
- `ONE-CAMPAIGN-SETUP.md` (this file)
- `PROJECT-STATUS.md` (overall status)

---

## When to Activate

**Recommended:** Tomorrow 8am AEST

**Pre-flight:**
1. Verify all 10 email accounts healthy
2. Check quota (27,000 available)
3. Review campaign draft one last time

**Launch:**
1. Click: **"Activate"** in SmartLead
2. Monitor first hour (1,500 sends)
3. Check delivery rate >95%

---

**🎯 ONE campaign, ONE upload, ONE set of sequences. MUCH simpler!**

---

*Last Updated: November 23, 2025*
