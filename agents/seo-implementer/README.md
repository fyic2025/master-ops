# SEO Implementation Agent

**Type:** Executor Agent
**Version:** 1.0.0
**Mission:** Execute technical SEO tasks and achieve 100/100 SEO score

## Overview

The SEO Implementation Agent is the technical executor that receives SEO requirements from the separate SEO team and implements them in the Shopify theme. This agent focuses on technical SEO implementation: structured data, meta tags, semantic HTML, and crawlability optimization.

## Key Principle

**This agent RECEIVES tasks from the SEO team.** The SEO team provides strategy, research, and requirements. This agent provides technical implementation.

## Workflow

```
SEO Team → Creates Task Ticket → SEO Implementation Agent
                                          ↓
                                  Analyzes Requirements
                                          ↓
                                  Implements Changes
                                          ↓
                                  Validates Implementation
                                          ↓
                                  Requests Lighthouse Audit
                                          ↓
                                  Reports Back to SEO Team
```

## Implementation Areas

### 1. Structured Data (Schema.org)

**Format:** JSON-LD (preferred over Microdata)
**Location:** In `<head>` or end of `<body>`

**Common Types:**
- Organization (site-wide)
- Product (product pages)
- Offer (pricing)
- AggregateRating (reviews)
- BreadcrumbList (navigation)
- FAQPage (FAQ sections)
- Article/BlogPosting (blog)

**Example: Product Schema**
```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{ product.title | json }},
  "image": {{ product.featured_image | image_url: width: 1200 | json }},
  "description": {{ product.description | strip_html | json }},
  "sku": {{ product.selected_or_first_available_variant.sku | json }},
  "brand": {
    "@type": "Brand",
    "name": {{ shop.name | json }}
  },
  "offers": {
    "@type": "Offer",
    "url": {{ request.url | json }},
    "priceCurrency": {{ cart.currency.iso_code | json }},
    "price": {{ product.selected_or_first_available_variant.price | divided_by: 100.0 | json }},
    "availability": "{% if product.selected_or_first_available_variant.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}"
  }
  {%- if product.metafields.reviews.rating -%}
  ,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": {{ product.metafields.reviews.rating | json }},
    "reviewCount": {{ product.metafields.reviews.count | json }}
  }
  {%- endif -%}
}
</script>
```

### 2. Meta Tags

**Title Tag:**
```liquid
<title>
  {%- if template == 'index' -%}
    {{ shop.name }} - {{ page_description }}
  {%- elsif template == 'product' -%}
    {{ product.title }} | {{ shop.name }}
  {%- else -%}
    {{ page_title }} | {{ shop.name }}
  {%- endif -%}
</title>
```

**Meta Description:**
```liquid
{%- if page_description -%}
  <meta name="description" content="{{ page_description }}">
{%- endif -%}
```

**Canonical URL:**
```liquid
<link rel="canonical" href="{{ canonical_url }}">
```

**Open Graph Tags:**
```liquid
<meta property="og:site_name" content="{{ shop.name }}">
<meta property="og:url" content="{{ canonical_url }}">
<meta property="og:title" content="{{ page_title }}">
{%- if page_description -%}
  <meta property="og:description" content="{{ page_description }}">
{%- endif -%}
<meta property="og:type" content="{% if template == 'product' %}product{% elsif template == 'article' %}article{% else %}website{% endif %}">
{%- if page_image -%}
  <meta property="og:image" content="{{ page_image | image_url: width: 1200 }}">
{%- endif -%}
```

**Twitter Card:**
```liquid
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ page_title }}">
{%- if page_description -%}
  <meta name="twitter:description" content="{{ page_description }}">
{%- endif -%}
{%- if page_image -%}
  <meta name="twitter:image" content="{{ page_image | image_url: width: 1200 }}">
{%- endif -%}
```

### 3. Semantic HTML

**Proper Structure:**
```liquid
<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>...</head>
<body>
  <a href="#main-content" class="skip-to-content">Skip to content</a>

  <header>
    <nav aria-label="Primary navigation">...</nav>
  </header>

  <main id="main-content">
    {%- if template == 'collection' -%}
      <h1>{{ collection.title }}</h1>
      <section>
        {%- # Collection content -%}
      </section>
    {%- elsif template == 'product' -%}
      <article>
        <h1>{{ product.title }}</h1>
        {%- # Product content -%}
      </article>
    {%- endif -%}
  </main>

  <footer>...</footer>
</body>
</html>
```

**Heading Hierarchy:**
```liquid
<h1>{{ product.title }}</h1>
  <h2>Product Details</h2>
    <h3>Ingredients</h3>
    <h3>Usage</h3>
  <h2>Customer Reviews</h2>
    <h3>Top Reviews</h3>
```

### 4. Breadcrumbs

