# Wholesale Onboarding Automation Plan
## Elevate Wholesale - Hotspot Business Outreach System

**Status:** Planning Phase
**Date:** November 2025
**Related Systems:** Elevate Wholesale B2B Automation (existing), SmartLead, HubSpot, Shopify B2B

---

## Executive Summary

Automated system to:
1. Import Google Maps scraped business leads into HubSpot
2. Create Shopify B2B trial accounts with wholesale pricing access
3. Run a 30-day email sequence with discount offers
4. Track all engagement back to HubSpot
5. Deactivate non-engaged accounts automatically
6. Provide sales rep dashboard to control lead flow

---

## Current State (What Already Exists)

### Infrastructure In Place

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Database | ✅ Ready | `trial_customers`, `customer_activity_log`, `email_queue` tables |
| HubSpot CRM | ✅ Ready | Custom properties for trial tracking |
| Shopify B2B Integration | ✅ Ready | Account creation, discount codes, tags |
| Unleashed Inventory | ✅ Ready | Customer sync |
| SmartLead API Client | ✅ Ready | Full integration for cold email |
| n8n Workflows | ✅ Ready | SmartLead-HubSpot sync templates |
| Edge Functions | ✅ Ready | form-intake, hubspot-to-shopify-sync, sync-trial-expirations |

### Existing Email Workflow (HubSpot)
- Day 0: Welcome email
- Day 7: Reminder if no login
- Day 15: Mid-trial check-in
- Day 23: Expiry warning
- Day 30: Trial expired

---

## Proposed System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LEAD ACQUISITION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Google Maps ──► Apify/Scraper ──► CSV/JSON ──► Lead Queue (Supabase)      │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SALES REP DASHBOARD                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Simple Web UI:                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────────────┐ │
│  │ Add 20 Leads│  │ Add 50 Leads│  │ Queue Status: 150 pending | 50 active│ │
│  └─────────────┘  └─────────────┘  └──────────────────────────────────────┘ │
│                                                                              │
│  Today's Batch: [Business List with Phone/Email for follow-up]              │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ACCOUNT PROVISIONING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  For each lead in batch:                                                     │
│  1. Create HubSpot Contact + Company                                         │
│  2. Create Shopify B2B Customer + Company                                    │
│  3. Generate unique trial discount code                                      │
│  4. Apply "trial" + "trial_expires_YYYY-MM-DD" tags                         │
│  5. Create Unleashed customer record                                         │
│  6. Store all IDs back to HubSpot                                           │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EMAIL SEQUENCE (30 Days)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Day 0  │ Welcome + Account Created + Login Instructions                    │
│  Day 2  │ "How Easy It Is To Order" - Step-by-step guide                   │
│  Day 5  │ Product Highlights + Free Shipping Reminder                       │
│  Day 10 │ Reminder: Have you logged in? (if no login detected)              │
│  Day 15 │ Mid-trial check-in + Best Sellers                                 │
│  Day 20 │ ONE-TIME DISCOUNT OFFER (10-15% extra)                            │
│  Day 25 │ 5 Days Left - Don't Miss Out                                      │
│  Day 28 │ Final Reminder - Offer Closing Soon                               │
│  Day 30 │ Trial Ended - Account Deactivated                                 │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENGAGEMENT TRACKING                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Track → Sync to HubSpot:                                                    │
│  • Email opens                                                               │
│  • Email link clicks                                                         │
│  • Shopify login events                                                      │
│  • First order date/amount                                                   │
│  • Total orders/spend during trial                                           │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ACCOUNT DEACTIVATION (Day 30)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Daily Cron Job Checks:                                                      │
│  • Trial end date = today?                                                   │
│  • Has customer logged in? (Shopify login events)                            │
│  • Has customer clicked any email link?                                      │
│  • Has customer placed any orders?                                           │
│                                                                              │
│  If NO engagement → DEACTIVATE:                                              │
│  1. Disable discount code in Shopify                                         │
│  2. Remove "wholesale" tag OR disable B2B customer                           │
│  3. Update HubSpot: trial_status = "deactivated"                            │
│  4. Send final "offer closed" email                                          │
│                                                                              │
│  If HAS engagement → CONVERT or EXTEND:                                      │
│  1. Update HubSpot: trial_status = "engaged" or "converted"                 │
│  2. Keep account active                                                      │
│  3. Sales rep follow-up task created                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Lead Acquisition (Google Maps Scraping)

