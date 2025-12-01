# Review Platforms Guide

## Google Business Profile

### Overview

Google Business Profile (formerly Google My Business) is essential for local SEO and trust-building. Reviews appear in Google Search and Maps.

### Account Structure

```
Organization Account
└── Location Group
    └── Individual Locations
        └── Reviews
        └── Q&A
        └── Posts
        └── Photos
```

### Business Profiles

**BOO:**
```
Name: Buy Organics Online
Category: Health Food Store
Address: [Warehouse Address], Melbourne VIC
Phone: [Business Phone]
Website: buyorganicsonline.com.au
Hours: Mon-Fri 9-5
```

**Teelixir:**
```
Name: Teelixir
Category: Health & Wellness
Address: Melbourne, VIC
Phone: [Business Phone]
Website: teelixir.com
Hours: Mon-Fri 9-5
```

**RHF:**
```
Name: Red Hill Fresh
Category: Farm / Fresh Produce
Address: Red Hill, VIC
Phone: [Business Phone]
Website: redhillfresh.com.au
Hours: Tue, Thu, Sat delivery
```

### Review Attributes

```typescript
interface GoogleReview {
  reviewId: string
  reviewer: {
    displayName: string
    profilePhotoUrl: string
    isAnonymous: boolean
  }
  starRating: 1 | 2 | 3 | 4 | 5
  comment: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
}
```

### API Access

```typescript
// Google Business Profile API
const gbpApi = {
  base: 'https://mybusiness.googleapis.com/v4',
  reviews: '/accounts/{accountId}/locations/{locationId}/reviews',
  reply: '/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply'
}

// Get reviews
async function getGoogleReviews(accountId: string, locationId: string, accessToken: string) {
  const response = await fetch(
    `${gbpApi.base}/accounts/${accountId}/locations/${locationId}/reviews`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )
  return response.json()
}

// Reply to review
async function replyToGoogleReview(
  accountId: string,
  locationId: string,
  reviewId: string,
  comment: string,
  accessToken: string
) {
  const response = await fetch(
    `${gbpApi.base}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
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

### Best Practices

```
Profile Optimization:
✓ Complete all profile fields
✓ Add high-quality photos regularly
✓ Keep hours updated
✓ Respond to Q&A
✓ Post updates weekly

Review Management:
✓ Respond to all reviews
✓ Use business name in response
✓ Personalize each response
✓ Address specific feedback
✓ Invite offline resolution for issues
```

---

## Judge.me (Shopify)

### Overview

Popular Shopify review app with photo/video reviews, carousels, and strong email integration.

### Features

- Photo & video reviews
- Product Q&A
- Review carousels
- Email review requests
- Social proof widgets
- AliExpress import

### Configuration

```json
{
  "shop_domain": "teelixir.myshopify.com",
  "settings": {
    "auto_publish_reviews": {
      "min_rating": 4,
      "enabled": true
    },
    "review_request_emails": {
      "enabled": true,
      "delay_days": 14,
      "reminder_days": 21
    },
    "incentives": {
      "enabled": true,
      "discount_type": "percentage",
      "discount_value": 10
    }
  }
}
```

### API Integration

```typescript
const judgemeApi = {
  base: 'https://judge.me/api/v1',
  reviews: '/reviews',
  reviewRequests: '/review_requests',
  widgets: '/widgets'
}

// Get reviews for product
async function getProductReviews(shopDomain: string, productId: string, apiToken: string) {
  const response = await fetch(
    `${judgemeApi.base}/reviews?shop_domain=${shopDomain}&product_id=${productId}`,
    {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    }
  )
  return response.json()
}

// Send review request
async function sendReviewRequest(
  shopDomain: string,
  email: string,
  name: string,
  orderId: string,
  apiToken: string
) {
  const response = await fetch(`${judgemeApi.base}/review_requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      shop_domain: shopDomain,
      email,
      name,
      order_id: orderId
    })
  })
  return response.json()
}
```

### Email Templates

```
Review Request (Day 14):
Subject: "How are you enjoying [Product Name]?"
- Product image
- Star rating widget
- One-click review
- Photo upload option

