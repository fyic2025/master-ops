# Beauty Campaign Launch Notes
## Complete Checklist - December 2025

---

## Quick Start

```bash
# Test first (no changes made)
npm run beauty-campaign:dry-run

# Execute campaign setup
npm run beauty-campaign
```

---

## Pre-Launch Checklist

### Environment Setup
- [ ] `.env` file exists with:
  ```
  SUPABASE_URL=https://qcvfxxsnqvdfmpbcgdni.supabase.co
  SUPABASE_ANON_KEY=<anon_key>
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
  SMARTLEAD_API_KEY=<smartlead_api_key>
  ```
- [ ] Node dependencies installed: `npm install`

### Smartlead Account Status
- [ ] Smartlead account active
- [ ] Email accounts connected and warmed (minimum 10)
- [ ] Monthly email quota available (~18,000 emails for 4,500 leads x 4 emails)
- [ ] No active campaigns conflicting with same leads

### Database Status
- [ ] Supabase accessible
- [ ] `businesses` table has beauty leads with `lead_id LIKE 'beauty%'`
- [ ] Leads have valid emails and business names

---

## What Gets Automated

| Step | Method | Details |
|------|--------|---------|
| 1. Fetch leads | Supabase query | ~4,500 beauty leads, excludes fitness |
| 2. Create campaign | `campaigns.create()` | Name: "Beauty Ambassador Q4 2025" |
| 3. Upload sequence | `campaigns.saveSequence()` | 4 emails over 7 days |
| 4. Upload leads | `leads.add()` | Batches of 100, rate limited |
| 5. Assign accounts | `emailAccounts.addToCampaign()` | All active email accounts |
| 6. Set schedule | `campaigns.updateSchedule()` | Mon-Fri 9am-5pm AEST |
| 7. Configure settings | `campaigns.updateSettings()` | Open tracking OFF, click ON |

---

## What Requires Manual Action

### Before Running Script
| Task | Where | Time |
|------|-------|------|
| Verify email accounts are warmed | Smartlead Dashboard > Email Accounts | 2 min |
| Check quota remaining | Smartlead Dashboard > Settings | 1 min |
| Confirm no duplicate campaigns | Smartlead Dashboard > Campaigns | 1 min |

### After Running Script
| Task | Where | Time |
|------|-------|------|
| Review campaign in dashboard | `https://app.smartlead.ai/campaigns/{id}` | 5 min |
| Verify email sequences look correct | Campaign > Sequences | 3 min |
| Check leads uploaded properly | Campaign > Leads | 2 min |
| **ACTIVATE CAMPAIGN** | Campaign > Settings > Start | 1 min |

---

## Campaign Configuration

### Target Audience
```
All beauty leads (lead_id LIKE 'beauty%') with:
- Massage & Spa
- Hair & Beauty Salons
- Cosmetic/Aesthetic Clinics
- Wellness Centers
- Nail Salons
- Skincare/Beauty Therapists

EXCLUDING:
- Fitness studios
- Gyms
- Personal trainers
```

### Landing Page
```
https://teelixir.com.au/pages/teelixir-wholesale-support/
```

With UTM tracking:
```
?utm_source=smartlead&utm_medium=email&utm_campaign=beauty_ambassador_q4_2025
```

### Email Sequence

| Email | Day | Subject | Purpose |
|-------|-----|---------|---------|
| 1 | 0 | Partnership opportunity - {{company_name}} | Value introduction |
| 2 | 3 | Re: Partnership - {{company_name}} | Commission tiers |
| 3 | 5 | {{company_name}} - wellness product revenue | Benefits recap |
| 4 | 7 | Final follow-up - {{company_name}} | Breakup email |

### Schedule Settings
```javascript
{
  timezone: 'Australia/Sydney',
  days_of_the_week: [1, 2, 3, 4, 5],  // Mon-Fri
  start_hour: 9,
  end_hour: 17,
  min_time_btw_emails: 3,             // minutes
  max_new_leads_per_day: 500
}
```

### Tracking Settings
```javascript
{
  track_settings: {
    open: false,    // OFF for deliverability
    click: true     // ON for link tracking
  },
  stop_lead_settings: {
    stop_on_reply: true,
    stop_on_auto_reply: false,
    stop_on_link_click: false
  }
}
```

