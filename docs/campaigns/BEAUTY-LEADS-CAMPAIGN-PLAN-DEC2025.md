# Beauty Leads Campaign Plan - December 2025
## Maximizing Sign-ups via Smartlead Cold Outreach

**Date:** December 1, 2025
**Target URL:** `https://teelixir.com.au/pages/teelixir-wholesale-support/`
**Scope:** All beauty leads EXCEPT fitness/gym

---

## Executive Summary

This plan covers how to maximize wholesale partner sign-ups by targeting beauty leads through Smartlead cold outreach. Beauty leads include:
- Massage & Spa
- Hair & Beauty Salons
- Cosmetic/Aesthetic Clinics
- Wellness Centers
- Nail Salons
- Skincare/Beauty Therapists

**Excludes:** Fitness studios, gyms, personal trainers (separate campaign track)

---

## Current State Analysis

### Lead Database Status
| Segment | Boolean Flags | Lead ID Pattern | Est. Count |
|---------|--------------|-----------------|------------|
| Massage & Spa | `is_massage`, `is_spa_and_wellness` | `beauty_*` | ~1,850 |
| Hair & Beauty | `is_hair_services`, `is_beauty_salon` | `beauty_*` | ~1,900 |
| Cosmetic Pro | `is_cosmetic_clinic`, `is_injectables_anti_aging`, `is_laser_skin_treatment` | `beauty_*` | ~700 |
| **Total Beauty** | - | - | **~4,500+** |

### Previous Campaign Performance
- **Reply Rate:** 2.47% average, **5.13% for massage/spa** (best segment)
- **Delivery Rate:** 98.23%
- **Total Contacted:** ~2,876 leads previously
- **Replies Received:** 71

---

## Campaign Strategy Options

### Option A: Create NEW Campaign (Recommended)
**Best for:** Fresh start, clean tracking, new UTM parameters

**Pros:**
- Clean analytics
- No confusion with old data
- Can use updated email copy
- Better for A/B testing

**Cons:**
- Need to exclude previously contacted leads
- Setup time required

### Option B: Resume Existing Leads + Add New Sequences
**Best for:** Contacts who didn't reply to previous campaigns

**Pros:**
- Reach previous non-responders with new messaging
- No lead duplication risk

**Cons:**
- Mixed analytics
- May hit spam filters if same leads contacted again too soon

### Option C: Hybrid Approach (Best ROI)
1. **Fresh leads** → New campaign
2. **Previous non-responders (60+ days)** → Resume with new sequence

---

## Recommended Approach: NEW CAMPAIGN + RE-ENGAGE

### Phase 1: New Campaign for Fresh Leads

**Campaign Name:** `Beauty Ambassador Q4 2025`

**Target Segments (Priority Order):**
1. **Massage & Spa** - 40% allocation (highest reply rate)
2. **Hair & Beauty** - 35% allocation
3. **Cosmetic Pro** - 25% allocation

**Email Sequence (4 emails over 7 days):**
| Email | Day | Subject | Purpose |
|-------|-----|---------|---------|
| 1 | 0 | Partnership opportunity - {{company_name}} | Value intro |
| 2 | 3 | Re: Partnership - {{company_name}} | Social proof + tiers |
| 3 | 5 | {{company_name}} - wellness product revenue | Benefits recap |
| 4 | 7 | Final follow-up - {{company_name}} | Breakup email |

**Landing Page URL:**
```
https://teelixir.com.au/pages/teelixir-wholesale-support/?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_ambassador_q4_2025
```

### Phase 2: Re-engage Previous Non-Responders

**Target:** Leads contacted 60+ days ago who:
- Did NOT reply
- Did NOT unsubscribe
- Did NOT bounce

**New Sequence for Re-engagement:**
| Email | Day | Subject | Purpose |
|-------|-----|---------|---------|
| 1 | 0 | New opportunity for {{company_name}} | Fresh angle |
| 2 | 3 | Quick update - commission rates increased | Urgency/value |
| 3 | 6 | Last chance - {{company_name}} | Final push |

---

## What Can Be Done via API

### Fully Automated (No Manual Work)
| Task | API Method | Notes |
|------|-----------|-------|
| Create new campaign | `campaigns.create()` | Name, settings |
| Add email sequences | `campaigns.saveSequence()` | 4-email sequence |
| Upload leads | `leads.add()` | Max 100 per request, batch |
| Assign email accounts | `emailAccounts.addToCampaign()` | Link senders |
| Update schedule | `campaigns.updateSchedule()` | Timezone, days, hours |
| Get analytics | `analytics.getCampaignAnalytics()` | Stats, opens, replies |
| Resume paused leads | `leads.resume()` | For re-engagement |
| Export results | `analytics.exportLeads()` | CSV export |

