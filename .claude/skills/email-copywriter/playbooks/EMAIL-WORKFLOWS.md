# Email Workflow Playbooks

## Campaign Email Workflow

### Step 1: Planning

```
Campaign Brief:
- Goal: [What do we want to achieve?]
- Audience: [Who are we targeting?]
- Offer: [What's the value proposition?]
- Timing: [When should it send?]
- Success Metric: [How do we measure success?]
```

### Step 2: Copy Creation

**Subject Line (3 variations for A/B testing):**
```
A: [Primary hook - benefit focused]
B: [Alternative angle - curiosity]
C: [Personalized or question-based]
```

**Preview Text:**
```
[Expand on subject, add value, 40-90 chars]
```

**Email Body:**
```
Opening: [Hook - 1-2 sentences max]

Value Prop: [What's in it for them]

Details: [Offer specifics, product highlights]

Support: [Social proof, trust signals]

CTA: [Clear action button]

Closing: [Urgency or reminder]
```

### Step 3: Review Checklist

```
Content:
[ ] Brand voice consistent
[ ] No spelling/grammar errors
[ ] Benefits clearly stated
[ ] CTA compelling
[ ] Compliant with regulations

Technical:
[ ] Subject <50 chars
[ ] Preview text complete
[ ] Links correct
[ ] Tracking parameters added
[ ] Mobile optimized
```

### Step 4: Send & Monitor

- A/B test for 2-4 hours
- Send winner to remaining
- Monitor real-time stats
- Document results

---

## Welcome Series Workflow

### Series Overview

| Email | Timing | Goal | Subject |
|-------|--------|------|---------|
| 1 | Immediate | Welcome, set expectations | Welcome to [Brand]! |
| 2 | Day 2 | Brand story | Why we do what we do |
| 3 | Day 4 | Social proof | See why customers love us |
| 4 | Day 7 | First purchase | Our most-loved products |
| 5 | Day 10 | Offer reminder | Don't miss your welcome offer |

### Email 1: Welcome

```
Subject: Welcome to [Brand]! Here's what to expect
Preview: Your wellness journey starts now

---

Hi {{ first_name|default:"there" }},

Welcome to [Brand]! We're so glad you're here.

[1-2 sentences about what they signed up for]

Here's what you can expect from us:
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

[If welcome offer] As a thank you, here's [X]% off your first order.
Use code: WELCOME[X]

[CTA: Shop Now / Explore]

To your wellness,
The [Brand] Team

---

[Social links]
[Unsubscribe | Preferences]
```

### Email 2: Brand Story

```
Subject: Why we do what we do
Preview: The story behind [Brand]

---

Hi {{ first_name|default:"there" }},

Every brand has a story. Here's ours.

[2-3 paragraphs about origin, mission, values]

We believe in:
• [Value 1]
• [Value 2]
• [Value 3]

[CTA: Learn More About Us]

[Signature]

---

[Footer]
```

### Email 3: Social Proof

```
Subject: See why [X]+ customers love us
Preview: Real reviews from real customers

---

Hi {{ first_name|default:"there" }},

Don't just take our word for it.

[Include 2-3 customer testimonials with photos if possible]

"[Testimonial quote]" - [Customer Name], [Location]

[Product they purchased]

[CTA: Read More Reviews / Shop Best Sellers]

[Signature]

---

[Footer]
```

### Email 4: Best Sellers

```
Subject: Our most-loved products
Preview: Discover customer favorites

---

Hi {{ first_name|default:"there" }},

Not sure where to start? Our customers' favorites
are a great place.

[Product grid: 3-4 best sellers with images, names, prices]

Why customers love these:
• [Reason 1]
• [Reason 2]

[If offer still active] Remember, you still have [X]% off
with code WELCOME[X]

[CTA: Shop Best Sellers]

[Signature]

---

[Footer]
```

### Email 5: Final Reminder

```
Subject: Don't miss your welcome offer
Preview: [X]% off expires soon

---

Hi {{ first_name|default:"there" }},

Just a friendly reminder - your welcome offer
expires [date/soon].

Use code WELCOME[X] for [X]% off your first order.

[Product recommendations or best sellers]

Ready to start your wellness journey?

[CTA: Claim Your Offer]

See you soon,
The [Brand] Team

---

[Footer]
```

---

## Abandoned Cart Workflow

### Series Overview

| Email | Timing | Goal | Discount |
|-------|--------|------|----------|
| 1 | 1 hour | Remind | None |
| 2 | 24 hours | Overcome objections | None |
| 3 | 48-72 hours | Create urgency | Optional small |

### Email 1: Cart Reminder

```
Subject: You left something behind
Preview: Your cart is waiting for you

---

Hi {{ first_name|default:"there" }},

Looks like you left something in your cart!

[Dynamic cart contents - product image, name, price]

Complete your order and enjoy:
✓ [Benefit 1 - e.g., Free shipping over $X]
✓ [Benefit 2 - e.g., Quality guarantee]

[CTA: Complete Purchase]

Need help? Just reply to this email.

[Signature]

---

[Footer]
```

### Email 2: Benefits & Trust

```
Subject: Still thinking about {{ event.Items[0].ProductName }}?
Preview: Here's why you'll love it

---

Hi {{ first_name|default:"there" }},

We noticed you were checking out {{ event.Items[0].ProductName }}.

Here's why our customers love it:

[Product benefits - 3 bullet points]

⭐⭐⭐⭐⭐
"[Short customer review about product]"
- [Customer Name]

Still in your cart:
[Cart contents]

[CTA: Return to Cart]

Questions? We're here to help.

[Signature]

---

[Footer]
```

### Email 3: Urgency (with optional discount)

