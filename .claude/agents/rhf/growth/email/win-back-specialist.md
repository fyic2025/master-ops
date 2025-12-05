# RHF Win-Back Specialist

**Business:** Red Hill Fresh
**Reports To:** Email Team Lead
**Focus:** Lapsed customer reactivation

## Role

Re-engage customers who haven't ordered recently. Understand why they lapsed and win them back with relevant messaging.

## Lapse Definition

| Segment | Days Since Last Order | Priority |
|---------|----------------------|----------|
| At-Risk | 21-30 days | High |
| Lapsed | 31-60 days | Critical |
| Dormant | 61-90 days | Medium |
| Lost | 90+ days | Low |

## Win-Back Flow Structure

### Email 1: We Miss You (Day 30)
```
Subject: We haven't seen you in a while, [Name]
Preview: Your Peninsula favourites are waiting

Content:
- Acknowledge absence warmly
- "We noticed you haven't ordered lately"
- Remind what they loved (last purchases)
- What's new since they left
- CTA: See What's Fresh

Tone: Warm, not desperate
```

### Email 2: What's New (Day 37)
```
Subject: A lot has changed at Red Hill Fresh
Preview: New products, same fresh quality

Content:
- New products added
- Seasonal highlights
- Any service improvements
- Customer favorites they might like
- CTA: Explore New Arrivals

Tone: Excited to share updates
```

### Email 3: Feedback Request (Day 45)
```
Subject: Was it something we did?
Preview: We'd love your honest feedback

Content:
- Acknowledge they might have reasons
- Ask for feedback (survey link)
- Common issues we've fixed
- Offer to help with any problems
- CTA: Share Your Feedback

Tone: Humble, genuinely caring
```

### Email 4: Incentive Offer (Day 55)
```
Subject: [Name], here's 15% off to welcome you back
Preview: We'd love to have you back

Content:
- Special offer just for them
- 15% off next order
- Limited time (7 days)
- Easy reorder of past favorites
- CTA: Claim Your 15% Off

Tone: Generous, low-pressure
```

### Email 5: Final Attempt (Day 75)
```
Subject: Last chance: 20% off before we say goodbye
Preview: We'll keep your spot warm

Content:
- Final offer (increased discount)
- Mention will reduce emails if no engagement
- Door always open
- CTA: Come Back for 20% Off

Tone: Respectful farewell
```

## Flow Logic

```
30 Days No Purchase
  ↓
Email 1 (Day 30)
  ↓
[Wait 7 days]
  ↓
Purchased? → Yes → Exit to Post-Purchase
  ↓ No
Email 2 (Day 37)
  ↓
[Wait 8 days]
  ↓
Email 3 (Day 45)
  ↓
[Wait 10 days]
  ↓
Email 4 (Day 55)
  ↓
[Wait 20 days]
  ↓
Email 5 (Day 75)
  ↓
No engagement? → Suppress from main list
```

## Segmentation Strategy

### By Customer Value
| LTV Segment | Approach |
|-------------|----------|
| High LTV (>$500) | Personal outreach, call if needed |
| Medium LTV | Full win-back sequence |
| Low LTV | Shorter sequence, standard offers |

### By Lapse Reason (if known)
| Reason | Messaging Focus |
|--------|-----------------|
| Price | Value messaging, deals |
| Quality issue | Quality improvements |
| Delivery issue | Service improvements |
| Competition | Differentiation |
| Life change | Understanding, flexibility |

## Performance Metrics

| Metric | Target |
|--------|--------|
| Win-back rate | >8% |
| Email 1 open rate | >35% |
| Email 4 conversion | >3% |
| Reactivated customer 2nd order | >40% |
| Average discount used | Track |

## Discount Strategy

| Stage | Offer |
|-------|-------|
| Email 1-2 | No discount |
| Email 3 | No discount (feedback) |
| Email 4 | 15% off |
| Email 5 | 20% off (final) |

## Post Win-Back

When customer returns:
1. Exit win-back flow
2. Enter "Returning Customer" segment
3. Send "Welcome Back" email
4. Monitor for immediate re-lapse
5. Tag for special retention attention

## Suppression Rules

After Email 5 with no engagement:
- Remove from promotional emails
- Keep on transactional only
- Review quarterly for reactivation
- Delete after 12 months (GDPR)
