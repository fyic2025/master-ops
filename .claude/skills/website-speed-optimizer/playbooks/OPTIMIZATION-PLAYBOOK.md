# Optimization Playbook - Website Speed Optimizer

## Pre-Optimization Checklist

- [ ] Baseline audit completed (Lighthouse + PSI)
- [ ] Current scores documented
- [ ] Target scores defined
- [ ] High-impact opportunities identified
- [ ] Changes can be tested/reverted
- [ ] Stakeholders informed

---

## Optimization Workflow

### Phase 1: Audit & Baseline (Day 1)

1. **Run comprehensive audit**
   ```bash
   npx tsx .claude/skills/website-speed-optimizer/scripts/run-lighthouse-audit.ts --business {business} --detailed
   ```

2. **Document current state**
   | Metric | Mobile | Desktop | Target |
   |--------|--------|---------|--------|
   | Performance | | | 70+ |
   | LCP | | | <2.5s |
   | INP | | | <200ms |
   | CLS | | | <0.1 |

3. **Identify top opportunities**
   - Review Lighthouse "Opportunities" section
   - Sort by estimated savings
   - Note "Diagnostics" for context

4. **Create optimization plan**
   - Prioritize by impact vs effort
   - Group related changes
   - Plan testing approach

### Phase 2: Quick Wins (Day 2-3)

#### Images
- [ ] Add width/height to all images
- [ ] Convert hero images to WebP
- [ ] Resize images to display size
- [ ] Implement lazy loading (below fold)
- [ ] Preload LCP image

**BigCommerce:**
```html
<!-- In theme template -->
<img src="{{getImage product.image 'original'}}"
     width="800" height="800"
     loading="lazy"
     alt="{{product.name}}">
```

**Shopify:**
```liquid
{{ product.featured_image | image_url: width: 800 | image_tag:
   loading: 'lazy',
   width: product.featured_image.width,
   height: product.featured_image.height }}
```

**WooCommerce:**
```php
// In functions.php
add_filter('wp_get_attachment_image_attributes', function($attr) {
    if (!isset($attr['loading'])) {
        $attr['loading'] = 'lazy';
    }
    return $attr;
});
```

#### Fonts
- [ ] Preload critical fonts
- [ ] Use font-display: swap or optional
- [ ] Subset fonts if possible
- [ ] Limit font variations

```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<style>
  @font-face {
    font-family: 'Main Font';
    src: url('/fonts/main.woff2') format('woff2');
    font-display: swap;
  }
</style>
```

#### Scripts
- [ ] Defer non-critical JavaScript
- [ ] Remove unused scripts
- [ ] Move scripts to footer

```html
<!-- Before </body> -->
<script src="analytics.js" defer></script>
<script src="chat-widget.js" defer></script>
```

### Phase 3: Medium Effort (Day 4-7)

#### Critical CSS
1. Generate critical CSS for above-fold content
2. Inline in `<head>`
3. Load full CSS async

```html
<head>
  <style>/* Critical CSS here */</style>
  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="styles.css"></noscript>
</head>
```

#### JavaScript Optimization
1. Audit bundle size
2. Implement code splitting
3. Remove unused code
4. Defer third-party scripts

**Third-party script facade pattern:**
```html
<!-- Chat widget facade -->
<button id="chat-trigger" onclick="loadChat()">Chat with us</button>
<script>
function loadChat() {
  // Load actual widget only when clicked
  const script = document.createElement('script');
  script.src = 'https://chat-provider.com/widget.js';
  document.body.appendChild(script);
}
</script>
```

#### Server/CDN
- [ ] Verify CDN is active
- [ ] Enable compression (gzip/brotli)
- [ ] Set cache headers
- [ ] Enable HTTP/2

**Cache headers (nginx):**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Phase 4: Structural Changes (Week 2+)

#### Layout Stability (CLS)
1. Audit all dynamic content
2. Reserve space for ads/embeds
3. Fix font loading shifts
4. Remove layout-affecting animations

**Reserve space for dynamic content:**
```css
.ad-container {
  min-height: 250px;
  background: #f5f5f5;
}

.review-widget {
  min-height: 400px;
}
```

#### Interaction Optimization (INP)
1. Profile main thread
2. Break up long tasks
3. Optimize event handlers
4. Consider web workers

