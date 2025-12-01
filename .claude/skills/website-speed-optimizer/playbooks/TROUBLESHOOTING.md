# Troubleshooting - Website Speed Optimizer

## Decision Trees

### Performance Score Dropped

```
Score dropped?
├── By how much?
│   ├── >20 points → CRITICAL - Immediate investigation
│   │   ├── Check for new scripts added
│   │   ├── Check for theme/platform updates
│   │   ├── Check for server issues
│   │   └── Compare before/after audits
│   │
│   ├── 10-20 points → WARNING - Investigate within 24h
│   │   ├── Review recent changes
│   │   ├── Check third-party scripts
│   │   └── Run detailed Lighthouse audit
│   │
│   └── <10 points → MONITOR - May be noise
│       ├── Re-run audit to confirm
│       ├── Check if field data affected
│       └── Add to watch list
│
└── Was it gradual or sudden?
    ├── Sudden → Code/config change
    │   ├── Check git commits
    │   ├── Check CMS changes
    │   └── Check app/plugin updates
    │
    └── Gradual → Growing technical debt
        ├── Increasing bundle size
        ├── More third-party scripts
        └── Larger images over time
```

---

### LCP Too Slow (>2.5s)

```
LCP >2.5s?
├── What is the LCP element?
│   ├── Hero Image
│   │   ├── Is it preloaded? → Add <link rel="preload">
│   │   ├── Is it too large? → Resize to actual display size
│   │   ├── Is it WebP? → Convert to WebP with fallback
│   │   ├── Is it lazy loaded? → Remove lazy on above-fold images
│   │   └── Is it served from CDN? → Verify CDN configuration
│   │
│   ├── Background Image
│   │   ├── Is it in CSS? → Consider inline or preload
│   │   ├── Is it critical? → Add preload hint
│   │   └── Can it be removed? → Use solid color + progressive
│   │
│   ├── Text Block
│   │   ├── Fonts blocking render? → Use font-display: swap
│   │   ├── Critical CSS inline? → Extract and inline
│   │   └── Render-blocking JS? → Defer or async
│   │
│   └── Video
│       ├── Is poster image optimized? → Compress poster
│       ├── Is video preloaded? → Use preload="metadata"
│       └── Is video necessary? → Consider static image on mobile
│
├── Is TTFB slow?
│   ├── >800ms → Fix server first
│   │   ├── Check CDN → Enable/configure
│   │   ├── Check hosting → Upgrade if needed
│   │   ├── Check database → Optimize queries
│   │   └── Check caching → Enable server caching
│   │
│   └── <800ms → Focus on resource loading
│
└── Are there render-blocking resources?
    ├── CSS in <head>? → Inline critical, defer rest
    ├── JS before </head>? → Move to footer or defer
    └── Third-party blocking? → Load async or delay
```

---

### CLS Too High (>0.1)

```
CLS >0.1?
├── Identify shifting elements
│   ├── DevTools → Performance → Layout Shift clusters
│   └── Note which elements are shifting
│
├── Images without dimensions?
│   ├── Add width and height attributes
│   ├── Use CSS aspect-ratio
│   └── Use placeholder skeleton
│
├── Ads or embeds?
│   ├── Reserve space with min-height
│   ├── Use placeholder containers
│   └── Load below fold when possible
│
├── Dynamic content injection?
│   ├── Above existing content? → Insert below instead
│   ├── Lazy loaded? → Reserve exact space
│   └── API-driven? → Use skeleton loaders
│
├── Web fonts causing shift?
│   ├── Use font-display: optional (no swap)
│   ├── Or font-display: swap with matched fallback
│   ├── Preload critical fonts
│   └── Use system fonts for body text
│
└── Animations/transforms?
    ├── Using top/left/width/height? → Use transform instead
    └── Layout-affecting? → Use opacity/transform only
```

---

### INP Too Slow (>200ms)

```
INP >200ms?
├── Identify slow interactions
│   ├── DevTools → Performance → record user interactions
│   └── Look for long tasks (>50ms) after click/tap
│
├── Long JavaScript tasks?
│   ├── Break into smaller chunks
│   │   ├── Use setTimeout/requestIdleCallback
│   │   ├── Use Web Workers for heavy computation
│   │   └── Implement code splitting
│   │
│   ├── Large bundle? → Analyze with webpack-bundle-analyzer
│   └── Too many event listeners? → Delegate or throttle
│
├── Third-party scripts blocking?
│   ├── Identify culprits (analytics, chat, etc.)
│   ├── Defer loading until after interaction
│   ├── Use facade pattern for heavy widgets
│   └── Consider removing non-essential scripts
│
├── Layout thrashing?
│   ├── Multiple read/write cycles? → Batch operations
│   ├── Forced synchronous layout? → Avoid offsetWidth reads
│   └── Use requestAnimationFrame for visual updates
│
└── Main thread blocked?
    ├── Move work to Web Workers
    ├── Use requestIdleCallback for non-urgent
    └── Implement progressive hydration
```

