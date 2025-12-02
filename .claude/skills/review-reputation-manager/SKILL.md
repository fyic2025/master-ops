---
name: review-reputation-manager
description: Online reputation and review management across all businesses. Manages Google Business Profile, product reviews, UGC aggregation, and review responses. Use for reputation monitoring and review management.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Review & Reputation Manager Skill

> Expert-level online reputation and review management across all businesses.

---

## Skill Identity

**Name:** review-reputation-manager
**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-01

---

## Capabilities

### Core Functions

1. **Google Business Profile Management**
   - Review monitoring
   - Review responses
   - Profile optimization
   - Photo management
   - Q&A management

2. **Product Review Management**
   - Review collection
   - Review moderation
   - UGC aggregation
   - Star rating optimization

3. **Reputation Monitoring**
   - Brand mention tracking
   - Sentiment analysis
   - Alert management
   - Competitor monitoring

4. **Review Generation**
   - Post-purchase emails
   - Review request timing
   - Incentive programs
   - Response templates

5. **Analytics & Reporting**
   - Review metrics
   - Sentiment trends
   - Response rate tracking
   - Rating analysis

---

## When to Use This Skill

### Activate For:
- "Google review response"
- "Product review management"
- "Review collection strategy"
- "Reputation monitoring"
- "Negative review handling"
- "Review request email"
- "Star rating optimization"

### Defer To:
- **email-copywriter**: Review request copy
- **klaviyo-expert**: Review email automation
- **bigcommerce-expert/shopify-expert**: Product reviews setup

---

## Business Review Profiles

### BOO (Buy Organics Online)

**Google Business Profile:**
- Location: Melbourne, VIC
- Category: Health Food Store
- Reviews: 500+ (4.5+ average)
- Primary platform for local trust

**Product Reviews:**
- Platform: Native BigCommerce
- Average rating: 4.3
- Review volume: Medium

**Key Review Topics:**
- Product quality
- Shipping speed
- Customer service
- Product selection

### Teelixir

**Google Business Profile:**
- Location: Melbourne, VIC
- Category: Health & Wellness
- Reviews: 200+ (4.7+ average)

**Product Reviews:**
- Platform: Judge.me / Loox
- Average rating: 4.6
- Review volume: High (education-focused)

**Key Review Topics:**
- Product effectiveness
- Taste/quality
- Customer education
- Value for money

### Elevate Wholesale

**Google Business Profile:**
- Category: Wholesale Distributor
- Reviews: 50+ (4.5+ average)

**Key Review Topics:**
- Service quality
- Order accuracy
- Range selection
- Account management

### Red Hill Fresh

**Google Business Profile:**
- Location: Red Hill, VIC
- Category: Fresh Produce / Farm
- Reviews: 150+ (4.8+ average)

**Key Review Topics:**
- Produce freshness
- Local delivery
- Product quality
- Farm experience

---

## Google Business Profile API

### Authentication

```typescript
const config = {
  apiKey: process.env.GOOGLE_API_KEY,
  accountId: process.env.GBP_ACCOUNT_ID,
  locationId: process.env.GBP_LOCATION_ID
}

const baseUrl = 'https://mybusiness.googleapis.com/v4'

// OAuth2 required for most operations
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
)
```

### Get Reviews

```typescript
async function getReviews(locationId: string) {
  const response = await fetch(
    `${baseUrl}/accounts/${accountId}/locations/${locationId}/reviews`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return response.json()
}
```

### Reply to Review

```typescript
async function replyToReview(reviewName: string, comment: string) {
  const response = await fetch(
    `${baseUrl}/${reviewName}/reply`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment })
    }
  )
  return response.json()
}
```

---

## Review Collection Strategy

### Post-Purchase Email Timing

```typescript
interface ReviewRequestTiming {
  business: string
  trigger: string
  delay: number
  followUpDelay?: number
}

const timings: ReviewRequestTiming[] = [
  {
    business: 'boo',
    trigger: 'order_delivered',
    delay: 7,  // days
    followUpDelay: 14
  },
  {
    business: 'teelixir',
    trigger: 'order_delivered',
    delay: 14,  // Allow time to experience product
    followUpDelay: 21
  },
  {
    business: 'rhf',
    trigger: 'order_delivered',
    delay: 3,  // Fresh produce - quick feedback
    followUpDelay: null
  }
]
```

