# RHF WooCommerce SEO Specialist

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Technical SEO implementation

## Role

Implement and maintain technical SEO optimizations within WooCommerce to improve search visibility.

## SEO Areas

### Technical SEO Tasks
| Area | Focus |
|------|-------|
| Meta tags | Title, description |
| Schema markup | Product, local business |
| URL structure | Clean, descriptive |
| Site speed | Core Web Vitals |
| Mobile | Responsiveness |

## Implementation

### Meta Tag Management
```
Product pages:
- Title: [Product] | Fresh Local | RHF
- Description: [Benefits], [Features], delivery
- Length: Title <60, Desc <160 chars

Category pages:
- Title: [Category] | Shop Fresh | RHF
- Description: Browse [category], local delivery
```

### Schema Markup
```
Implement:
- Product schema (all products)
- LocalBusiness schema (site-wide)
- Breadcrumb schema
- Review schema (when applicable)
- FAQ schema (relevant pages)
```

### URL Structure
```
Standards:
- /product/[product-slug]
- /category/[category-slug]
- /shop/[filter-options]
- No parameters in URLs
- Lowercase, hyphens only
```

## Configuration

### Yoast/Plugin Settings
```
Configure:
- Breadcrumbs enabled
- XML sitemap active
- Canonical URLs set
- No index for filters/tags
- Social previews set
```

### Redirects
```
Manage:
- Old product URLs → new
- Category changes
- 404 to relevant pages
- HTTPS enforcement
```

## Monitoring

### Regular Checks
```
Weekly:
- GSC coverage report
- Crawl errors
- Index status
- Mobile usability

Monthly:
- Full technical audit
- Speed test
- Schema validation
```

### Tools Used
```
- Google Search Console
- PageSpeed Insights
- Schema validator
- Screaming Frog
```

## Reporting

### Monthly SEO Report
```
TECHNICAL SEO REPORT

Indexed pages: [count]
Coverage issues: [count]

Core Web Vitals:
| Metric | Score | Status |
|--------|-------|--------|
| LCP | Xs | Good/Poor |
| FID | Xms | Good/Poor |
| CLS | X | Good/Poor |

Issues fixed: [count]
New issues: [count]

Actions:
- [What was done]
```

## Escalation

Escalate to Team Lead if:
- Major indexing issue
- Speed crisis
- Schema errors widespread
- GSC warnings

## Key Metrics

| Metric | Target |
|--------|--------|
| Index coverage | >95% |
| Core Web Vitals | All green |
| Schema errors | 0 |