**Tools:**
- **Apify** (recommended) - Has Google Maps scraper actors, $49/mo for 100K results
- **Outscraper** - Alternative, pay-per-result
- **PhantomBuster** - Alternative with browser automation

**Data Fields to Capture:**
```json
{
  "business_name": "string",
  "business_type": "string (e.g., Health Food Store, Gym, Spa)",
  "address": "string",
  "city": "string",
  "state": "string",
  "postcode": "string",
  "phone": "string",
  "website": "string",
  "email": "string (if available, often not)",
  "google_rating": "number",
  "review_count": "number",
  "place_id": "string (for deduplication)",
  "scraped_at": "datetime"
}
```

**Lead Queue Table (New):**
```sql
CREATE TABLE wholesale_lead_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Business Info (from scraper)
  business_name TEXT NOT NULL,
  business_type TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Address
  street_address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,

  -- Scrape metadata
  source TEXT DEFAULT 'google_maps',
  google_place_id TEXT UNIQUE,
  google_rating DECIMAL(2,1),
  google_review_count INTEGER,

  -- Queue status
  queue_status TEXT DEFAULT 'pending',
  -- Values: 'pending', 'queued_for_processing', 'processing', 'processed', 'rejected', 'duplicate'

  -- Processing info
  processed_at TIMESTAMPTZ,
  processed_by TEXT, -- sales rep email
  batch_id TEXT, -- groups leads processed together

  -- Validation
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,

  -- Link to trial_customers after processing
  trial_customer_id UUID REFERENCES trial_customers(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2. Sales Rep Dashboard

**Technology Options:**
- **Option A:** Retool (no-code, connects to Supabase directly) - Fastest
- **Option B:** Simple Next.js app with Supabase auth
- **Option C:** n8n webhook + form for MVP

**Dashboard Features:**

```
┌────────────────────────────────────────────────────────────────┐
│  ELEVATE WHOLESALE - LEAD PROCESSOR                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Lead Queue Stats:                                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Pending: 847 │ Today: 35    │ This Week:   │ Converted:   │ │
│  │              │              │ 150          │ 12 (8%)      │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [🚀 Process Next 20 Leads]  [📦 Process Next 50 Leads]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Today's Batch (for phone follow-up):                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ☐ Fresh Health Foods - Sydney - 0412 XXX XXX         │    │
│  │ ☐ Wellness Warehouse - Melbourne - 0423 XXX XXX      │    │
│  │ ☐ Body & Soul Organics - Brisbane - 0434 XXX XXX     │    │
│  │ ... (expandable list)                                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Active Trials (need attention):                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ • 5 trials expiring in 3 days (no orders)              │    │
│  │ • 3 trials with abandoned carts                        │    │
│  │ • 2 trials opened email but no login                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**API Endpoints Required:**
1. `GET /api/queue/stats` - Queue statistics
2. `POST /api/queue/process` - Process N leads from queue
3. `GET /api/queue/today-batch` - Get today's processed leads
4. `GET /api/trials/attention-needed` - Trials needing follow-up

---

### 3. Account Provisioning (Existing + Modifications)

**Current Flow (works):**
```
Form Submit → form-intake → HubSpot → hubspot-to-shopify-sync → Shopify + Unleashed
```

**New Flow:**
```
Dashboard "Process 20"
    → batch-process-leads (new function)
    → For each lead:
        1. Create HubSpot Contact + Company
        2. Call hubspot-to-shopify-sync (existing)
        3. Log to customer_activity_log
        4. Update lead queue status
    → Return batch summary
```