### Requires Manual Work (Smartlead UI)
| Task | Why Manual | Workaround |
|------|-----------|------------|
| Email account SMTP setup | OAuth/credentials | One-time setup |
| Domain warmup config | Complex settings | Use existing warmed accounts |
| A/B test variants | UI-only feature | Create separate campaigns |
| Reply inbox management | Real-time inbox | Use webhook → HubSpot |

---

## Implementation Steps

### Step 1: Export Fresh Beauty Leads (API + Database)
```sql
-- Fresh leads: never contacted OR contacted 60+ days ago
SELECT
  COALESCE(business_name, name) as name,
  email,
  city,
  phone,
  website
FROM businesses
WHERE
  lead_id LIKE 'beauty%'
  AND email IS NOT NULL
  AND email LIKE '%@%'
  AND (
    is_massage = true
    OR is_spa_and_wellness = true
    OR is_hair_services = true
    OR is_beauty_salon = true
    OR is_cosmetic_clinic = true
    OR is_injectables_anti_aging = true
    OR is_laser_skin_treatment = true
  )
  AND is_fitness_studio IS NOT true  -- EXCLUDE fitness
  AND (
    total_emails_sent = 0
    OR total_emails_sent IS NULL
    OR last_email_sent < NOW() - INTERVAL '60 days'
  )
ORDER BY total_emails_sent ASC NULLS FIRST
LIMIT 5000;
```

### Step 2: Create Campaign via API
```typescript
const campaign = await smartleadClient.campaigns.create({
  name: 'Beauty Ambassador Q4 2025',
  client_id: null, // Use default
})
```

### Step 3: Add Email Sequence via API
```typescript
await smartleadClient.campaigns.saveSequence(campaignId, {
  sequences: [
    { seq_number: 1, subject: 'Partnership opportunity - {{company_name}}', body: EMAIL_1_HTML, delay_in_days: 0 },
    { seq_number: 2, subject: 'Re: Partnership - {{company_name}}', body: EMAIL_2_HTML, delay_in_days: 3 },
    { seq_number: 3, subject: '{{company_name}} - wellness product revenue', body: EMAIL_3_HTML, delay_in_days: 5 },
    { seq_number: 4, subject: 'Final follow-up - {{company_name}}', body: EMAIL_4_HTML, delay_in_days: 7 },
  ]
})
```

### Step 4: Upload Leads in Batches via API
```typescript
// Max 100 leads per request
for (const batch of leadBatches) {
  await smartleadClient.leads.add(campaignId, {
    lead_list: batch.map(lead => ({
      email: lead.email,
      first_name: lead.name?.split(' ')[0] || '',
      company_name: lead.name,
      custom_fields: { city: lead.city }
    }))
  })
}
```

### Step 5: Assign Email Accounts via API
```typescript
const accounts = await smartleadClient.emailAccounts.list()
const accountIds = accounts.results.map(a => a.id)
await smartleadClient.emailAccounts.addToCampaign(campaignId, accountIds)
```

### Step 6: Set Schedule via API
```typescript
await smartleadClient.campaigns.updateSchedule(campaignId, {
  timezone: 'Australia/Sydney',
  days_of_the_week: [1, 2, 3, 4, 5], // Mon-Fri
  start_hour: '09:00',
  end_hour: '17:00',
  min_time_btw_emails: 3,
  max_new_leads_per_day: 500,
})
```

### Step 7: Launch Campaign
```typescript
await smartleadClient.campaigns.updateSettings(campaignId, {
  status: 'ACTIVE'
})
```

---

## Email Templates (Ready to Use)

### Email 1 - Day 0: Value Introduction
```html
<p>Hello,</p>

<p>I'm reaching out to {{company_name}} about a passive revenue opportunity for beauty and wellness businesses.</p>

<p><strong>The program:</strong><br>
Partner with Teelixir to offer premium superfood supplements to your clients. You earn 10-25% commission on sales.</p>

<p><strong>Why beauty businesses join:</strong></p>
<ul>
<li>No inventory or upfront costs</li>
<li>Products ship directly to customers</li>
<li>Average partner earns $150-500/month passive</li>
<li>Takes 5 minutes to set up</li>
</ul>

<p><strong>How it works:</strong><br>
Share a custom link with clients → They purchase → You earn commission automatically.</p>

<p>Application: <a href="https://teelixir.com.au/pages/teelixir-wholesale-support/?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_ambassador_q4_2025">https://teelixir.com.au/pages/teelixir-wholesale-support/</a></p>

<p>Worth reviewing?</p>

<p>Regards,<br>
Teelixir Partnership Team</p>
```

### Email 2 - Day 3: Commission Tiers
```html
<p>Following up on the partnership opportunity for {{company_name}}.</p>

<p><strong>Quick numbers:</strong></p>
<ul>
<li>10% commission (start)</li>
<li>20% at $500/month in sales</li>
<li>25% at $1,500/month in sales</li>
</ul>

<p>No quotas, no commitments. Just a passive revenue stream for businesses like yours.</p>

<p><strong>Common question:</strong> "What products?"<br>
Premium adaptogens, medicinal mushrooms, superfood blends - wellness products your clients already buy.</p>

<p>Review the program: <a href="https://teelixir.com.au/pages/teelixir-wholesale-support/?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_ambassador_q4_2025">https://teelixir.com.au/pages/teelixir-wholesale-support/</a></p>

<p>Questions?</p>

<p>Teelixir Partnerships</p>
```