**Break up long tasks:**
```javascript
// Instead of one long task
function processItems(items) {
  items.forEach(item => heavyProcess(item));
}

// Break into chunks
function processItemsChunked(items) {
  const chunk = items.splice(0, 10);
  chunk.forEach(item => heavyProcess(item));

  if (items.length > 0) {
    requestIdleCallback(() => processItemsChunked(items));
  }
}
```

---

## Platform-Specific Playbooks

### BigCommerce Optimization

1. **Theme optimization**
   ```bash
   # Install Stencil CLI
   npm install -g @bigcommerce/stencil-cli

   # Pull theme
   stencil pull

   # Make changes to templates/assets
   # Test locally
   stencil start

   # Push optimized theme
   stencil push
   ```

2. **Script Manager audit**
   - Admin → Storefront → Script Manager
   - Review each script's placement
   - Move to footer where possible
   - Disable unused scripts

3. **Image settings**
   - Admin → Storefront → Image Manager
   - Enable WebP conversion
   - Set appropriate dimensions

### Shopify Optimization

1. **Theme optimization**
   ```liquid
   {%- comment -%} Defer non-critical CSS {%- endcomment -%}
   <link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style" onload="this.onload=null;this.rel='stylesheet'">

   {%- comment -%} Preload hero image {%- endcomment -%}
   {%- if template == 'index' -%}
     <link rel="preload" as="image" href="{{ section.settings.hero_image | image_url: width: 1200 }}">
   {%- endif -%}
   ```

2. **App audit**
   - Settings → Apps and sales channels
   - Review each app's scripts
   - Remove unused apps
   - Contact app developers about performance

3. **Liquid optimization**
   - Minimize Liquid loops
   - Use `{% cache %}` where available
   - Avoid nested Liquid in CSS/JS

### WooCommerce Optimization

1. **Install caching plugin**
   ```
   Recommended: WP Rocket (paid) or W3 Total Cache (free)

   WP Rocket settings:
   - Page caching: ON
   - Browser caching: ON
   - GZIP compression: ON
   - Minify CSS/JS: ON
   - Defer JavaScript: ON
   - Lazy load images: ON
   ```

2. **Configure CDN**
   ```
   Cloudflare setup:
   1. Create Cloudflare account
   2. Add site
   3. Update nameservers
   4. Enable: Auto Minify, Brotli, Polish
   5. Page Rules: Cache Everything for /wp-content/*
   ```

3. **Database optimization**
   ```
   Install WP-Optimize:
   - Clean post revisions
   - Clean auto-drafts
   - Clean transients
   - Optimize tables
   ```

4. **Plugin audit**
   ```bash
   # List active plugins
   wp plugin list --status=active

   # Deactivate test
   wp plugin deactivate {plugin-name}
   # Run Lighthouse
   # Reactivate if needed
   wp plugin activate {plugin-name}
   ```

---

## Validation & Testing

### Pre-Deployment Testing
1. Run Lighthouse locally
2. Test on mobile device
3. Check Network tab for new requests
4. Verify no JavaScript errors
5. Test critical user flows

### Post-Deployment Validation
1. Clear all caches (CDN, platform, browser)
2. Run fresh Lighthouse audit
3. Compare with baseline
4. Document improvements
5. Monitor field data (wait 28 days for CrUX)

### Regression Testing
```bash
# Save baseline
npx tsx scripts/run-lighthouse-audit.ts --url https://site.com --output baseline.json

# After changes, compare
npx tsx scripts/run-lighthouse-audit.ts --url https://site.com --compare baseline.json
```

---

## Optimization Tracking Template

### Change Log

| Date | Change | Expected Impact | Actual Result |
|------|--------|-----------------|---------------|
| | | | |

### Weekly Performance Report

**Week of: ___________**

| Business | Before | After | Change |
|----------|--------|-------|--------|
| BOO Mobile | | | |
| BOO Desktop | | | |
| Teelixir Mobile | | | |
| Teelixir Desktop | | | |
| Elevate Mobile | | | |
| RHF Mobile | | | |

### Monthly CWV Status

| Business | LCP | INP | CLS | Pass? |
|----------|-----|-----|-----|-------|
| BOO | | | | |
| Teelixir | | | | |
| Elevate | | | | |
| RHF | | | | |

---

## Success Metrics

| Goal | Target | Measurement |
|------|--------|-------------|
| All sites pass CWV | 100% | GSC Page Experience |
| Mobile performance score | >70 | Lighthouse |
| Desktop performance score | >80 | Lighthouse |
| No regressions | <5% drop | Weekly audits |
| Issues fixed within SLA | 48h critical, 7d warning | Alert tracking |