**New Edge Function: `batch-process-leads`**
```typescript
// Pseudo-code
export async function handler(req) {
  const { count, processedBy } = req.body // 20 or 50

  // Get next N pending leads
  const leads = await supabase
    .from('wholesale_lead_queue')
    .select('*')
    .eq('queue_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(count)

  const batchId = generateBatchId()
  const results = []

  for (const lead of leads) {
    try {
      // 1. Create HubSpot contact
      const hubspotContact = await createHubSpotContact(lead)

      // 2. Trigger Shopify sync (existing function)
      await triggerShopifySync(hubspotContact.id)

      // 3. Update lead queue
      await updateLeadStatus(lead.id, 'processed', batchId)

      results.push({ success: true, lead })
    } catch (error) {
      results.push({ success: false, lead, error })
    }
  }

  return { batchId, results }
}
```

---

### 4. Email Sequence Design

**Option A: HubSpot Workflows (Recommended)**
- Native to existing infrastructure
- Better deliverability for transactional emails
- Automatic engagement tracking

**Option B: SmartLead**
- Better for cold outreach at scale
- More sending accounts (warmup)
- Might hit spam more

**Recommended: Hybrid Approach**
- SmartLead for initial cold outreach (before account creation)
- HubSpot for all post-signup transactional emails

**Email Sequence (HubSpot Workflow):**

| Day | Email | Trigger Condition | Content |
|-----|-------|-------------------|---------|
| 0 | Welcome | Account created | Login credentials, discount code, what to expect |
| 2 | How to Order | Sent to all | Step-by-step ordering guide, video walkthrough |
| 5 | Product Highlights | Sent to all | Best sellers, free shipping over $300 |
| 10 | Login Reminder | IF no_login | "We noticed you haven't logged in yet..." |
| 15 | Mid-Trial | Sent to all | Check-in, featured products, success stories |
| 20 | Special Offer | Sent to all | ONE-TIME 15% extra discount code, expires in 5 days |
| 25 | 5 Days Left | Sent to all | Urgency, offer expiring, what you'll lose |
| 28 | Final Warning | IF no_order | "Last chance before we close your trial" |
| 30 | Trial Ended | IF no_order | "Your trial has ended, account deactivated" |
| 30 | Keep Active | IF has_order | "Thanks for ordering! Your account is now permanent" |

**HubSpot Properties Required (additions to existing):**
- `email_clicked_any` (boolean)
- `last_email_click_at` (datetime)
- `one_time_discount_code` (text)
- `one_time_discount_used` (boolean)

---

### 5. Engagement Tracking

**Events to Track:**

| Event | Source | Sync To HubSpot |
|-------|--------|-----------------|
| Email opened | HubSpot native | Automatic |
| Email link clicked | HubSpot native | Automatic |
| Shopify login | Shopify webhook | Custom sync |
| Product viewed | Shopify webhook | Custom sync |
| Cart created | Shopify webhook | Custom sync |
| Order placed | Shopify webhook | Existing sync |

**Shopify Login Tracking:**
- Shopify doesn't have a native "login" webhook
- **Solution:** Track "customer update" events where `last_login_at` changes
- Or: Use Shopify Flow (if available) to trigger on login

**Alternative Login Detection:**
```javascript
// Check if customer has accessed their account
// by monitoring Shopify customer.updated webhook
// and checking if accepts_marketing or tags changed after invite

// Or use Shopify Analytics API to check session data
```

---

### 6. Account Deactivation Logic

**Daily Cron Job Enhancement (`sync-trial-expirations`):**

