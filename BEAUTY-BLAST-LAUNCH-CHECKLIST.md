# Beauty Blast Launch Checklist

**Campaign:** 27K Beauty Leads Blast
**Launch Date:** November 22, 2025 (Tomorrow)
**Duration:** 5 days (Nov 22-26)
**Target:** Fresh beauty leads for Teelixir wholesale

---

## Pre-Launch (Tonight - 30 minutes)

### ☐ Step 1: Export Fresh Leads (10 min)

```bash
# Connect to Supabase
psql $SUPABASE_URL

# Run the combined export query from scripts/export-beauty-leads.sql
# Save results to CSV
\copy (SELECT ... FROM prioritized_leads ORDER BY priority ASC, created_at DESC) TO '/tmp/beauty_blast_leads.csv' WITH CSV HEADER
```

**Expected Output:** 3,950 leads with priority rankings

### ☐ Step 2: Split by Segment (5 min)

```bash
# Split the CSV by segment column
awk -F',' '$11=="massage_spa"' beauty_blast_leads.csv > massage_spa.csv
awk -F',' '$11=="hair_beauty"' beauty_blast_leads.csv > hair_beauty.csv
awk -F',' '$11=="cosmetic_pro"' beauty_blast_leads.csv > cosmetic_pro.csv
awk -F',' '$11=="mixed_beauty"' beauty_blast_leads.csv > mixed_beauty.csv
```

**Expected Files:**
- `massage_spa.csv` (1,350 rows)
- `hair_beauty.csv` (900 rows)
- `cosmetic_pro.csv` (700 rows)
- `mixed_beauty.csv` (1,000 rows)

### ☐ Step 3: Create Smartlead Campaigns (10 min)

Login: https://app.smartlead.ai/campaigns

**Campaign 1: Massage & Spa Excellence**
- Name: `Beauty Blast 2025 - Massage & Spa`
- Upload: `massage_spa.csv`
- Email sequence: Use "Massage & Spa Version" from BEAUTY-EMAIL-TEMPLATES.md
- Sending schedule: 8am-6pm AEST
- Daily limit: 540 emails per account (10 accounts = 5,400/day)

**Campaign 2: Hair & Beauty Salons**
- Name: `Beauty Blast 2025 - Hair & Beauty`
- Upload: `hair_beauty.csv`
- Email sequence: Use "Hair & Beauty Version" from BEAUTY-EMAIL-TEMPLATES.md
- Sending schedule: 8am-6pm AEST
- Daily limit: Same as Campaign 1

**Campaign 3: Cosmetic & Aesthetic**
- Name: `Beauty Blast 2025 - Cosmetic Pro`
- Upload: `cosmetic_pro.csv`
- Email sequence: Use "Cosmetic & Aesthetic Version" from BEAUTY-EMAIL-TEMPLATES.md
- Sending schedule: 8am-6pm AEST
- Daily limit: Same as Campaign 1

### ☐ Step 4: Verify Email Templates (5 min)

**Check all campaigns have:**
- ✓ Personalization tokens: {{first_name}}, {{company_name}}, {{primary_category}}
- ✓ UTM tracking: `?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_blast_2025`
- ✓ Plain text format (NO HTML)
- ✓ 4-email sequence (Days 1, 3, 5, 7-10)
- ✓ Unsubscribe link included

---

## Launch Day (Nov 22 - 15 minutes)

### ☐ 7:45am AEST: Final Checks

```bash
# Verify Smartlead quota
curl "https://server.smartlead.ai/api/v1/email-accounts?api_key=$SMARTLEAD_API_KEY" | jq '.[] | {email: .email, daily_limit: .daily_limit, sent_today: .sent_today}'

# Expected: All accounts show sent_today = 0
```

### ☐ 8:00am AEST: Launch Campaigns

1. Go to Smartlead dashboard
2. Campaign 1 (Massage & Spa) → **Activate**
3. Campaign 2 (Hair & Beauty) → **Activate**
4. Campaign 3 (Cosmetic Pro) → **Activate**

**Status:** All campaigns should show "RUNNING"

### ☐ 10:00am AEST: First Check (2 hours after launch)

```bash
# Check sends
npx tsx scripts/analyze-beauty-campaigns.ts
```

**Expected:**
- ~1,000-1,200 emails sent
- 0 bounces so far (too early)
- Delivery rate tracking starting

### ☐ 6:00pm AEST: End of Day 1 Check

**Metrics to verify:**
- Total sent: 5,400 emails (target)
- Delivery rate: >95%
- Bounce rate: <3%
- Any replies? (Day 1 typically has few replies)

**If bounce rate >3%:** Pause and review email list quality

---

## Days 2-5 (Nov 23-26)

### Daily Morning Check (8:00am AEST)

```bash
# Check quota remaining
curl "https://server.smartlead.ai/api/v1/campaigns?api_key=$SMARTLEAD_API_KEY" | jq '.[] | select(.name | contains("Beauty Blast")) | {name: .name, sent: .sent_count, remaining: .total_leads - .sent_count}'
```

### Daily Evening Check (6:00pm AEST)