Reminder (Day 21):
Subject: "Quick feedback on your [Product Name]?"
- Gentle reminder
- 10% discount incentive
- Simplified review form
```

---

## BigCommerce Native Reviews

### Overview

Built-in review system for BigCommerce stores. Simple but functional.

### Review Object

```typescript
interface BCReview {
  id: number
  product_id: number
  title: string
  text: string
  status: 'approved' | 'pending' | 'disapproved'
  rating: 1 | 2 | 3 | 4 | 5
  email: string
  name: string
  date_reviewed: string
  date_created: string
  date_modified: string
}
```

### API Operations

```typescript
const bcReviewsApi = `${bcBaseUrl}/catalog/products/{productId}/reviews`

// Get reviews
async function getProductReviews(productId: number) {
  const response = await fetch(
    `${bcBaseUrl}/catalog/products/${productId}/reviews`,
    { headers: bcHeaders }
  )
  return response.json()
}

// Create review (admin)
async function createReview(productId: number, review: Partial<BCReview>) {
  const response = await fetch(
    `${bcBaseUrl}/catalog/products/${productId}/reviews`,
    {
      method: 'POST',
      headers: bcHeaders,
      body: JSON.stringify(review)
    }
  )
  return response.json()
}

// Update review status
async function updateReviewStatus(productId: number, reviewId: number, status: string) {
  const response = await fetch(
    `${bcBaseUrl}/catalog/products/${productId}/reviews/${reviewId}`,
    {
      method: 'PUT',
      headers: bcHeaders,
      body: JSON.stringify({ status })
    }
  )
  return response.json()
}

// Delete review
async function deleteReview(productId: number, reviewId: number) {
  const response = await fetch(
    `${bcBaseUrl}/catalog/products/${productId}/reviews/${reviewId}`,
    {
      method: 'DELETE',
      headers: bcHeaders
    }
  )
  return response.status === 204
}
```

### Limitations

- No photo/video reviews
- No email automation
- Basic display options
- Manual moderation only

---

## WooCommerce Reviews

### Overview

Uses WordPress comment system with WooCommerce extensions for product reviews.

### Review Structure

```typescript
interface WCReview {
  id: number
  product_id: number
  reviewer: string
  reviewer_email: string
  review: string
  rating: 1 | 2 | 3 | 4 | 5
  verified: boolean
  date_created: string
  status: 'approved' | 'hold' | 'spam' | 'trash'
}
```

### API Operations

```typescript
// Get product reviews
async function getWCReviews(productId?: number) {
  const endpoint = productId
    ? `${wcBaseUrl}/products/reviews?product=${productId}`
    : `${wcBaseUrl}/products/reviews`

  const response = await fetch(endpoint, { headers: wcHeaders })
  return response.json()
}

// Update review
async function updateWCReview(reviewId: number, updates: Partial<WCReview>) {
  const response = await fetch(
    `${wcBaseUrl}/products/reviews/${reviewId}`,
    {
      method: 'PUT',
      headers: wcHeaders,
      body: JSON.stringify(updates)
    }
  )
  return response.json()
}
```

---

## Social Media Reviews

### Facebook Reviews

```
Page Settings > Templates and Tabs > Reviews

Features:
- Star ratings
- Written recommendations
- Show/hide reviews

Best Practices:
- Respond to all
- Thank positive
- Address negative privately
- Share positive publicly
```

### Instagram Mentions

```
Monitoring:
- Brand hashtags
- @mentions
- Tagged posts
- Story mentions

Response:
- Like positive content
- Comment thanks
- Share to stories
- Address issues in DM
```

---

## Third-Party Review Sites

### ProductReview.com.au

```
Claim business listing
Respond to reviews
Monitor competitors
Track rating trends
```

### Trustpilot

```
Free listing available
Paid features for more control
Import existing reviews
Review invitations
```

---

## Platform Comparison

| Feature | Google | Judge.me | BC Native | WC Native |
|---------|--------|----------|-----------|-----------|
| Photo Reviews | No | Yes | No | Plugin |
| Video Reviews | No | Yes | No | Plugin |
| Email Requests | No | Yes | No | Plugin |
| Incentives | No | Yes | No | Manual |
| SEO Snippets | Yes | Yes | Limited | Plugin |
| Moderation | Report | Full | Full | Full |
| API Access | Limited | Full | Full | Full |

---

## Integration Priority

1. **Google Business Profile** - Critical for local SEO
2. **Platform-native** - Primary product reviews
3. **Email automation** - Review collection
4. **Social monitoring** - Brand reputation
