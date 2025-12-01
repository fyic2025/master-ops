# GSC Property Inventory

## Buy Organics Online (BOO)

**Property:** sc-domain:buyorganicsonline.com.au
**Platform:** BigCommerce
**Verification:** DNS TXT record

### Key Pages to Monitor
| Page Type | URL Pattern | Expected Index Status |
|-----------|-------------|----------------------|
| Homepage | / | Indexed |
| Products | /products/* | Indexed |
| Categories | /{category}/ | Indexed |
| Search | /search.php | Excluded (noindex) |
| Cart | /cart.php | Excluded (noindex) |
| Checkout | /checkout | Excluded (noindex) |
| Account | /account.php | Excluded (noindex) |

### Sitemaps
- Main: https://buyorganicsonline.com.au/xmlsitemap.php
- Products: https://buyorganicsonline.com.au/sitemap_products.xml

### Expected Stats
- ~11,000 product pages
- ~200 category pages
- Target: 90%+ products indexed

### Known Issues
- Large catalog can hit crawl budget
- Some product variants create duplicate content
- Out-of-stock products may cause soft 404s

---

## Teelixir

**Property:** sc-domain:teelixir.com
**Platform:** Shopify
**Verification:** DNS TXT record

### Key Pages to Monitor
| Page Type | URL Pattern | Expected Index Status |
|-----------|-------------|----------------------|
| Homepage | / | Indexed |
| Products | /products/* | Indexed |
| Collections | /collections/* | Indexed |
| Blog | /blogs/news/* | Indexed |
| Pages | /pages/* | Indexed |
| Cart | /cart | Excluded (noindex) |
| Checkout | /checkouts/* | Excluded (noindex) |

### Sitemaps
- Main: https://teelixir.com/sitemap.xml
- Products: https://teelixir.com/sitemap_products_1.xml
- Collections: https://teelixir.com/sitemap_collections_1.xml
- Blogs: https://teelixir.com/sitemap_blogs_1.xml
- Pages: https://teelixir.com/sitemap_pages_1.xml

### Expected Stats
- ~200 product pages
- ~50 collection pages
- ~100+ blog posts
- Target: 95%+ products indexed

### Known Issues
- Shopify generates collection filter URLs (excluded)
- Variant URLs can cause duplicates
- Blog pagination creates many URLs

---

## Elevate Wholesale

**Property:** sc-domain:elevatewholesale.com.au
**Platform:** Shopify
**Verification:** DNS TXT record

### Key Pages to Monitor
| Page Type | URL Pattern | Expected Index Status |
|-----------|-------------|----------------------|
| Homepage | / | Indexed |
| Products | /products/* | Indexed |
| Collections | /collections/* | Indexed |
| Account | /account/* | Excluded (noindex) |

### Sitemaps
- Main: https://elevatewholesale.com.au/sitemap.xml

### Expected Stats
- ~150 product pages
- ~20 collection pages
- Target: 90%+ products indexed

### Notes
- B2B site - lower search volume expected
- Focus on branded terms
- Account pages should not be indexed

---

## Red Hill Fresh (RHF)

**Property:** sc-domain:redhillfresh.com.au
**Platform:** WooCommerce
**Verification:** DNS TXT record

### Key Pages to Monitor
| Page Type | URL Pattern | Expected Index Status |
|-----------|-------------|----------------------|
| Homepage | / | Indexed |
| Products | /product/* | Indexed |
| Categories | /product-category/* | Indexed |
| Shop | /shop/ | Indexed |
| Cart | /cart/ | Excluded (noindex) |
| Checkout | /checkout/ | Excluded (noindex) |
| My Account | /my-account/ | Excluded (noindex) |

### Sitemaps
- Main: https://redhillfresh.com.au/sitemap_index.xml
- Posts: https://redhillfresh.com.au/post-sitemap.xml
- Pages: https://redhillfresh.com.au/page-sitemap.xml
- Products: https://redhillfresh.com.au/product-sitemap.xml
- Categories: https://redhillfresh.com.au/product_cat-sitemap.xml

### Expected Stats
- ~100 product pages
- ~20 category pages
- Target: 90%+ products indexed

### Known Issues
- WordPress generates many archive URLs
- Pagination can create duplicates
- Tag pages may have thin content

---

## Cross-Property Notes

### Crawl Budget Priorities
1. BOO (largest catalog)
2. Teelixir (active blog)
3. RHF (smaller catalog)
4. Elevate (B2B, lower priority)

### Common Exclusions (Expected)
- /cart, /checkout, /account URLs
- Search result pages
- Filter/sort parameters
- Pagination beyond page 1 (low value)
- Preview/draft URLs

### Red Flags (Investigate)
- Product pages excluded
- Category pages not indexed
- Homepage issues
- Sitemap errors
- Sudden drops in indexed pages

---

## Verification Status

| Property | Method | Status | Last Verified |
|----------|--------|--------|---------------|
| BOO | DNS TXT | Active | Check quarterly |
| Teelixir | DNS TXT | Active | Check quarterly |
| Elevate | DNS TXT | Active | Check quarterly |
| RHF | DNS TXT | Active | Check quarterly |

### Verification Record Format
```
google-site-verification=XXXXXXXXXXXXXXXXXXXXXXX
```

Store in DNS as TXT record on root domain.
