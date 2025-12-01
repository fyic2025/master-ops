# Email Copy Templates

Ready-to-use templates for all email types.

---

## Campaign Email Templates

### Sale/Promotion

```
Subject: [X]% off everything - [timeframe] only
Preview: Stock up on your favorites and save

---

Hi {{ first_name|default:"there" }},

[Bold statement about the sale]

For [timeframe] only, enjoy [X]% off [scope of sale].

Use code: [CODE] at checkout

SHOP BY CATEGORY:
[Category 1 - link]
[Category 2 - link]
[Category 3 - link]

[Product highlights grid - 3-4 products]

Offer ends [date/time].
Don't wait - your favorites won't last!

[CTA: Shop the Sale]

[Signature]

---

[Footer]
```

### New Product Launch

```
Subject: Introducing [Product Name]
Preview: [One-line benefit statement]

---

Hi {{ first_name|default:"there" }},

We're excited to introduce something new.

[PRODUCT NAME]
[Product image]

[2-3 sentence product description highlighting key benefit]

Why you'll love it:
✓ [Benefit 1]
✓ [Benefit 2]
✓ [Benefit 3]

[If launch offer] Be one of the first to try it
and get [offer] with code [CODE].

[CTA: Shop Now]

[Signature]

---

[Footer]
```

### Newsletter

```
Subject: [This week/month] at [Brand]
Preview: [Main topic or highlight]

---

Hi {{ first_name|default:"there" }},

[Personal opening - 1-2 sentences]

📖 IN THIS ISSUE:
• [Topic 1]
• [Topic 2]
• [Topic 3]

---

[SECTION 1 HEADING]
[Content paragraph]
[CTA or link]

---

[SECTION 2 HEADING]
[Content paragraph]
[CTA or link]

---

SHOP SPOTLIGHT:
[Product with brief description]
[CTA: Shop Now]

---

Thanks for reading!

[Signature]

---

[Social links]
[Footer]
```

### Flash Sale

```
Subject: ⚡ [X] HOURS ONLY: [Offer]
Preview: Quick - this won't last!

---

Hi {{ first_name|default:"there" }},

FLASH SALE ⚡

For the next [X] hours only:
[OFFER DETAILS]

[Countdown timer or end time]

No code needed - discount applied automatically.

[Product grid - 3-4 sale items]

[CTA: Shop Flash Sale]

Hurry - ends [time/date]!

[Signature]

---

[Footer]
```

---

## Automated Flow Templates

### Welcome Series - Email 1

```
Subject: Welcome to [Brand]! 🎉
Preview: Your wellness journey starts here

---

Hi {{ first_name|default:"there" }},

Welcome to the [Brand] family!

We're thrilled you've joined us on this wellness journey.
Here's what you can expect:

📧 [Frequency] emails with tips, offers, and new arrivals
🎁 Exclusive subscriber-only deals
📚 Wellness guides and how-to content

[If welcome offer:]
As a thank you, here's [X]% off your first order.
Use code: WELCOME[X]

[CTA: Start Shopping]

Explore our most popular:
[3 product thumbnails]

Have questions? Just reply to this email - we read
and respond to every message.

Welcome aboard!

[Signature]

---

[Footer]
```

### Abandoned Cart - Email 1

```
Subject: Did you forget something?
Preview: Your cart is waiting

---

Hi {{ first_name|default:"there" }},

Looks like you left some goodies behind!

[YOUR CART]
{% for item in event.Items %}
{{ item.ProductName }}
{{ item.Quantity }} x ${{ item.Price }}
{% endfor %}

[CTA: Return to Cart]

Why shop with us:
✓ Free shipping over $[X]
✓ [X]-day returns
✓ Quality guaranteed

Need help deciding? Reply to this email and
our team will assist you.

[Signature]

---

[Footer]
```

### Review Request

```
Subject: How's {{ event.Items[0].ProductName }} working for you?
Preview: We'd love your feedback

---

Hi {{ first_name|default:"there" }},

It's been about [X] days since you received
{{ event.Items[0].ProductName }}.

We hope you're loving it! If you have a moment,
we'd really appreciate your honest review.

[CTA: Leave a Review]

Your feedback:
• Helps other customers make informed decisions
• Helps us improve our products
• Takes less than 2 minutes

[Product image]

As a thank you for reviewing, you'll receive
[incentive if applicable].

Thank you for being a valued customer!

[Signature]

---

[Footer]
```

### Birthday Email

```
Subject: 🎂 Happy Birthday, {{ first_name }}!
Preview: A special gift just for you

---

Happy Birthday, {{ first_name }}! 🎉

It's your special day, and we wanted to celebrate YOU.

Here's a birthday gift from us:
[X]% OFF your order

Use code: BIRTHDAY[X]
Valid for [X] days

[CTA: Claim Your Gift]

Treat yourself to something special:
[Product recommendations]

Wishing you a wonderful birthday!

[Signature]

---

[Footer]
```