---

## Expected Results

### Lead Volume
| Segment | Est. Count |
|---------|------------|
| Massage & Spa | ~1,850 |
| Hair & Beauty | ~1,900 |
| Cosmetic/Skin | ~700 |
| Other Beauty | ~500 |
| **Total** | **~4,500** |

### Projected Performance
| Metric | Conservative | Target | Best Case |
|--------|--------------|--------|-----------|
| Reply Rate | 2.5% | 3.6% | 5.0% |
| Replies | 112 | 162 | 225 |
| Qualified | 34 | 49 | 68 |
| New Accounts | 7 | 10 | 14 |
| Revenue | $3.5K-$10K | $5K-$15K | $7K-$21K |

### Timeline
| Day | Event |
|-----|-------|
| 0 | Run script, activate campaign |
| 1-3 | Email 1 sends to all leads |
| 4-6 | Email 2 sends to non-responders |
| 6-8 | Email 3 sends to non-responders |
| 8-10 | Email 4 sends to non-responders |
| 11+ | Campaign complete, follow up replies |

---

## Troubleshooting

### Script Errors

**"Cannot find module"**
```bash
npm install
```

**"Missing environment variables"**
- Ensure `.env` file exists with all required keys

**"Smartlead API not available"**
- Check `SMARTLEAD_API_KEY` is correct
- Verify Smartlead account is active

**"Error fetching leads"**
- Check Supabase credentials
- Verify network connectivity

### Campaign Issues

**Low delivery rate (<95%)**
- Check email account warmup status
- Reduce daily send limit
- Review bounce reasons in Smartlead

**Low reply rate (<2%)**
- Check email content rendering
- Verify personalization tokens work
- Review subject lines

**Leads not showing in campaign**
- Check for duplicate emails in other campaigns
- Verify email format is valid
- Review upload errors in script output

---

## API Limitations Reference

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| 100 leads per upload | Requires batching | Script handles automatically |
| 10 req/2 sec rate limit | Slower uploads | Built-in rate limiter |
| No campaign activation API | Manual step required | Activate in dashboard |
| No A/B test API | Single variant only | Create separate campaigns |
| No inbox access via API | Can't read replies | Use webhooks or dashboard |

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/launch-beauty-campaign-automated.ts` | Main automation script |
| `BEAUTY-LEADS-CAMPAIGN-PLAN-DEC2025.md` | Full campaign strategy |
| `FINAL-BEAUTY-CAMPAIGN-EMAILS.md` | Email templates |
| `shared/libs/integrations/smartlead/client.ts` | Smartlead API client |
| `.env` | Environment configuration |

---

## Contacts & Support

- **Smartlead Dashboard:** https://app.smartlead.ai
- **Smartlead API Docs:** https://helpcenter.smartlead.ai/en/articles/125-full-api-documentation
- **Supabase Dashboard:** https://app.supabase.com/project/qcvfxxsnqvdfmpbcgdni

---

## Launch Command Sequence

```bash
# 1. Ensure you're in the project directory
cd /home/user/master-ops

# 2. Install dependencies (if not done)
npm install

# 3. Test with dry run
npm run beauty-campaign:dry-run

# 4. Review output, then execute
npm run beauty-campaign

# 5. Note the campaign ID from output

# 6. Go to Smartlead dashboard and ACTIVATE
# https://app.smartlead.ai/campaigns/{CAMPAIGN_ID}
```

---

## Post-Launch Monitoring

### Daily Checks
- [ ] Check delivery rate (target: >95%)
- [ ] Review bounces and unsubscribes
- [ ] Respond to replies within 4 hours
- [ ] Monitor spam complaints

### Weekly Review
- [ ] Export campaign analytics
- [ ] Calculate conversion rates
- [ ] Qualify interested leads
- [ ] Update lead status in database

---

## Notes

- Campaign excludes all fitness-related leads (separate campaign track)
- Open tracking disabled to improve deliverability
- Plain text disabled - using HTML with minimal styling
- Personalization uses `{{company_name}}` token only
- All links point to single landing page with UTM tracking

---

**Last Updated:** December 1, 2025
**Status:** Ready to Launch