**Track:**
- Daily sends: Should be ~5,400/day
- Cumulative delivery rate: Should stay >95%
- Reply count: Expect replies to start Day 2-3
- Unsubscribe rate: Should be <0.5%

**Red Flags:**
- 🚨 Bounce rate >5%: Stop immediately, review list
- 🚨 Delivery rate <90%: Reduce send volume
- 🚨 Spam complaints: Pause and review content
- ⚠️ Reply rate <1.5%: Content may need tweaking (but wait until Day 3)

---

## Reply Management

### When Replies Come In

**Positive Signals (Route to Sales):**
- "Tell me more"
- "What are your minimums?"
- "Send me info"
- "Interested"
- "Can you call me?"

**BANT Qualification Questions:**
- Budget: "What's your typical wholesale order size?"
- Authority: "Are you the owner/buyer?"
- Need: "What supplements do you currently stock?"
- Timeline: "When are you looking to add new products?"

**Qualified Lead = 3+ BANT criteria met**

**Objections (Use Email #3 Template):**
- "Not interested" → Wait 2 days, send Email #3
- "Too expensive" → Share margin breakdown
- "No shelf space" → Highlight best-sellers only
- "Happy with current suppliers" → Emphasize unique mushroom/adaptogen category

---

## Success Metrics

### Daily Targets

| Metric | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Total |
|--------|-------|-------|-------|-------|-------|-------|
| Sent | 5,400 | 5,400 | 5,400 | 5,400 | 5,400 | 27,000 |
| Delivered | 5,130 | 5,130 | 5,130 | 5,130 | 5,130 | 25,650 |
| Opens | - | - | - | - | - | - |
| Replies | 5-10 | 15-25 | 30-40 | 40-50 | 50-60 | 142 |
| Qualified | 0-2 | 5-8 | 10-15 | 15-20 | 20-25 | 43 |

### Campaign End (Nov 26)

**Target Outcomes:**
- ✓ 142 total replies (3.6% reply rate)
- ✓ 43 qualified prospects
- ✓ 9 new wholesale accounts
- ✓ $4,500-$13,500 revenue potential

**Green Light (Success):**
- Reply rate >2.5%
- Delivery rate >95%
- 30+ qualified leads
- 5+ accounts interested

**Yellow Light (Review):**
- Reply rate 1.5-2.5%
- Delivery rate 90-95%
- 15-30 qualified leads
- 3-5 accounts interested

**Red Light (Stop & Analyze):**
- Reply rate <1.5%
- Delivery rate <90%
- <15 qualified leads
- <3 accounts interested

---

## Emergency Contacts

**Smartlead Support:**
- Email: support@smartlead.ai
- Live chat: app.smartlead.ai

**If Campaigns Get Paused:**
1. Check sender reputation: https://talosintelligence.com/reputation_center
2. Review bounce reasons in Smartlead
3. Verify SPF/DKIM/DMARC records
4. Reduce daily send volume by 50%

---

## Post-Campaign (Nov 27+)

### ☐ Generate Final Report

```bash
npx tsx scripts/analyze-beauty-campaigns.ts > BEAUTY-BLAST-RESULTS.txt
```

### ☐ Calculate ROI

**Revenue Generated:** $______
**Cost:** Smartlead Pro Plan (~$500/month)
**ROI:** _____%

### ☐ Follow-up Sequence

**Qualified leads with no response to Email #4:**
- Wait 7 days after Email #4
- Send LinkedIn connection request
- Phone follow-up (if number available)

**Replied but not qualified:**
- Add to nurture campaign
- Monthly newsletter
- Re-engage in 90 days

---

## Quick Commands Reference

```bash
# Test Smartlead connection
npx tsx test-smartlead.ts

# Analyze campaign performance
npx tsx scripts/analyze-beauty-campaigns.ts

# Export fresh leads
psql $SUPABASE_URL -f scripts/export-beauty-leads.sql

# Check email quota
curl "https://server.smartlead.ai/api/v1/email-accounts?api_key=$SMARTLEAD_API_KEY" | jq '.[].daily_limit'

# View campaign stats
curl "https://server.smartlead.ai/api/v1/campaigns?api_key=$SMARTLEAD_API_KEY" | jq '.[] | {name: .name, sent: .sent_count, replies: .reply_count}'
```

---

## Files You'll Need

- ✓ [BEAUTY-BLAST-PLAN.md](BEAUTY-BLAST-PLAN.md) - Full strategy
- ✓ [BEAUTY-EMAIL-TEMPLATES.md](BEAUTY-EMAIL-TEMPLATES.md) - Copy/paste email text
- ✓ [BEAUTY-BLAST-EXEC-SUMMARY.md](BEAUTY-BLAST-EXEC-SUMMARY.md) - ROI projections
- ✓ [scripts/export-beauty-leads.sql](scripts/export-beauty-leads.sql) - Database queries
- ✓ [scripts/analyze-beauty-campaigns.ts](scripts/analyze-beauty-campaigns.ts) - Performance tracking

---

**Status:** ✅ Ready to Launch
**Next Action:** Export leads tonight, create campaigns, launch tomorrow 8am AEST

**Questions before launch?** Review BEAUTY-BLAST-EXEC-SUMMARY.md

---

Last Updated: November 21, 2025
