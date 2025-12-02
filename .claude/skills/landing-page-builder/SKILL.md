---
name: landing-page-builder
description: Campaign landing page creation with conversion-optimized layouts. Generates page copy, structure, and HTML/CSS for product launches, promotions, and lead generation. Integrates with brand-asset-manager for styling.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Landing Page Builder Skill

Create conversion-optimized landing pages for marketing campaigns.

## When to Activate This Skill

Activate this skill when the user mentions:
- "landing page" or "create landing page"
- "campaign page" or "promo page"
- "product launch page"
- "lead generation page"
- "sales page" or "conversion page"

## Core Capabilities

### 1. Page Structure
- Hero sections
- Feature/benefit blocks
- Social proof sections
- CTA sections
- FAQ sections

### 2. Page Types
- Product launch
- Promotional campaign
- Lead generation
- Event registration
- Collection showcase

### 3. Conversion Elements
- Clear value propositions
- Trust indicators
- Urgency elements
- Multiple CTAs
- Social proof

### 4. SEO Optimization
- Meta titles and descriptions
- Open Graph tags
- Schema markup
- Semantic HTML

## Page Section Templates

### Hero Section
```html
<section class="hero">
  <h1>{{headline}}</h1>
  <p class="subheadline">{{subheadline}}</p>
  <a href="{{cta_url}}" class="cta-button">{{cta_text}}</a>
  <img src="{{hero_image}}" alt="{{hero_alt}}">
</section>
```

### Features Section
```html
<section class="features">
  <h2>{{features_headline}}</h2>
  <div class="feature-grid">
    {{#each features}}
    <div class="feature">
      <img src="{{icon}}" alt="">
      <h3>{{title}}</h3>
      <p>{{description}}</p>
    </div>
    {{/each}}
  </div>
</section>
```

### Social Proof Section
```html
<section class="social-proof">
  <h2>What Our Customers Say</h2>
  <div class="testimonials">
    {{#each testimonials}}
    <blockquote>
      <p>"{{quote}}"</p>
      <cite>- {{name}}, {{location}}</cite>
    </blockquote>
    {{/each}}
  </div>
  <div class="trust-badges">
    <img src="{{badge_1}}" alt="Certified Organic">
    <img src="{{badge_2}}" alt="Australian Made">
  </div>
</section>
```

### CTA Section
```html
<section class="cta-section">
  <h2>{{cta_headline}}</h2>
  <p>{{cta_subtext}}</p>
  <a href="{{cta_url}}" class="cta-button primary">{{cta_text}}</a>
  <p class="guarantee">{{guarantee_text}}</p>
</section>
```

## Page Type Structures

### Product Launch Page
1. Hero (product image + headline + CTA)
2. Problem/Solution
3. Key Benefits (3-5)
4. How It Works
5. Social Proof
6. Pricing/Offer
7. FAQ
8. Final CTA

### Promotional Campaign Page
1. Hero (offer headline + countdown)
2. Featured Products
3. Why Shop Now (benefits)
4. Social Proof
5. How to Claim
6. FAQ
7. Urgency CTA

### Lead Generation Page
1. Hero (value prop + form)
2. What You'll Get
3. Who It's For
4. Social Proof
5. About Us
6. Form (repeated)

## Database Schema

### landing_pages table
```sql
SELECT
  page_slug,
  page_title,
  page_type,
  content_blocks,
  meta_tags,
  is_published,
  page_views,
  conversions
FROM landing_pages
WHERE business_slug = 'teelixir';
```

### Content Blocks Structure
```json
{
  "content_blocks": [
    {
      "type": "hero",
      "headline": "Transform Your Health",
      "subheadline": "With ancient adaptogens",
      "cta_text": "Shop Now",
      "cta_url": "/collections/adaptogens",
      "image": "hero-image.jpg"
    },
    {
      "type": "features",
      "headline": "Why Choose Teelixir?",
      "features": [
        {
          "icon": "leaf.svg",
          "title": "Certified Organic",
          "description": "..."
        }
      ]
    }
  ]
}
```

## SEO Configuration

### Meta Tags
```json
{
  "meta_tags": {
    "title": "Page Title | Brand Name",
    "description": "150-160 character description",
    "og_title": "Open Graph Title",
    "og_description": "OG Description",
    "og_image": "og-image.jpg",
    "canonical_url": "https://..."
  }
}
```

### Schema Markup
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "...",
  "brand": {
    "@type": "Brand",
    "name": "Teelixir"
  }
}
```

## API Reference

### Create Landing Page
```typescript
async function createLandingPage(params: {
  businessSlug: BusinessSlug;
  pageSlug: string;
  pageType: 'product_launch' | 'campaign' | 'lead_gen' | 'sale';
  title: string;
  contentBlocks: ContentBlock[];
  metaTags: MetaTags;
}): Promise<LandingPage>
```

### Get Page
```typescript
async function getLandingPage(
  businessSlug: BusinessSlug,
  pageSlug: string
): Promise<LandingPage | null>
```

### Track Conversion
```typescript
async function trackConversion(
  pageId: string,
  conversionType: string
): Promise<void>
```

## Conversion Best Practices

### Above the Fold
- Clear headline communicating value
- Supporting subheadline
- Primary CTA visible
- Hero image/video

### Trust Elements
- Testimonials with photos
- Star ratings
- Trust badges (SSL, payment, certifications)
- Money-back guarantee

### Urgency Elements
- Countdown timers
- Limited stock indicators
- Expiration dates
- "Only X left" messaging

### CTA Best Practices
- Action-oriented text
- Contrasting button color
- Multiple CTAs throughout
- Clear value proposition

## Integration Points

- **brand-asset-manager**: Brand styling, logos, colors
- **marketing-copywriter**: Page copy generation
- **product-image-enhancer**: Optimized images
- **conversion-optimizer**: A/B testing, performance

## Tracking Configuration

```json
{
  "tracking_config": {
    "ga4_measurement_id": "G-XXXXXXX",
    "facebook_pixel_id": "XXXXX",
    "google_ads_id": "AW-XXXXX",
    "klaviyo_list_id": "XXXXX"
  }
}
```

## Quality Checklist

- [ ] Clear value proposition above fold
- [ ] Mobile responsive design
- [ ] Fast load time (<3s)
- [ ] All images have alt text
- [ ] Meta tags complete
- [ ] Tracking pixels installed
- [ ] Forms work correctly
- [ ] CTAs stand out
- [ ] Social proof included
- [ ] Brand consistent styling