```typescript
// Enhanced expiration logic
export async function syncTrialExpirations() {
  // Get trials expiring today
  const expiringTrials = await getExpiringTrials()

  for (const trial of expiringTrials) {
    const engagement = await checkEngagement(trial.id)

    if (engagement.hasOrders) {
      // CONVERT - Keep active
      await updateTrialStatus(trial.id, 'converted')
      await hubspot.updateContact(trial.hubspot_contact_id, {
        trial_status: 'converted'
      })
      // Don't disable anything

    } else if (engagement.hasLogin || engagement.hasEmailClick) {
      // ENGAGED but no purchase - warm lead
      await updateTrialStatus(trial.id, 'engaged_expired')
      await hubspot.updateContact(trial.hubspot_contact_id, {
        trial_status: 'engaged_expired'
      })
      // Create follow-up task for sales rep
      await createSalesTask(trial)
      // Disable discount but keep account accessible
      await disableDiscountCode(trial.trial_coupon_code)

    } else {
      // NO ENGAGEMENT - Deactivate fully
      await updateTrialStatus(trial.id, 'deactivated')
      await hubspot.updateContact(trial.hubspot_contact_id, {
        trial_status: 'deactivated'
      })
      // Disable discount code
      await disableDiscountCode(trial.trial_coupon_code)
      // Remove wholesale access
      await shopify.removeCustomerTags(trial.shopify_customer_id, ['trial', 'wholesale'])
      // Send deactivation email
      await triggerDeactivationEmail(trial.hubspot_contact_id)
    }
  }
}

async function checkEngagement(trialId) {
  const trial = await getTrial(trialId)
  return {
    hasOrders: trial.order_count > 0,
    hasLogin: trial.login_count > 0,
    hasEmailClick: trial.email_clicked_any === true,
    totalSpend: trial.total_order_value
  }
}
```

---

## Complications & Challenges

### 1. Google Maps Scraping

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Terms of Service** | Google prohibits scraping; risk of IP blocks | Use Apify (handles proxies), respect rate limits |
| **Missing Email Addresses** | Most Google Maps listings don't have emails | Enrich with Hunter.io/Apollo, or use website scraper |
| **Data Quality** | Outdated/incorrect business info | Verify phone/email before processing, mark invalid |
| **Duplicate Leads** | Same business scraped multiple times | Dedupe on `google_place_id` or `business_name + postcode` |

**Email Enrichment Options:**
- Hunter.io - $49/mo for 500 searches
- Apollo.io - $49/mo for 10K credits
- Clearbit - Enterprise pricing
- Manual website lookup (cheapest)

### 2. Shopify B2B Customer Deactivation

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **No "disable customer" API** | Can't fully lock out customer | Remove B2B company association, remove tags |
| **Customer can still login** | They just can't see B2B prices | This might actually be OK - they see retail prices |
| **Discount codes persist** | Code still exists even if disabled | Set expiry date on code creation |

**Shopify Deactivation Strategy:**
1. Disable discount code (REST API) ✅ Works
2. Remove "wholesale" and "trial" tags ✅ Works
3. Remove customer from B2B Company ⚠️ GraphQL only
4. Customer can still login but sees retail prices ✅ Acceptable

### 3. Email Deliverability

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Cold outreach spam risk** | Emails go to spam | Use SmartLead with warmup, not HubSpot for cold |
| **Volume limits** | HubSpot limits sending | Batch processing (20-50/day) helps |
| **Unsubscribes** | Required by law | Include unsubscribe in all emails, sync to HubSpot |

**Recommendation:**
- SmartLead for pre-qualification cold outreach (optional phase)
- HubSpot for all post-account-creation emails (better deliverability)

### 4. Tracking "Clicked on Link"

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **Privacy blockers** | Apple Mail hides clicks | Track conversions (orders) as backup metric |
| **Link click ≠ engagement** | Bots can click links | Require 2+ clicks or login for "engaged" status |

### 5. HubSpot API Rate Limits

| Limit | Impact | Mitigation |
|-------|--------|------------|
| 100 requests/10 seconds | Batch processing slows down | Use batch APIs where available |
| 500K API calls/day | Not a concern at 50 leads/day | Monitor usage |

### 6. Sales Rep Pacing

| Challenge | Impact | Mitigation |
|-----------|--------|------------|
| **50 leads = 50 calls** | Rep can't handle all in one day | Show "today's batch" prominently for follow-up |
| **Batch timing** | Processing at wrong time | Allow rep to trigger when ready |
| **Quality vs Quantity** | Bad leads waste time | Add lead scoring/filtering before queue |

### 7. Data Privacy (Australian Privacy Act)