**Visual + Structured Data:**
```liquid
{%- # Visual breadcrumbs -%}
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    {%- if collection -%}
      <li><a href="{{ collection.url }}">{{ collection.title }}</a></li>
    {%- endif -%}
    {%- if product -%}
      <li aria-current="page">{{ product.title }}</li>
    {%- endif -%}
  </ol>
</nav>

{%- # Structured data -%}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": {{ shop.url | json }}
    }
    {%- if collection -%}
    ,{
      "@type": "ListItem",
      "position": 2,
      "name": {{ collection.title | json }},
      "item": {{ collection.url | prepend: shop.url | json }}
    }
    {%- endif -%}
    {%- if product -%}
    ,{
      "@type": "ListItem",
      "position": {% if collection %}3{% else %}2{% endif %},
      "name": {{ product.title | json }},
      "item": {{ canonical_url | json }}
    }
    {%- endif -%}
  ]
}
</script>
```

### 5. Internal Linking

**Best Practices:**
```liquid
{%- # GOOD: Descriptive anchor text -%}
<a href="{{ collection.url }}">Shop our {{ collection.title | downcase }} collection</a>

{%- # AVOID: Generic text -%}
<a href="{{ collection.url }}">Click here</a>

{%- # Related products -%}
<section>
  <h2>You might also like</h2>
  {%- for related_product in product.collections.first.products limit: 4 -%}
    <a href="{{ related_product.url }}">
      {{ related_product.title }}
    </a>
  {%- endfor -%}
</section>
```

## Task Ticket Format

When SEO team provides a task:

```yaml
Task ID: uuid-123
Title: Add Product Schema to all product pages
Priority: Critical
Category: Structured Data

Requirements:
- Implement JSON-LD Product schema
- Include: name, image, description, SKU, brand, offers
- Add aggregateRating if reviews exist
- Validate with Rich Results Test

Pages Affected:
- All product pages (/products/*)

Acceptance Criteria:
- Schema validates with no errors
- Rich Results Test shows Product rich result
- Lighthouse SEO score 100/100
- SEO team reviews sample page

Due Date: 2024-11-25
```

## Implementation Process

### Step 1: Analyze Requirement
- Understand SEO objective
- Identify files to modify
- Plan implementation approach
- Note any dependencies

### Step 2: Implement
- Modify Liquid templates
- Add/update structured data
- Update meta tags
- Implement semantic HTML
- Coordinate with Theme Optimizer Agent if needed

### Step 3: Validate
- Run schema validators
- Check Rich Results Test
- Verify meta tags present
- Test on sample pages
- Request Lighthouse SEO audit

### Step 4: Document & Report
- Log implementation to Supabase
- Document changes in Git commit
- Report completion to SEO team
- Provide validation screenshots/results

## Validation Tools

### Structured Data
- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Schema.org Validator:** https://validator.schema.org/
- **Google Search Console:** Monitor structured data errors (via SEO team)

### Meta Tags
- **View Page Source:** Verify tags present
- **Lighthouse SEO Audit:** Meta tag validation
- **Social Media Debuggers:**
  - Facebook Sharing Debugger
  - Twitter Card Validator

### Technical SEO
- **Lighthouse SEO Category:** Overall technical SEO score
- **Robots.txt Tester:** Verify crawlability
- **XML Sitemap:** Check Shopify auto-generated sitemap

## Shopify-Specific Considerations

### Built-in SEO Fields
Shopify provides SEO fields in admin:
- Product title & meta description
- Collection title & meta description
- Page title & meta description
- Blog post title & meta description

**Always use these as the source:**
```liquid
<title>{{ page_title }}</title>
<meta name="description" content="{{ page_description }}">
```

### Metafields for Custom Data
Use metafields for additional schema data:
```liquid
{%- if product.metafields.seo.custom_schema -%}
  {{ product.metafields.seo.custom_schema }}
{%- endif -%}
```

### Automatic Features
Shopify automatically handles:
- XML sitemap generation (`/sitemap.xml`)
- Canonical URLs
- HTTPS
- Mobile responsiveness (if theme is responsive)
- robots.txt basic setup

### Redirects
Configure via Shopify Admin:
- Navigation → URL Redirects
- 301 redirects for changed URLs
- Cannot be managed via theme code

## Logging Format

```json
{
  "task_id": "uuid-123",
  "ticket_reference": "SEO-2024-045",
  "category": "structured_data",
  "title": "Add Product Schema to all product pages",
  "pages_affected": ["/products/*"],
  "implementation_details": "Added JSON-LD Product schema to product.liquid template. Included aggregateRating for products with reviews.",
  "files_modified": ["layout/theme.liquid", "templates/product.liquid"],
  "validation_results": {
    "rich_results_test": "Pass - Product rich result eligible",
    "schema_validator": "Valid",
    "lighthouse_seo": 100
  },
  "lighthouse_seo_before": 96,
  "lighthouse_seo_after": 100,
  "completed_date": "2024-11-20T10:30:00Z",
  "seo_team_notified": true
}
```

## Success Metrics
- **Primary:** 100/100 Lighthouse SEO score
- **Secondary:** Zero schema validation errors
- **Quality:** All SEO team tasks completed on time
- **Impact:** Improved search visibility (tracked by SEO team)

## Resources
- [Schema.org Documentation](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)
- [Shopify SEO Guide](https://shopify.dev/docs/themes/seo)
- [Lighthouse SEO Audits](https://developer.chrome.com/docs/lighthouse/seo/)
