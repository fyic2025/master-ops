# Retention Playbook

Step-by-step guides for customer retention interventions.

---

## Daily Churn Check

### Morning Routine (9 AM AEST)

1. **Run churn scorer**
```bash
npx tsx .claude/skills/customer-churn-predictor/scripts/churn-scorer.ts --min-risk 0.6
```

2. **Review critical customers**
- Check customers with >80% churn probability
- Note high-value customers ($500+ lifetime)

3. **Generate interventions**
```bash
npx tsx .claude/skills/customer-churn-predictor/scripts/intervention-recommender.ts --min-risk 0.6
```

4. **Execute priority interventions**
- Immediate: Personal outreach for critical VIPs
- High: Queue winback emails
- Medium: Add to automated nurture

---

## Intervention by Risk Level

### Critical Risk (80%+)

**Teelixir:**
1. Send MISSYOU40 winback email
2. Personalize with customer name + last product
3. Follow up in 3 days if no response

**Elevate:**
1. Personal phone call from account manager
2. Offer 14-day trial extension
3. Schedule product demo

**BOO:**
1. Send COMEBACK25 discount
2. Highlight new arrivals in their category
3. Free shipping on next order

**RHF:**
1. VIP20 discount code
2. Free delivery offer
3. Personalized produce box suggestion

### High Risk (60-80%)

**Teelixir:**
1. Anniversary email with 15% discount
2. Educational content about their product
3. Recipe/usage tips

**Elevate:**
1. Feature highlight email
2. Free shipping offer
3. Testimonials from similar businesses

**BOO:**
1. Bundle discount (BUNDLE10)
2. Related products email
3. Category newsletter feature

**RHF:**
1. Free delivery reminder
2. Seasonal produce highlight
3. Meal planning content

### Medium Risk (30-60%)

- Add to re-engagement email sequence
- Send product recommendations
- Include in next promotional campaign

---

## Winback Campaign (Teelixir)

### Prerequisites
- Customer in Klaviyo unengaged segment
- 90+ days since last purchase
- Not already sent winback in last 60 days

### Execution

1. **Sync unengaged pool**
```bash
npx tsx teelixir/scripts/sync-klaviyo-unengaged.ts
```

2. **Send winback emails**
```bash
npx tsx teelixir/scripts/send-winback-emails.ts
```

3. **Monitor conversions**
```bash
npx tsx teelixir/scripts/reconcile-winback-conversions.ts
```

### Success Metrics
- Target open rate: 25%+
- Target click rate: 5%+
- Target conversion rate: 2%+

---

## Trial Rescue (Elevate)

### Signs of Trial Churn
- No login in 5+ days
- Zero orders with 7+ days in trial
- Only 1 login total

### Rescue Sequence

**Day 5 (No activity):**
```
Subject: Quick question about your trial, {firstname}
Action: Offer to schedule a quick call
```

**Day 10 (Still no activity):**
```
Subject: Your trial expires in {days} days
Action: Highlight key features, offer extension
```

**Day 13 (Critical):**
```
Subject: Last chance - {firstname}
Action: Final extension offer + personal discount
```

### Personal Outreach Script
```
Hi {firstname},

I noticed you signed up for Elevate but haven't had a chance to explore yet.
I'd love to understand what you're looking for and make sure our platform
is a good fit for {business_name}.

Do you have 10 minutes for a quick call? I can:
- Walk you through our most popular products
- Set up your first order
- Answer any questions about wholesale pricing

Let me know what works for you.

Best,
[Account Manager]
```

---

## RFM Segment Actions

### Champions (R5F5M5)
- **Don't**: Send discounts (unnecessary)
- **Do**: Ask for reviews, referrals
- **Action**: VIP treatment, early access, loyalty rewards

### At Risk (R1-2F4-5)
- **Urgent**: These are valuable customers slipping away
- **Action**: Personal outreach, exclusive offer, feedback request
- **Script**: "We miss you! Here's 25% off to welcome you back"

### Hibernating (R1-2F1-2)
- **Low priority**: But still worth attempting
- **Action**: Strong offer (30-40% off) or deprioritize
- **Script**: "It's been a while - here's a special offer"

### New Customers (R5F1)
- **Critical**: Shape their behavior early
- **Action**: Welcome series, second purchase incentive
- **Script**: "Thanks for your first order! Here's 10% off your next"

---

## Cohort Review (Weekly)

### Analysis Steps

1. **Run cohort analysis**
```bash
npx tsx .claude/skills/customer-churn-predictor/scripts/cohort-analysis.ts
```

2. **Compare retention rates**
- Compare recent cohorts to historical
- Identify underperforming cohorts

3. **Investigate anomalies**
- Check acquisition source for bad cohorts
- Review product mix differences
- Check for pricing/promo changes

4. **Action items**
- Adjust acquisition targeting if needed
- Update onboarding for new customers
- Modify retention offers based on data

---

## Emergency Churn Response

### Trigger
- 50+ high-risk customers in single day
- Major product issue or stockout
- Negative press or social media event

### Response

1. **Assess scope**
```bash
npx tsx scripts/churn-scorer.ts --business all > churn-emergency.txt
```

2. **Segment affected customers**
- By revenue impact
- By acquisition source
- By product category

3. **Craft response**
- Acknowledge issue if known
- Offer appropriate compensation
- Personalize based on customer value

4. **Execute outreach**
- Critical: Personal email/call within 24h
- High: Automated email within 48h
- Medium: Include in next campaign

5. **Monitor results**
- Track response rates
- Measure churn prevention
- Document learnings

---

## Metrics to Track

| Metric | Target | Frequency |
|--------|--------|-----------|
| Monthly churn rate | <5% | Monthly |
| 90-day retention | >60% | Monthly |
| Winback conversion | >2% | Weekly |
| At-risk customer count | Declining | Daily |
| Average LTV | Increasing | Monthly |
| RFM segment distribution | Stable | Weekly |