```
Subject: Your cart expires soon
Preview: Don't miss out on {{ event.Items[0].ProductName }}

---

Hi {{ first_name|default:"there" }},

Your cart won't wait forever!

[Dynamic cart contents]

[If using discount:]
As a thank you for considering us, here's
10% off to complete your order.

Use code: SAVE10

[If not using discount:]
Complete your order today and enjoy
free shipping on orders over $[X].

[CTA: Complete Purchase Now]

This is our last reminder - we'd hate for you to miss out!

[Signature]

---

[Footer]
```

---

## Post-Purchase Workflow

### Series Overview

| Email | Timing | Goal |
|-------|--------|------|
| 1 | Immediate | Confirm order |
| 2 | Shipped | Tracking info |
| 3 | Day 7 | Check-in + review |
| 4 | Replenishment | Reorder |

### Email 1: Order Confirmation

```
Subject: Order confirmed! #{{ event.OrderNumber }}
Preview: Thanks for your purchase

---

Hi {{ first_name|default:"there" }},

Thank you for your order! 🎉

Order #{{ event.OrderNumber }}
Placed: {{ event.Date }}

What you ordered:
[Dynamic order contents]

Subtotal: ${{ event.Subtotal }}
Shipping: ${{ event.Shipping }}
Total: ${{ event.Total }}

What happens next:
1. We're preparing your order
2. You'll receive tracking when it ships
3. Expected delivery: [timeframe]

Questions? Reply to this email.

[CTA: Track Order Status]

[Signature]

---

[Footer]
```

### Email 2: Shipping Notification

```
Subject: Your order is on its way! 📦
Preview: Track your delivery

---

Hi {{ first_name|default:"there" }},

Great news - your order has shipped!

Tracking Number: {{ event.TrackingNumber }}
Carrier: {{ event.Carrier }}
Expected Delivery: {{ event.EstimatedDelivery }}

[CTA: Track Package]

While you wait, here's how to get the most from your products:
[Product usage tips]

[Signature]

---

[Footer]
```

### Email 3: Follow-up + Review Request

```
Subject: How are you enjoying {{ event.Items[0].ProductName }}?
Preview: We'd love to hear from you

---

Hi {{ first_name|default:"there" }},

It's been about a week since your order arrived.
How are you liking {{ event.Items[0].ProductName }}?

Quick tips to get the most from your purchase:
• [Tip 1]
• [Tip 2]
• [Tip 3]

We'd love to hear your thoughts! Your feedback helps
other customers and helps us improve.

[CTA: Leave a Review]

Have questions? We're always here to help.

[Signature]

---

[Footer]
```

### Email 4: Replenishment

```
Subject: Time to restock {{ event.Items[0].ProductName }}?
Preview: Easy reorder - just one click

---

Hi {{ first_name|default:"there" }},

Based on when you purchased, you might be
running low on {{ event.Items[0].ProductName }}.

Reorder with one click:
[Product with reorder button]

Never run out again:
[If subscription available] Subscribe & save [X]%

[CTA: Reorder Now]

[Signature]

---

[Footer]
```

---

## Winback Workflow

### Series Overview

| Email | Timing | Goal |
|-------|--------|------|
| 1 | 60 days | Soft re-engagement |
| 2 | Day +3 | Show what's new |
| 3 | Day +7 | Offer incentive |

### Email 1: We Miss You

```
Subject: We haven't seen you in a while
Preview: We miss you, {{ first_name|default:"friend" }}

---

Hi {{ first_name|default:"there" }},

It's been a while since we've seen you,
and we wanted to check in.

Is everything okay? We're here if you need anything.

In case you missed it, here's what's new:
• [New product or feature 1]
• [New product or feature 2]
• [Update or improvement]

[CTA: See What's New]

Hope to see you soon!

[Signature]

---

[Footer]
```

### Email 2: What's New

```
Subject: Look what you've been missing
Preview: New arrivals you'll love

---

Hi {{ first_name|default:"there" }},

A lot has happened since your last visit!

NEW ARRIVALS:
[Product grid - 3-4 new products]

TRENDING NOW:
[2-3 best sellers]

[CTA: Explore New Arrivals]

[Signature]

---

[Footer]
```

### Email 3: Win Back Offer

```
Subject: Come back for [X]% off
Preview: An exclusive offer just for you

---

Hi {{ first_name|default:"there" }},

We miss having you around, so we'd love to
welcome you back with a special offer.

Here's [X]% off your next order.

Use code: COMEBACK[X]
Expires: [Date]

[Featured products or recommendations]

[CTA: Shop Now & Save]

Hope to see you soon!

[Signature]

---

[Footer]
```

---

## Quick Copy Templates

### Subject Lines by Type

**Promotional:**
- [X]% off [category] - this week only
- New: [Product Name] just dropped
- Your exclusive offer inside

**Educational:**
- How to [achieve benefit] with [product]
- The complete guide to [topic]
- [X] mistakes you're making with [topic]

**Social Proof:**
- See why [X] customers love [product]
- Our #1 best seller (and why)
- "[Short quote]" - [Customer]

**Urgency:**
- Ending tonight: [offer]
- Last chance: [product] almost gone
- Only [X] left in stock

**Personalized:**
- {{ first_name }}, we picked this for you
- Based on your last order...
- {{ first_name }}, don't forget your cart

### CTA Button Text

| Email Type | Primary CTA | Secondary CTA |
|------------|-------------|---------------|
| Promotional | Shop Now | View All |
| Welcome | Start Shopping | Learn More |
| Abandoned Cart | Complete Purchase | View Cart |
| Post-Purchase | Track Order | Shop Again |
| Review Request | Leave Review | Contact Us |
| Winback | Shop Now | See What's New |
