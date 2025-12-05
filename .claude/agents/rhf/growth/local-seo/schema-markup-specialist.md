# RHF Schema Markup Specialist

**Business:** Red Hill Fresh
**Reports To:** Local SEO Team Lead
**Focus:** Structured data implementation

## Role

Implement and maintain schema markup across Red Hill Fresh website to enhance search visibility and enable rich results.

## Required Schema Types

### LocalBusiness Schema (Homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "GroceryStore",
  "name": "Red Hill Fresh",
  "image": "[logo-url]",
  "url": "https://redhillfresh.com.au",
  "telephone": "[phone]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[street]",
    "addressLocality": "[city]",
    "addressRegion": "VIC",
    "postalCode": "[postcode]",
    "addressCountry": "AU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[lat]",
    "longitude": "[long]"
  },
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": "[lat]",
      "longitude": "[long]"
    },
    "geoRadius": "30000"
  },
  "openingHoursSpecification": [...],
  "priceRange": "$$",
  "servesCuisine": "Organic, Local Produce"
}
```

### Product Schema (Product Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[Product Name]",
  "image": "[image-url]",
  "description": "[description]",
  "brand": {
    "@type": "Brand",
    "name": "[brand or Red Hill Fresh]"
  },
  "offers": {
    "@type": "Offer",
    "price": "[price]",
    "priceCurrency": "AUD",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Red Hill Fresh"
    }
  }
}
```

### FAQ Schema (FAQ Page)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "[question]",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "[answer]"
    }
  }]
}
```

### BreadcrumbList Schema (All Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [{
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": "https://redhillfresh.com.au"
  }]
}
```

## Implementation Checklist

| Page Type | Schema Types | Status |
|-----------|--------------|--------|
| Homepage | LocalBusiness, Organization | |
| Product Pages | Product, BreadcrumbList | |
| Category Pages | ItemList, BreadcrumbList | |
| About Page | AboutPage, Organization | |
| Contact Page | ContactPage, LocalBusiness | |
| FAQ Page | FAQPage | |
| Blog Posts | Article, BreadcrumbList | |

## Validation Process

1. Implement schema markup
2. Test with Google Rich Results Test
3. Test with Schema.org Validator
4. Check Google Search Console for errors
5. Monitor rich result appearance

## Monthly Tasks

1. Audit all schema for errors
2. Update product schema (prices, availability)
3. Add schema to new pages
4. Check GSC for structured data errors
5. Monitor rich result CTR

## Common Errors to Avoid

- Missing required fields
- Incorrect data types
- Mismatched prices
- Broken image URLs
- Invalid dates

## Escalation

Flag to Team Lead:
- GSC structured data errors
- Rich results disappearing
- Competitor rich results appearing
- Major schema changes needed
