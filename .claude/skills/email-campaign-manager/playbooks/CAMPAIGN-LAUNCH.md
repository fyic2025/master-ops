# Campaign Launch Playbook

Step-by-step guide for launching email campaigns.

## Pre-Launch Checklist

### 1. Lead List Preparation

```bash
# Validate email list
npx tsx .claude/skills/email-campaign-manager/scripts/email-validator.ts leads.csv

# Review validation report
cat leads-validation-report.json
```

**Must Pass:**
- [ ] Valid email rate > 95%
- [ ] Bounce risk: LOW or MEDIUM
- [ ] No more than 5% role emails
- [ ] No more than 1% disposable domains
- [ ] All suppressed emails removed

### 2. Campaign Configuration

**For Smartlead Cold Outreach:**

```typescript
const campaignConfig = {
  name: 'Campaign Name - YYYY-MM',
  timezone: 'Australia/Sydney',
  dailyLimit: 200,
  sequences: [
    {
      number: 1,
      delayDays: 0,
      subject: 'Subject Line 1',
      body: 'Email body with {{first_name}} personalization'
    },
    {
      number: 2,
      delayDays: 3,
      subject: 'Re: Subject Line 1',
      body: 'Follow-up body'
    },
    {
      number: 3,
      delayDays: 5,
      subject: 'Quick question',
      body: 'Final follow-up'
    }
  ]
};
```

**For Anniversary Emails:**

```sql
-- Check automation config
SELECT * FROM tlx_automation_config WHERE automation_type = 'anniversary_15';

-- Verify it's enabled and limits are set
-- daily_limit: 50
-- send_window_start: 9 (AEST)
-- send_window_end: 19 (AEST)
```

### 3. Deliverability Check

```bash
# Run health check
npx tsx .claude/skills/email-campaign-manager/scripts/deliverability-monitor.ts check

# Must have:
# - All Gmail OAuth: healthy
# - Smartlead API: healthy
# - Bounce rate < 3%
```

### 4. Test Email

```typescript
// Send test to internal addresses first
const testRecipients = [
  'jayson@fyic.com.au',
  'colette@teelixir.com'
];

for (const email of testRecipients) {
  await sendTestEmail(campaignConfig.sequences[0], email);
  console.log(`Test sent to ${email}`);
}
```

**Verify:**
- [ ] Email received (not in spam)
- [ ] Personalization renders correctly
- [ ] Links work
- [ ] Unsubscribe link present
- [ ] Mobile formatting looks good

---

## Launch Procedure

### Smartlead Campaign

**Step 1: Create Campaign**
```bash
npx tsx scripts/create-smartlead-campaigns.ts
```

**Step 2: Upload Leads**
```typescript
// Leads uploaded via API
// Campaign should show in Smartlead dashboard
```

**Step 3: Configure Sequences**
```typescript
// Add all email sequences
// Set delays between sequences
// Enable reply detection
```

**Step 4: Activate Campaign**
```typescript
// In Smartlead dashboard:
// 1. Review campaign settings
// 2. Set start date
// 3. Click "Start Campaign"
```

**Step 5: Log to Database**
```typescript
await supabase.from('smartlead_campaigns').update({
  status: 'active'
}).eq('campaign_id', campaignId);
```

### Anniversary Automation

**Step 1: Verify Candidates**
```sql
SELECT COUNT(*) FROM v_tlx_anniversary_candidates
WHERE send_date <= CURRENT_DATE;
```

**Step 2: Enable Automation**
```sql
UPDATE tlx_automation_config
SET enabled = true
WHERE automation_type = 'anniversary_15';
```

**Step 3: Run Send Script**
```bash
npx tsx teelixir/scripts/send-anniversary-emails.ts
```

**Step 4: Monitor Progress**
```sql
SELECT status, COUNT(*)
FROM tlx_anniversary_discounts
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

---

## Monitoring (First 24 Hours)

### Hour 1-2: Initial Delivery

```sql
-- Check delivery status
SELECT
  status,
  COUNT(*) as count
FROM smartlead_emails
WHERE sent_at > NOW() - INTERVAL '2 hours'
GROUP BY status;
```

**Alert If:**
- Bounce rate > 5%
- Delivery rate < 90%
- Any errors in logs

### Hour 4-8: Engagement

```sql
-- Check opens and clicks
SELECT
  event_type,
  COUNT(*) as count
FROM smartlead_engagement
WHERE occurred_at > NOW() - INTERVAL '8 hours'
GROUP BY event_type;
```

**Healthy Signs:**
- Open rate > 15%
- Some clicks occurring
- No spam complaints

### Hour 24: First Day Summary

```bash
# Generate report
npx tsx .claude/skills/email-campaign-manager/scripts/campaign-analytics.ts all 1
```

**Review:**
- Total sent vs delivered
- Open rate benchmarks
- Reply rate (for cold outreach)
- Any issues to address

---

## Pause Procedure

**When to Pause:**
- Bounce rate > 5%
- Multiple spam complaints
- Technical issues (OAuth, API)
- Client request

**How to Pause:**

```typescript
// Smartlead - via dashboard or API
await fetch(`https://server.smartlead.ai/api/v1/campaigns/${campaignId}/pause`, {
  method: 'POST',
  headers: { 'api-key': process.env.SMARTLEAD_API_KEY }
});

// Update database
await supabase.from('smartlead_campaigns').update({
  status: 'paused'
}).eq('campaign_id', campaignId);
```

**For Anniversary/Winback:**
```sql
UPDATE tlx_automation_config
SET enabled = false
WHERE automation_type IN ('anniversary_15', 'winback_40');
```

---

## Post-Campaign Review

### After Campaign Ends

```bash
# Generate final report
npx tsx .claude/skills/email-campaign-manager/scripts/campaign-analytics.ts all 30
```

### Metrics to Capture

| Metric | Target | Actual |
|--------|--------|--------|
| Total Sent | - | |
| Delivery Rate | >95% | |
| Open Rate | >20% | |
| Click Rate | >3% | |
| Reply Rate (cold) | >5% | |
| Conversion Rate | >2% | |
| Bounce Rate | <3% | |
| Unsubscribe Rate | <1% | |

### Lessons Learned

Document:
1. What worked well
2. What could improve
3. Subject lines that performed
4. Best send times
5. Audience segments that responded

### Update Suppression List

```bash
# Process all bounces
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process

# Verify suppression list updated
```

---

## Quick Reference Commands

```bash
# Validate leads
npx tsx .claude/skills/email-campaign-manager/scripts/email-validator.ts <file.csv>

# Health check
npx tsx .claude/skills/email-campaign-manager/scripts/deliverability-monitor.ts check

# Campaign analytics
npx tsx .claude/skills/email-campaign-manager/scripts/campaign-analytics.ts all 30

# Process bounces
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts process

# Bounce report
npx tsx .claude/skills/email-campaign-manager/scripts/bounce-manager.ts report 7
```