---

## Business-Specific Templates

### BOO - Wellness Focus

```
Subject: Nourish your body with [benefit]
Preview: Discover natural wellness solutions

---

Hi {{ first_name|default:"there" }},

Your wellness journey matters to us.

This week, we're highlighting products that support
[wellness goal]:

[Product 1 with brief benefit description]
[Product 2 with brief benefit description]
[Product 3 with brief benefit description]

Quick wellness tip:
[Helpful tip related to products]

[CTA: Shop Wellness Essentials]

To your health,
The Buy Organics Online Team

---

[Footer]
```

### Teelixir - Educational Focus

```
Subject: Unlock the power of [mushroom/adaptogen]
Preview: Ancient wisdom for modern wellness

---

Hi {{ first_name|default:"there" }},

For centuries, [ingredient] has been revered
in traditional medicine for its remarkable properties.

THE BENEFITS:
• [Traditional benefit 1]
• [Traditional benefit 2]
• [Traditional benefit 3]

HOW TO USE:
[Brief usage instructions]

SHOP [INGREDIENT]:
[Product options]

[CTA: Experience the Power]

To your transformation,
The Teelixir Team

---

[Footer]
```

### Elevate - B2B Focus

```
Subject: New high-margin products for your store
Preview: Stock up on customer favorites

---

Hi {{ first_name|default:"there" }},

We've added new products your customers will love
(and your margins will appreciate).

NEW ARRIVALS:
[Product 1] - [Margin]% margin
[Product 2] - [Margin]% margin
[Product 3] - [Margin]% margin

Current best sellers in your category:
[Product list]

[CTA: View Wholesale Prices]

Questions? Contact your account manager:
[Contact details]

Best regards,
The Elevate Wholesale Team

---

[Footer]
```

### RHF - Local Focus

```
Subject: Fresh this week from local farms 🌿
Preview: Just-picked produce delivered to your door

---

Hi {{ first_name|default:"there" }},

Here's what's fresh this week from our
Mornington Peninsula farmers:

🥬 [Produce 1] - from [Farm Name]
🍅 [Produce 2] - from [Farm Name]
🥕 [Produce 3] - from [Farm Name]

FARM SPOTLIGHT:
[Brief story about featured farm/producer]

RECIPE IDEA:
[Simple recipe using featured produce]

[CTA: Shop This Week's Fresh Picks]

Supporting local, together.
The Red Hill Fresh Team

---

[Footer]
```

---

## Subject Line Templates

### By Email Type

**Welcome:**
```
Welcome to [Brand]! 🎉
Welcome, {{ first_name }}! Here's [X]% off
You're in! Here's what to expect
```

**Promotional:**
```
[X]% off [category] - [timeframe] only
Your [season] essentials are here
Stock up & save on [category]
```

**Abandoned Cart:**
```
Did you forget something?
Your cart misses you
Still thinking about {{ event.Items[0].ProductName }}?
```

**Post-Purchase:**
```
Order confirmed! #{{ event.OrderNumber }}
Your order is on its way! 📦
How's your {{ event.Items[0].ProductName }}?
```

**Winback:**
```
We miss you, {{ first_name|default:"friend" }}!
It's been a while... come back for [X]% off
See what you've been missing
```

**Review Request:**
```
How's {{ event.Items[0].ProductName }} working for you?
Share your experience with {{ event.Items[0].ProductName }}
Your opinion matters - leave a quick review?
```

---

## Quick Copy Blocks

### Trust Signals

```
Why shop with us:
✓ Free shipping over $[X]
✓ [X]-day easy returns
✓ Quality guaranteed
✓ Australian owned & operated
```

### Urgency Elements

```
⏰ Offer ends [date/time]
⚡ Limited stock available
🏃 While supplies last
📅 [X] days left to save
```

### Social Proof

```
⭐⭐⭐⭐⭐ Rated by [X]+ customers
"[Short testimonial]" - [Name]
Trusted by [X]+ Australians
#1 best seller in [category]
```

### Value Props by Business

**BOO:**
```
✓ Certified organic products
✓ Free shipping over $99
✓ Australian owned since [year]
✓ 100% satisfaction guarantee
```

**Teelixir:**
```
✓ Premium dual-extracted formulas
✓ Tested for purity & potency
✓ Ancient wisdom, modern quality
✓ Free shipping over $75
```

**Elevate:**
```
✓ Competitive wholesale pricing
✓ Low MOQs
✓ Marketing support included
✓ Dedicated account manager
```

**RHF:**
```
✓ Locally sourced produce
✓ Supporting Peninsula farmers
✓ Fresh delivery guarantee
✓ Family owned & operated
```