---

### TTFB Too Slow (>800ms)

```
TTFB >800ms?
├── Is CDN enabled?
│   ├── No → Enable CDN immediately
│   │   ├── BigCommerce: Enable in settings
│   │   ├── Shopify: Automatic (verify DNS)
│   │   └── WooCommerce: Configure Cloudflare
│   │
│   └── Yes → Check CDN configuration
│       ├── Cache-Control headers correct?
│       ├── Edge caching enabled?
│       └── Origin shield configured?
│
├── Server response slow?
│   ├── Check hosting specs → May need upgrade
│   ├── Check server location → Use edge/regional
│   └── Check resource usage → CPU/memory limits
│
├── Database queries slow?
│   ├── Enable query caching
│   ├── Optimize slow queries
│   └── Add missing indexes
│
├── Application caching?
│   ├── Page caching enabled? → Enable for static pages
│   ├── Object caching? → Redis/Memcached
│   └── Fragment caching? → Cache partials
│
└── Redirects?
    ├── Multiple redirects? → Eliminate chain
    ├── HTTP→HTTPS redirect? → Update links
    └── www/non-www redirect? → Standardize
```

---

## Platform-Specific Issues

### BigCommerce (BOO)

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Slow LCP on product pages | Large product images | Enable auto-optimization, resize images |
| High CLS on homepage | Banner slider | Set explicit dimensions, preload first slide |
| Poor INP | Third-party apps | Audit Script Manager, defer non-critical |
| Slow TTFB | Not using CDN | Enable Akamai in settings |

### Shopify (Teelixir, Elevate)

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Slow LCP | Unoptimized hero | Use image_url filter with size param |
| High CLS | App injected content | Use app embeds with reserved space |
| Poor INP | Too many apps | Audit apps, remove unused |
| Slow TTFB | Rare (Fastly handles) | Check Shopify status |

### WooCommerce (RHF)

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Slow everything | No caching | Install WP Rocket or W3TC |
| Slow TTFB | No CDN | Configure Cloudflare |
| Large page size | Unoptimized images | Use ShortPixel, enable WebP |
| Poor INP | Plugin conflicts | Audit plugins, use P3 Profiler |

---

## Common Third-Party Script Issues

### Analytics (Google Analytics, GTM)
- **Issue:** Blocks interaction, delays FCP
- **Solution:** Load gtag.js async, defer GTM container

### Chat Widgets (Intercom, Zendesk, Tawk)
- **Issue:** Large bundle, blocks main thread
- **Solution:** Use facade pattern - button first, load on hover/click

### Reviews (Trustpilot, Yotpo, Judge.me)
- **Issue:** Injects content, causes CLS
- **Solution:** Reserve space, lazy load below fold

### Social Embeds (Instagram, Facebook)
- **Issue:** Heavy iframes, CLS, slow LCP
- **Solution:** Load on scroll, use static preview

### Personalization (Klaviyo pop-ups)
- **Issue:** CLS from pop-ups, blocks interaction
- **Solution:** Delay pop-ups, use slide-ins instead

---

## Emergency Procedures

### Site Performance Crashed (Score <30)
1. Check if site is down (different issue)
2. Revert recent changes if possible
3. Disable recently added scripts/apps
4. Check for platform outages
5. Run fresh Lighthouse audit to identify cause
6. Document findings before making fixes

### Google Search Console CWV Warning
1. Don't panic - takes 28 days to update
2. Identify affected URL groups
3. Prioritize by traffic/importance
4. Fix issues on sample URLs
5. Validate fixes with Lighthouse
6. Request re-validation in GSC (if available)
7. Wait for CrUX data update (28 days)

### Customer Complaints About Speed
1. Get specific URL and device info
2. Test from their geographic location (VPN)
3. Check network throttling (3G/4G simulation)
4. Run real-user monitoring check
5. Compare lab vs field data
6. Identify if isolated or widespread
