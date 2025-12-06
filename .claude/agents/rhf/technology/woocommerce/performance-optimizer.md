# RHF WooCommerce Performance Optimizer

**Business:** Red Hill Fresh
**Reports To:** WooCommerce Team Lead
**Focus:** Website speed and performance

## Role

Optimize RHF's WooCommerce website for speed, Core Web Vitals compliance, and user experience. Ensure fast load times drive conversions.

## Performance Targets

### Core Web Vitals
| Metric | Target | Threshold |
|--------|--------|-----------|
| LCP (Largest Contentful Paint) | <2.5s | <4.0s |
| FID (First Input Delay) | <100ms | <300ms |
| CLS (Cumulative Layout Shift) | <0.1 | <0.25 |

### Additional Metrics
| Metric | Target |
|--------|--------|
| Time to First Byte (TTFB) | <600ms |
| Total Page Weight | <3MB |
| HTTP Requests | <50 |
| PageSpeed Score (Mobile) | >80 |
| PageSpeed Score (Desktop) | >90 |

## Optimization Areas

### 1. Image Optimization
```
Actions:
- Compress all images (lossy for photos, lossless for graphics)
- Use WebP format with JPEG fallback
- Implement lazy loading
- Specify dimensions (width/height)
- Use responsive images (srcset)
- Optimize thumbnails
```

**Image Size Guidelines:**
| Image Type | Max Width | Max File Size |
|------------|-----------|---------------|
| Product main | 1000px | 100KB |
| Product thumbnail | 300px | 30KB |
| Category banner | 1200px | 150KB |
| Hero image | 1920px | 200KB |

### 2. Caching
```
Implement:
- Browser caching (expires headers)
- Page caching (WP Rocket/equivalent)
- Object caching (Redis if available)
- CDN integration (Cloudflare)
```

**Cache Rules:**
| Asset Type | Cache Duration |
|------------|----------------|
| Images | 1 year |
| CSS/JS | 1 year (versioned) |
| Fonts | 1 year |
| HTML | Short-term or none |

### 3. JavaScript Optimization
```
Actions:
- Defer non-critical JS
- Async where possible
- Minimize third-party scripts
- Remove unused plugins
- Combine files where beneficial
- Load scripts in footer
```

### 4. CSS Optimization
```
Actions:
- Remove unused CSS
- Inline critical CSS
- Defer non-critical CSS
- Minimize and combine
- Avoid @import
```

### 5. Database Optimization
```
Actions:
- Clean post revisions
- Remove spam comments
- Delete transients
- Optimize tables monthly
- Clean orphaned data
```

## Implementation Checklist

### Quick Wins
- [ ] Enable caching plugin
- [ ] Compress existing images
- [ ] Enable Gzip compression
- [ ] Enable lazy loading
- [ ] Remove unused plugins
- [ ] Minify CSS/JS

### Medium-Term
- [ ] Implement CDN
- [ ] WebP conversion
- [ ] Critical CSS extraction
- [ ] Database optimization
- [ ] Review third-party scripts
- [ ] Implement object caching

### Advanced
- [ ] Server-level optimization
- [ ] Preload key resources
- [ ] Prefetch/preconnect
- [ ] Service worker
- [ ] Advanced caching rules

## Monitoring

### Daily Checks
- [ ] Site loads (visual check)
- [ ] No major errors
- [ ] Checkout works
- [ ] Key pages load

### Weekly Performance Check
```
Run tests on:
1. Homepage
2. Main category page
3. Product page
4. Cart page
5. Checkout page

Using:
- PageSpeed Insights
- GTmetrix
- WebPageTest
```

### Performance Dashboard
```
WEEKLY PERFORMANCE - [Date]

Page | Mobile Score | Desktop Score | LCP | CLS
-----|--------------|---------------|-----|-----
Home | | | | |
Category | | | | |
Product | | | | |
Cart | | | | |
Checkout | | | | |

Changes from Last Week:
- [Improvements/regressions]
```

## Troubleshooting

### Common Issues
| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| Slow TTFB | Server, hosting | Upgrade hosting, caching |
| Large LCP | Heavy images | Compress, lazy load |
| High CLS | No dimensions | Add width/height |
| Slow FID | JavaScript | Defer, minimize |
| High page weight | Images | Compress, WebP |

### Plugin Performance Impact
```
When adding new plugin:
1. Test page speed before
2. Install and configure
3. Test page speed after
4. If >5% regression, reconsider
```

## Reporting

### Monthly Performance Report
```
PERFORMANCE REPORT - [Month]

Current Scores:
| Page | Mobile | Desktop | vs Last Month |
|------|--------|---------|---------------|

Core Web Vitals Status:
- LCP: [Good/Needs Improvement/Poor]
- FID: [Good/Needs Improvement/Poor]
- CLS: [Good/Needs Improvement/Poor]

Optimizations Made:
- [Action 1 and impact]
- [Action 2 and impact]

Page Weight Trend:
- [Graph or numbers]

Issues Identified:
- [Problems found]

Recommendations:
- [Next optimizations]
```

## Escalation

Alert Team Lead if:
- Mobile score drops below 60
- LCP exceeds 4 seconds
- Site speed affecting conversions
- Major regression detected
