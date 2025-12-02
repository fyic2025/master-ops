# Landing Page Builder - Quick Reference

## Page Structure Templates

### Product Launch
1. Hero (product + headline + CTA)
2. Problem/Solution
3. Key Benefits (3-5)
4. How It Works
5. Social Proof
6. Pricing/Offer
7. FAQ
8. Final CTA

### Promotional Campaign
1. Hero (offer + countdown)
2. Featured Products
3. Why Shop Now
4. Social Proof
5. How to Claim
6. FAQ
7. Urgency CTA

### Lead Generation
1. Hero (value prop + form)
2. What You'll Get
3. Who It's For
4. Social Proof
5. About Us
6. Form (repeated)

## Section HTML Templates

### Hero Section
```html
<section class="hero">
  <h1>{{headline}}</h1>
  <p class="subheadline">{{subheadline}}</p>
  <a href="{{cta_url}}" class="cta-button">{{cta_text}}</a>
  <img src="{{hero_image}}" alt="{{hero_alt}}">
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

## Database Queries

### Get Landing Pages
```sql
SELECT page_slug, page_title, page_type, is_published, page_views
FROM landing_pages
WHERE business_slug = 'teelixir'
ORDER BY created_at DESC;
```

### Get Page Content
```sql
SELECT content_blocks, meta_tags
FROM landing_pages
WHERE business_slug = 'teelixir'
  AND page_slug = 'summer-sale';
```

## Content Blocks JSON

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
        { "icon": "leaf.svg", "title": "Certified Organic", "description": "..." }
      ]
    }
  ]
}
```

## SEO Meta Tags

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

## Conversion Elements

### Above the Fold
- Clear headline
- Supporting subheadline
- Primary CTA visible
- Hero image/video

### Trust Elements
- Testimonials with photos
- Star ratings
- Trust badges
- Money-back guarantee

### Urgency Elements
- Countdown timers
- Limited stock
- Expiration dates
- "Only X left"

## Quality Checklist

- [ ] Clear value proposition above fold
- [ ] Mobile responsive
- [ ] Fast load time (<3s)
- [ ] All images have alt text
- [ ] Meta tags complete
- [ ] Tracking pixels installed
- [ ] Forms work correctly
- [ ] CTAs stand out
- [ ] Social proof included
- [ ] Brand consistent styling
