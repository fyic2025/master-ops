# Site Inventory - Performance Monitoring

## Buy Organics Online (BigCommerce)

**Base URL:** https://buyorganicsonline.com.au
**Platform:** BigCommerce (Stencil theme)
**CDN:** Akamai (built-in)
**Monthly Traffic:** ~150K sessions

### Critical Pages
| Page | URL | Priority | Notes |
|------|-----|----------|-------|
| Homepage | / | P0 | Hero banner, featured products |
| Product Page | /products/{slug}/ | P0 | 11K+ products |
| Category Page | /{category}/ | P1 | Nested categories |
| Search Results | /search.php?search_query= | P1 | Heavy filtering |
| Cart | /cart.php | P0 | AJAX updates |
| Checkout | /checkout | P0 | Multi-step, iframe payment |

### Known Performance Factors
- Large product catalog (11,357 SKUs)
- Multiple third-party scripts (reviews, chat, analytics)
- High-resolution product images
- Complex category navigation
- Search autocomplete functionality

### Platform Limitations
- Limited control over checkout
- Stencil theme compilation required for changes
- Some JavaScript in platform core

---

## Teelixir (Shopify)

**Base URL:** https://teelixir.com
**Platform:** Shopify (Dawn-based theme)
**CDN:** Fastly (built-in)
**Monthly Traffic:** ~80K sessions

### Critical Pages
| Page | URL | Priority | Notes |
|------|-----|----------|-------|
| Homepage | / | P0 | Video hero, collections |
| Product Page | /products/{handle} | P0 | ~200 products |
| Collection | /collections/{handle} | P1 | Filtering enabled |
| Blog Post | /blogs/news/{handle} | P2 | Rich content |
| Cart | /cart | P0 | Drawer cart |
| Checkout | /checkouts/* | P0 | Shopify hosted |

### Known Performance Factors
- Video content on homepage
- Klaviyo tracking scripts
- Instagram feed embed
- Review app (Judge.me)
- Ambassador/affiliate tracking

### Platform Limitations
- Checkout is Shopify-hosted (limited optimization)
- App scripts can't be fully deferred
- Liquid template parsing overhead

---

## Elevate Wholesale (Shopify)

**Base URL:** https://elevatewholesale.com.au
**Platform:** Shopify (Custom B2B theme)
**CDN:** Fastly (built-in)
**Monthly Traffic:** ~5K sessions (B2B)

### Critical Pages
| Page | URL | Priority | Notes |
|------|-----|----------|-------|
| Homepage | / | P0 | B2B focused |
| Product Page | /products/{handle} | P1 | Wholesale pricing |
| Collection | /collections/{handle} | P1 | Tiered pricing |
| Account | /account | P1 | Order history, reorder |
| Cart | /cart | P0 | Bulk quantities |

### Known Performance Factors
- Tiered pricing calculations
- Customer-specific pricing
- Bulk order functionality
- Account authentication overhead

### Platform Limitations
- B2B features require additional JavaScript
- Customer metafield lookups
- Wholesale app overhead

---

## Red Hill Fresh (WooCommerce)

**Base URL:** https://redhillfresh.com.au
**Platform:** WooCommerce on WordPress
**CDN:** To be configured (Cloudflare recommended)
**Monthly Traffic:** ~20K sessions

### Critical Pages
| Page | URL | Priority | Notes |
|------|-----|----------|-------|
| Homepage | / | P0 | Featured products, banner |
| Product Page | /product/{slug}/ | P0 | Variable products |
| Shop | /shop/ | P1 | Main catalog |
| Category | /product-category/{slug}/ | P1 | Filtered views |
| Cart | /cart/ | P0 | WooCommerce cart |
| Checkout | /checkout/ | P0 | WooCommerce checkout |

### Known Performance Factors
- WordPress plugin overhead
- Database query performance
- Unoptimized images possible
- No default lazy loading
- Theme not performance-optimized

### Optimization Opportunities
- Implement caching (WP Rocket or W3 Total Cache)
- Configure CDN (Cloudflare free tier)
- Database optimization (WP-Optimize)
- Image compression (ShortPixel or Imagify)
- Defer JavaScript loading

---

## Monitoring Schedule

| Business | Audit Frequency | Alert Threshold |
|----------|-----------------|-----------------|
| BOO | Every 6 hours | Score <60 |
| Teelixir | Every 6 hours | Score <60 |
| Elevate | Daily | Score <50 |
| RHF | Daily | Score <50 |

---

## Sample URLs for Testing

### BOO Test URLs
```
https://buyorganicsonline.com.au/
https://buyorganicsonline.com.au/teelixir-tremella-mushroom-50g/
https://buyorganicsonline.com.au/superfoods/
https://buyorganicsonline.com.au/search.php?search_query=protein
```

### Teelixir Test URLs
```
https://teelixir.com/
https://teelixir.com/products/tremella-mushroom-powder
https://teelixir.com/collections/all
https://teelixir.com/blogs/news
```

### Elevate Test URLs
```
https://elevatewholesale.com.au/
https://elevatewholesale.com.au/products/tremella-mushroom-powder-wholesale
https://elevatewholesale.com.au/collections/all
```

### RHF Test URLs
```
https://redhillfresh.com.au/
https://redhillfresh.com.au/shop/
https://redhillfresh.com.au/product-category/vegetables/
```

---

## Third-Party Script Inventory

### BOO
| Script | Purpose | Impact |
|--------|---------|--------|
| Google Analytics 4 | Analytics | Medium |
| Google Tag Manager | Tag management | Medium |
| Trustpilot | Reviews | High |
| Klaviyo | Email capture | Medium |
| Facebook Pixel | Ads tracking | Low |
| Google Ads | Conversion tracking | Low |

### Teelixir
| Script | Purpose | Impact |
|--------|---------|--------|
| Google Analytics 4 | Analytics | Medium |
| Klaviyo | Email/SMS | High |
| Judge.me | Reviews | Medium |
| Facebook Pixel | Ads tracking | Low |
| Instagram Feed | Social proof | High |
| Ambassador | Affiliates | Low |

### Elevate
| Script | Purpose | Impact |
|--------|---------|--------|
| Google Analytics 4 | Analytics | Medium |
| HubSpot | CRM tracking | Medium |
| Intercom | Chat | High |

### RHF
| Script | Purpose | Impact |
|--------|---------|--------|
| Google Analytics 4 | Analytics | Medium |
| Facebook Pixel | Ads tracking | Low |
| WooCommerce Analytics | E-com tracking | Low |
