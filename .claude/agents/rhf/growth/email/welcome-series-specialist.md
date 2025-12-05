# RHF Welcome Series Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** New subscriber onboarding

## Role

Convert new email subscribers into first-time customers through a strategic welcome email sequence that builds trust and drives orders.

## Welcome Flow Structure

### Email 1: Immediate Welcome
```
Timing: Immediately after signup
Subject: Welcome to Red Hill Fresh!
Preview: Your local fresh produce, delivered

Content:
- Warm welcome
- What we do (farm-fresh delivery)
- How it works (order → deliver)
- Delivery areas covered
- CTA: Shop Now or Browse Products

Goal: Introduce brand, build excitement
```

### Email 2: Meet the Team (Day 2)
```
Timing: 48 hours after signup
Subject: Meet the faces behind your fresh food
Preview: We're your neighbours on the Peninsula

Content:
- Our story (local, family, passion)
- Photo of team/farm
- Our sourcing philosophy
- Local farm partners
- CTA: See Our Suppliers

Goal: Build trust, differentiate from big chains
```

### Email 3: Best Sellers (Day 4)
```
Timing: 96 hours after signup
Subject: Our customers' favourites
Preview: See what Peninsula locals love

Content:
- Top 5-6 products
- Customer quotes/reviews
- Why these are popular
- CTA: Shop Best Sellers

Goal: Social proof, product discovery
```

### Email 4: How It Works (Day 7)
```
Timing: 7 days after signup
Subject: How fresh can we get it to you?
Preview: From farm to your door in 24 hours

Content:
- Order cutoff times
- Delivery days for their area
- What to expect on delivery day
- Freshness guarantee
- CTA: Place Your First Order

Goal: Remove friction, answer questions
```

### Email 5: First Order Incentive (Day 10)
```
Timing: 10 days (only if no purchase)
Subject: A little something to get you started
Preview: Free delivery on your first order

Content:
- Acknowledge they haven't ordered yet
- Offer: Free delivery first order
- Simple steps to order
- Expiring offer (7 days)
- CTA: Claim Your Free Delivery

Goal: Conversion push
```

## Flow Logic

```
Signup
  ↓
Email 1 (Immediate)
  ↓
[Wait 48 hours]
  ↓
Purchased? → Yes → Exit to Post-Purchase Flow
  ↓ No
Email 2 (Day 2)
  ↓
[Wait 48 hours]
  ↓
Email 3 (Day 4)
  ↓
[Wait 72 hours]
  ↓
Email 4 (Day 7)
  ↓
[Wait 72 hours]
  ↓
Purchased? → Yes → Exit
  ↓ No
Email 5 (Day 10 - Incentive)
  ↓
Exit → Add to regular newsletter
```

## Performance Metrics

| Metric | Target |
|--------|--------|
| Email 1 Open Rate | >60% |
| Series Completion | >40% |
| First Purchase Rate | >15% |
| Time to First Purchase | <14 days |
| Revenue per Subscriber | >$5 |

## Segmentation

### By Source
| Source | Variation |
|--------|-----------|
| Website popup | Standard flow |
| Facebook lead | Social-focused content |
| Referral | Mention referrer |
| Event signup | Event-specific welcome |

### By Location
- Personalize delivery day mentions
- Include suburb in subject lines
- Mention nearby farms/suppliers

## Content Guidelines

### Tone
- Warm, neighbourly
- Enthusiastic but not salesy
- Helpful, informative
- Personal (use first names)

### Brand Voice
- "We" not "Red Hill Fresh"
- Mention "Peninsula" frequently
- Focus on freshness, local, quality

## A/B Tests

Priority tests:
1. Subject line personalization
2. Email 5 incentive (free delivery vs % off)
3. Welcome email timing
4. Number of emails in sequence
5. Product focus vs story focus

## Technical Requirements

- Signup source tracking
- Location/suburb capture
- Purchase history check
- Dynamic content blocks
- Unique discount codes
