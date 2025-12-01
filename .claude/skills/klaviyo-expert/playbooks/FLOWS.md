# Klaviyo Flows Playbook

## Flow Architecture

### Flow Components

```
Trigger
  ↓
Trigger Filter (optional)
  ↓
Time Delay
  ↓
Conditional Split (optional)
  ↓
Action (Email/SMS)
  ↓
Next Step...
```

---

## Welcome Series

### Purpose
Convert new subscribers into first-time buyers with brand introduction and incentive.

### BOO Welcome Flow (7 emails)

```
Email 1: Welcome + 10% Discount
  Trigger: Added to Newsletter list
  Delay: Immediate
  Content:
  - Welcome message
  - Brand story snippet
  - 10% discount code
  - Top categories

Email 2: Brand Story
  Delay: 2 days
  Content:
  - Our mission
  - Organic commitment
  - Behind the scenes
  - Shop by value (organic, vegan, etc.)

Email 3: Best Sellers
  Delay: 2 days
  Condition: Has NOT placed order
  Content:
  - Top 10 products
  - Customer reviews
  - Category highlights

Email 4: Social Proof
  Delay: 3 days
  Condition: Has NOT placed order
  Content:
  - Customer testimonials
  - Instagram highlights
  - Community stories

Email 5: Category Deep Dive
  Delay: 3 days
  Condition: Has NOT placed order
  Content:
  - Superfoods spotlight
  - Personal care essentials
  - Pantry staples

Email 6: Our Values
  Delay: 4 days
  Condition: Has NOT placed order
  Content:
  - Sustainability practices
  - Certifications
  - Local sourcing

Email 7: Final Discount Reminder
  Delay: 7 days
  Condition: Has NOT placed order
  Content:
  - Discount expiring soon
  - Urgency messaging
  - One-click shop button
```

### Teelixir Welcome Flow (7 emails)

```
Email 1: Welcome to Teelixir
  Trigger: Added to Newsletter
  Delay: Immediate
  Content:
  - Welcome + mushroom education intro
  - 15% first order discount
  - Quick product guide

Email 2: Mushroom 101
  Delay: 2 days
  Content:
  - Introduction to medicinal mushrooms
  - Benefits overview
  - How to use guide

Email 3: Product Spotlight - Lion's Mane
  Delay: 3 days
  Condition: Has NOT placed order
  Content:
  - Brain & focus benefits
  - Usage suggestions
  - Customer stories

Email 4: Product Spotlight - Reishi
  Delay: 3 days
  Condition: Has NOT placed order
  Content:
  - Sleep & relaxation benefits
  - Evening ritual ideas

Email 5: Stack Building
  Delay: 3 days
  Condition: Has NOT placed order
  Content:
  - How to combine mushrooms
  - Daily routine suggestions
  - Bundle savings

Email 6: Founder Story
  Delay: 4 days
  Condition: Has NOT placed order
  Content:
  - Julze's journey
  - Quality commitment
  - Sourcing story

Email 7: Final Offer
  Delay: 7 days
  Condition: Has NOT placed order
  Content:
  - Discount reminder
  - Free shipping threshold
  - Best sellers
```

---

## Abandoned Cart Flow

### Purpose
Recover lost sales from shoppers who added items but didn't purchase.

### Standard 3-Email Structure

```
Email 1: Cart Reminder (1 hour)
  Trigger: Added to Cart
  Filter: Has NOT Placed Order (since trigger)
  Delay: 1 hour
  Subject: "Did you forget something?"
  Content:
  - Cart contents
  - Product images
  - Return to cart button
  - No discount yet

Email 2: Benefits + Social Proof (24 hours)
  Delay: 23 hours after Email 1
  Condition: Has NOT placed order
  Subject: "Your cart is waiting..."
  Content:
  - Cart contents
  - Product benefits
  - Customer reviews
  - Shipping/returns info

Email 3: Final Call + Discount (48 hours)
  Delay: 24 hours after Email 2
  Condition: Has NOT placed order
  Subject: "Last chance: 10% off your cart"
  Content:
  - Cart contents
  - 10% discount code
  - Urgency messaging
  - Expires soon notice
```

### Cart Email Best Practices

```
Subject Lines:
- "You left something behind..."
- "Your cart misses you"
- "Still thinking about it?"
- "Don't let these sell out!"

Content Elements:
✓ Product images
✓ Product names + prices
✓ Clear CTA button
✓ Trust badges
✓ Support contact
✓ Mobile-optimized
```

---

## Browse Abandonment Flow

### Purpose
Re-engage shoppers who viewed products but didn't add to cart.

### 2-Email Structure

```
Email 1: Product Reminder (4 hours)
  Trigger: Viewed Product
  Filter:
  - Has NOT Added to Cart (since trigger)
  - Viewed 2+ products
  Delay: 4 hours
  Subject: "Still looking?"
  Content:
  - Recently viewed products
  - Related products
  - Category browse link

Email 2: Social Proof (24 hours)
  Delay: 20 hours after Email 1
  Condition: Has NOT Added to Cart
  Subject: "Others loved these too"
  Content:
  - Viewed products
  - Customer reviews
  - Best sellers in category
```

---

## Post-Purchase Flow

### Purpose
Build loyalty, gather reviews, and encourage repeat purchases.