| Requirement | Implementation |
|-------------|----------------|
| Consent | Include opt-out in all emails |
| Right to deletion | Add "delete my data" process |
| Data minimization | Only collect necessary fields |
| Transparency | Privacy policy link in emails |

---

## Implementation Phases

### Phase 1: Lead Queue & Dashboard (Week 1-2)
- [ ] Create `wholesale_lead_queue` table in Supabase
- [ ] Build simple dashboard (Retool or Next.js)
- [ ] API endpoints for queue management
- [ ] Test with manual CSV import

### Phase 2: Google Maps Integration (Week 2-3)
- [ ] Set up Apify account
- [ ] Configure Google Maps scraper actor
- [ ] Build import pipeline to Supabase
- [ ] Add deduplication logic
- [ ] Email enrichment (Hunter.io integration)

### Phase 3: Account Provisioning (Week 3-4)
- [ ] Create `batch-process-leads` edge function
- [ ] Integrate with existing HubSpot-Shopify sync
- [ ] Test end-to-end: Queue → HubSpot → Shopify → Unleashed
- [ ] Add batch tracking and error handling

### Phase 4: Email Sequence (Week 4-5)
- [ ] Design email templates (9 emails)
- [ ] Build HubSpot workflow with branching logic
- [ ] Add engagement tracking properties
- [ ] Test full sequence with test accounts

### Phase 5: Deactivation Logic (Week 5-6)
- [ ] Enhance `sync-trial-expirations` function
- [ ] Add engagement checking
- [ ] Implement Shopify tag removal
- [ ] Test deactivation flow

### Phase 6: Dashboard Enhancements (Week 6-7)
- [ ] Add "attention needed" alerts
- [ ] Conversion tracking
- [ ] Sales rep activity log
- [ ] Basic reporting

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead-to-Account Conversion | 100% | All queued leads get accounts |
| Trial-to-Customer Conversion | 10-15% | Orders during trial |
| Email Open Rate | 40%+ | HubSpot analytics |
| Email Click Rate | 10%+ | HubSpot analytics |
| Login Rate | 50%+ | Shopify tracking |
| Average Order Value | $300+ | Shopify analytics |

---

## Cost Estimate (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Apify | $49 | 100K results/mo |
| Hunter.io | $49 | 500 email lookups |
| HubSpot | Existing | Already using |
| SmartLead | Existing | Already using |
| Supabase | Existing | Already using |
| Retool | $0-50 | Free tier might work |
| **Total** | ~$100-150/mo | Plus existing infrastructure |

---

## Questions to Resolve Before Building

1. **Email enrichment priority:** Should we enrich emails before queuing, or process leads with just phone numbers?

2. **Cold outreach phase:** Do we want a SmartLead cold email before creating accounts, or go straight to account creation?

3. **Lead quality filter:** Any minimum requirements (e.g., 4+ star rating, 10+ reviews)?

4. **Sales rep capacity:** How many leads per day can realistically be followed up on?

5. **One-time discount:** What percentage? 10%? 15%? On top of wholesale pricing?

6. **Trial extension:** If someone engages late (day 28), do we extend their trial?

7. **Re-activation:** Can deactivated leads be re-activated if they call in?

---

## Files to Create/Modify

### New Files
- `infra/supabase/schema-wholesale-lead-queue.sql`
- `elevate-wholesale/supabase/functions/batch-process-leads/index.ts`
- `elevate-wholesale/dashboard/` (if building custom)
- `scripts/import-google-maps-leads.ts`
- `docs/email-templates/wholesale-trial-sequence/`

### Files to Modify
- `elevate-wholesale/supabase/functions/sync-trial-expirations/index.ts` (add engagement checks)
- `elevate-wholesale/supabase/migrations/001_initial_schema.sql` (add new columns)
- HubSpot (workflow configuration - no code)

---

## Next Steps

1. **Answer the questions above** - need your input on business decisions
2. **Approve this plan** - any changes or additions?
3. **Start Phase 1** - create lead queue table and basic dashboard