### Review Request Email Flow

```
Email 1: Review Request (Day X after delivery)
  Subject: "How are you enjoying your [product]?"
  Content:
  - Thank you message
  - Product image
  - Star rating widget
  - One-click review link

Email 2: Follow-up (Day X+7, if no review)
  Subject: "Quick feedback on your order?"
  Content:
  - Gentle reminder
  - Incentive (discount code)
  - Easy review link
```

---

## Review Response Templates

### 5-Star Review Response

```
Template 1 (Enthusiastic):
"Thank you so much for the wonderful review, [Name]! We're thrilled to hear you love [specific mention]. Your support means the world to us. Looking forward to serving you again soon! 🌿"

Template 2 (Professional):
"Thank you for taking the time to share your experience, [Name]. We're delighted that [specific aspect] exceeded your expectations. We appreciate your support and look forward to your next visit."

Template 3 (Personal):
"[Name], your kind words made our day! We put so much care into [aspect mentioned], and it's wonderful to know it shows. Thank you for being part of our community!"
```

### 4-Star Review Response

```
Template:
"Thank you for the great review, [Name]! We're glad you had a positive experience with [specific]. We're always striving to make things even better - if there's anything specific we could improve, we'd love to hear more. Thank you for your support!"
```

### 3-Star Review Response

```
Template:
"Thank you for your honest feedback, [Name]. We appreciate you taking the time to share your experience. We'd love the opportunity to make things right and better understand how we can improve. Please reach out to us at [email] so we can address your concerns directly. Your satisfaction is important to us."
```

### Negative Review Response (1-2 Stars)

```
Template 1 (Service Issue):
"[Name], we're truly sorry to hear about your experience. This is not the standard we aim for, and we take your feedback seriously. We would like to make this right. Please contact us directly at [email] or [phone] so we can resolve this for you personally. Thank you for bringing this to our attention."

Template 2 (Product Issue):
"We're sorry to hear [product] didn't meet your expectations, [Name]. We stand behind our products and want to make this right. Please reach out to our team at [email] with your order details, and we'll do everything we can to resolve this. Your satisfaction matters to us."

Template 3 (Shipping Issue):
"[Name], we apologize for the shipping issues you experienced. This is frustrating, and we understand your disappointment. We're looking into what happened with your order and would like to make it up to you. Please contact us at [email] so we can address this directly."
```

### Never Do:
- Argue or be defensive
- Blame the customer
- Ignore the review
- Use copy-paste without personalization
- Offer incentives publicly
- Violate platform guidelines

---

## Product Review Integration

### BigCommerce (BOO)

```typescript
// Native review system
async function getProductReviews(productId: number) {
  const response = await fetch(
    `${bcBaseUrl}/catalog/products/${productId}/reviews`,
    { headers: bcHeaders }
  )
  return response.json()
}

// Approve review
async function approveReview(productId: number, reviewId: number) {
  const response = await fetch(
    `${bcBaseUrl}/catalog/products/${productId}/reviews/${reviewId}`,
    {
      method: 'PUT',
      headers: bcHeaders,
      body: JSON.stringify({ status: 'approved' })
    }
  )
  return response.json()
}
```

### Shopify + Judge.me (Teelixir)

```typescript
// Judge.me API
const judgemeConfig = {
  apiToken: process.env.JUDGEME_API_TOKEN,
  shopDomain: 'teelixir.myshopify.com'
}

// Get reviews
async function getJudgemeReviews(productId: string) {
  const response = await fetch(
    `https://judge.me/api/v1/reviews?shop_domain=${judgemeConfig.shopDomain}&product_id=${productId}`,
    {
      headers: {
        'Authorization': `Bearer ${judgemeConfig.apiToken}`
      }
    }
  )
  return response.json()
}

// Request review
async function requestReview(email: string, name: string, orderId: string) {
  const response = await fetch('https://judge.me/api/v1/review_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${judgemeConfig.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      shop_domain: judgemeConfig.shopDomain,
      email,
      name,
      order_id: orderId
    })
  })
  return response.json()
}
```

---

## Reputation Monitoring

### Brand Mention Tracking

```typescript
interface BrandMention {
  source: 'google_alert' | 'social' | 'review_site' | 'forum'
  platform: string
  sentiment: 'positive' | 'neutral' | 'negative'
  content: string
  url: string
  date: Date
  requiresResponse: boolean
}