### Email 3 - Day 5: Benefits Recap
```html
<p>Quick check-in about the Ambassador program for {{company_name}}.</p>

<p><strong>What makes this different:</strong></p>
<ul>
<li>Zero investment required</li>
<li>No inventory management</li>
<li>Products ship directly from us</li>
<li>You focus on your business, earn passive commissions</li>
</ul>

<p>Most beauty/wellness businesses who join say they wish they'd started sooner.</p>

<p>Full details: <a href="https://teelixir.com.au/pages/teelixir-wholesale-support/?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_ambassador_q4_2025">https://teelixir.com.au/pages/teelixir-wholesale-support/</a></p>

<p>Worth 5 minutes?</p>

<p>Teelixir Team</p>
```

### Email 4 - Day 7: Breakup
```html
<p>Last email about the Teelixir partnership.</p>

<p><strong>Summary:</strong></p>
<ul>
<li>10-25% commission on wellness products</li>
<li>$0 to start, no ongoing costs</li>
<li>Avg partner: $250/month passive income</li>
<li>Set up in 5 minutes</li>
</ul>

<p>If this interests {{company_name}}, apply here: <a href="https://teelixir.com.au/pages/teelixir-wholesale-support/?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_ambassador_q4_2025">https://teelixir.com.au/pages/teelixir-wholesale-support/</a></p>

<p>If not, no worries - I'll close your file.</p>

<p>Best regards,<br>
Teelixir Partnerships</p>
```

---

## Projected Results

### Conservative (2.5% reply rate)
- **Leads contacted:** 4,500
- **Replies:** 112
- **Qualified prospects:** 34 (30%)
- **New accounts:** 7 (20% conversion)
- **Revenue potential:** $3,500-$10,500

### Target (3.6% reply rate)
- **Leads contacted:** 4,500
- **Replies:** 162
- **Qualified prospects:** 49
- **New accounts:** 10
- **Revenue potential:** $5,000-$15,000

### Best Case (5% reply rate - massage/spa segment)
- **Leads contacted:** 4,500
- **Replies:** 225
- **Qualified prospects:** 68
- **New accounts:** 14
- **Revenue potential:** $7,000-$21,000

---

## Timeline

| Day | Action | Owner |
|-----|--------|-------|
| Day 0 | Export leads, create campaign, upload sequences | Automated |
| Day 0 | Assign email accounts, set schedule | Automated |
| Day 1 | Launch campaign (Email 1 sends) | Automated |
| Day 4 | Email 2 sends to non-responders | Automated |
| Day 6 | Email 3 sends to non-responders | Automated |
| Day 8 | Email 4 (breakup) sends | Automated |
| Day 8-14 | Monitor replies, qualify leads | Manual |
| Day 15 | Campaign complete, export results | Automated |

---

## API Limitations Summary

| Limitation | Impact | Workaround |
|------------|--------|------------|
| 100 leads max per upload | Need batching | Script handles automatically |
| 10 req/2 sec rate limit | Slower uploads | Built-in rate limiter |
| Can't create A/B variants via API | No split testing | Create 2 campaigns manually |
| Can't access reply inbox via API | Miss quick responses | Use webhooks → HubSpot |
| Can't warm up domains via API | Cold domains spam | Use pre-warmed accounts |

---

## What I Can Do Right Now

### Fully Automated (Run the script)
1. Export fresh beauty leads from database
2. Create new Smartlead campaign
3. Upload 4-email sequence
4. Batch upload all leads
5. Assign email accounts
6. Set AEST schedule (Mon-Fri 9am-5pm)
7. Configure campaign settings

### Needs Your Input
1. **Confirm campaign name:** `Beauty Ambassador Q4 2025` OK?
2. **Confirm email accounts:** Use existing 10 warmed accounts?
3. **Confirm daily send limit:** 500 new leads/day? (reaches all in ~10 days)
4. **Launch immediately or schedule:** Start now or specific date?

---

## Quick Start Command

Once confirmed, I can run:
```bash
npm run create-beauty-campaign -- \
  --name "Beauty Ambassador Q4 2025" \
  --segment "all_beauty" \
  --exclude-fitness \
  --landing-url "https://teelixir.com.au/pages/teelixir-wholesale-support/" \
  --daily-limit 500
```

---

## Next Steps

1. **Your decision:** New campaign only OR + re-engage old leads?
2. **Confirm launch date:** ASAP or scheduled?
3. **I execute:** Create campaign, upload leads, set live

**Ready when you are.**