### Standard Structure

```
Email 1: Thank You (Immediate)
  Trigger: Placed Order
  Delay: Immediate (after order confirmation)
  Content:
  - Thank you message
  - Order summary
  - What to expect next
  - Contact info

Email 2: Product Tips (3 days)
  Trigger: Fulfilled Order
  Delay: 3 days
  Content:
  - Usage tips
  - Storage instructions
  - Recipe/usage ideas
  - FAQ

Email 3: Review Request (7 days)
  Trigger: Fulfilled Order
  Delay: 7 days
  Condition: Order value > $30
  Content:
  - Review request
  - Direct product links
  - Incentive (optional discount)
```

### Teelixir Post-Purchase (Education Focus)

```
Email 1: Order Confirmed
  - Welcome to mushroom journey
  - What's coming

Email 2: Your Mushrooms Arrived (3 days after ship)
  - Unboxing guide
  - Storage tips
  - First use suggestions

Email 3: Day 7 Check-in
  - How's it going?
  - Tips for consistency
  - Dosage guide

Email 4: Day 14 Education
  - What to expect over time
  - Stacking suggestions
  - Community stories

Email 5: Day 21 Review Request
  - Request feedback
  - Share your experience
  - Refer a friend
```

---

## Win-Back Flow

### Purpose
Re-activate lapsed customers who haven't purchased in 60+ days.

### 3-Email Structure

```
Email 1: We Miss You (60 days)
  Trigger: Placed Order
  Delay: 60 days
  Filter: Has NOT Placed Order (since trigger)
  Subject: "It's been a while..."
  Content:
  - Miss you message
  - What's new
  - New products/categories

Email 2: Special Offer (75 days)
  Delay: 15 days after Email 1
  Condition: Has NOT Placed Order
  Subject: "A special offer just for you"
  Content:
  - 15% discount code
  - Personalized recommendations
  - Free shipping offer

Email 3: Final Attempt (90 days)
  Delay: 15 days after Email 2
  Condition: Has NOT Placed Order
  Subject: "Last chance to save"
  Content:
  - Bigger discount (20%)
  - Limited time
  - Best sellers
```

---

## Subscription Flows (Teelixir)

### Subscription Reminder

```
Email 1: Upcoming Shipment (3 days before)
  Trigger: Subscription Created
  Recurring: Each cycle
  Delay: 3 days before renewal
  Content:
  - Shipment reminder
  - Edit/skip option
  - Add items suggestion

Email 2: Shipment Processed
  Trigger: Subscription Charged
  Content:
  - Confirmation
  - Tracking info coming
  - Thank you
```

### Subscription Win-Back

```
Email 1: We Noticed You Left (1 day after cancel)
  Trigger: Subscription Cancelled
  Delay: 1 day
  Content:
  - Sorry to see you go
  - Feedback request
  - Special offer to return

Email 2: Changed Your Mind? (7 days)
  Delay: 6 days after Email 1
  Content:
  - Benefits reminder
  - Easy reactivation
  - Discount offer
```

---

## Seasonal/Campaign Flows

### Birthday Flow

```
Email 1: Birthday Offer (7 days before)
  Trigger: Profile Date Field
  Content:
  - Birthday wishes
  - Exclusive discount
  - Gift recommendations

Email 2: Birthday Reminder (On day)
  Delay: 7 days
  Condition: Has NOT redeemed
  Content:
  - It's your day!
  - Discount reminder
  - Easy shop link
```

### VIP Flow

```
Entry Condition: Lifetime Value > $500

Email 1: VIP Welcome
  Trigger: Enters segment
  Content:
  - Thank you for loyalty
  - VIP perks
  - Exclusive access

Ongoing VIP Benefits:
  - Early access to sales
  - Exclusive products
  - Higher discount tier
```

---

## Flow Testing Checklist

```
Before Launch:
[ ] Email content proofread
[ ] Links tested
[ ] Images loading
[ ] Mobile preview checked
[ ] Discount codes working
[ ] Merge tags correct
[ ] Unsubscribe working

Trigger/Filter Check:
[ ] Trigger condition correct
[ ] Filters properly set
[ ] Time delays appropriate
[ ] Conditional splits tested

Post-Launch:
[ ] Monitor first 24 hours
[ ] Check delivery rates
[ ] Review open/click rates
[ ] Watch for complaints
```

---

## Flow Performance Benchmarks

| Flow Type | Open Rate | Click Rate | Conversion |
|-----------|-----------|------------|------------|
| Welcome | 40-50% | 8-12% | 5-10% |
| Abandoned Cart | 35-45% | 10-15% | 5-15% |
| Browse Abandon | 25-35% | 5-8% | 2-5% |
| Post-Purchase | 50-60% | 10-20% | N/A |
| Win-Back | 15-25% | 3-5% | 1-3% |

---

## Optimization Tips

### Timing
- Welcome: Immediate first email
- Cart abandon: 1 hour optimal
- Browse: 4+ hours
- Win-back: Test 30 vs 60 vs 90 days

### Personalization
- Use first name
- Show viewed/cart products
- Recommend based on history
- Segment by category preference

### A/B Testing
- Subject lines (5-10% sample)
- Send times
- Discount amounts
- Number of emails in flow