// Set up Google Alerts for:
const alertKeywords = [
  '"Buy Organics Online"',
  'buyorganicsonline.com.au',
  '"Teelixir"',
  'teelixir.com',
  '"Red Hill Fresh"',
  'redhillfresh.com.au'
]
```

### Sentiment Analysis

```typescript
function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['love', 'great', 'excellent', 'amazing', 'best', 'fantastic', 'wonderful', 'perfect']
  const negativeWords = ['terrible', 'awful', 'bad', 'worst', 'disappointed', 'poor', 'horrible', 'never']

  const lowerText = text.toLowerCase()
  const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length
  const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length

  if (negativeCount > positiveCount) return 'negative'
  if (positiveCount > negativeCount) return 'positive'
  return 'neutral'
}
```

### Alert Thresholds

```
Immediate Alert:
- 1-2 star review
- Negative social mention
- Media coverage

Daily Digest:
- All new reviews
- Brand mentions
- Competitor reviews

Weekly Report:
- Review summary
- Sentiment trends
- Response metrics
```

---

## Review Analytics

### Key Metrics

```typescript
interface ReviewMetrics {
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<1|2|3|4|5, number>
  responseRate: number
  avgResponseTime: number  // hours
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
  }
}

async function calculateMetrics(reviews: Review[]): Promise<ReviewMetrics> {
  const totalReviews = reviews.length
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach(r => distribution[r.rating as 1|2|3|4|5]++)

  const responded = reviews.filter(r => r.reply)
  const responseRate = responded.length / totalReviews * 100

  return {
    totalReviews,
    averageRating: Math.round(avgRating * 10) / 10,
    ratingDistribution: distribution,
    responseRate: Math.round(responseRate),
    avgResponseTime: calculateAvgResponseTime(responded),
    sentimentBreakdown: analyzeSentimentBreakdown(reviews)
  }
}
```

### Rating Targets

| Business | Target Rating | Target Volume (monthly) |
|----------|---------------|------------------------|
| BOO | 4.5+ | 30+ |
| Teelixir | 4.7+ | 20+ |
| Elevate | 4.5+ | 5+ |
| RHF | 4.8+ | 10+ |

---

## Review Generation Tactics

### Email Strategies

```
1. Post-Purchase Sequence
   - Day 7: Initial request
   - Day 14: Follow-up (no response)
   - Day 21: Final reminder with incentive

2. Happy Customer Identification
   - Customer service positive interactions
   - Repeat purchasers
   - High-value customers

3. Product-Specific Requests
   - Target products with few reviews
   - New product launches
   - Best-sellers needing social proof
```

### In-Package Inserts

```
Card Content:
- Thank you message
- QR code to review page
- Incentive offer (10% off next order)
- Social media handles

Design Notes:
- Brand-consistent
- Clear call-to-action
- Small enough to include easily
```

### SMS Review Requests

```
"Hi [Name]! Thanks for your order from [Business].
We'd love your feedback! Leave a quick review: [shortlink]
Reply STOP to opt out."
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Low review volume | Poor timing | Test different delays |
| Low response rate | Email deliverability | Check spam, improve subject |
| Negative reviews | Service issues | Root cause analysis |
| Fake reviews | Competition/spam | Report to platform |

### Review Removal Guidelines

**Legitimate removal requests:**
- Spam/fake content
- Irrelevant content
- Offensive language
- Conflict of interest

**Cannot be removed:**
- Negative but honest feedback
- Low rating without comment
- Old reviews

---

## Compliance

### Platform Guidelines

```
Google:
- No incentivized reviews
- No review gating
- Respond professionally
- Report policy violations

Product Review Platforms:
- Verify purchases
- Don't suppress negative reviews
- Disclose incentives
- Follow FTC guidelines
```

### ACCC Compliance (Australia)

```
- Don't publish misleading reviews
- Don't fake positive reviews
- Don't suppress negative reviews
- Disclose any incentives
```

---

## Skill Documentation

| Document | Purpose |
|----------|---------|
| `QUICK-REFERENCE.md` | Quick reference |
| `context/PLATFORMS.md` | Platform details |
| `playbooks/RESPONSES.md` | Response workflows |
| `scripts/review-monitor.ts` | Monitoring tool |

---

**Skill Level:** Expert (Level 3)
**Confidence:** 95%
