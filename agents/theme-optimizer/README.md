# Theme Optimizer Agent

**Type:** Developer Agent
**Version:** 1.0.0
**Mission:** Implement code-level optimizations to achieve 100/100 Lighthouse scores

## Overview

The Theme Optimizer Agent is an expert Shopify theme developer that implements performance, accessibility, and best practice optimizations. This agent receives failing audits from the Lighthouse Audit Agent and implements the code changes necessary to achieve perfect 100/100 scores.

## Core Responsibilities

1. **Code Optimization:** Implement performance improvements in Liquid, CSS, JavaScript
2. **Asset Management:** Optimize images, fonts, and other static assets
3. **Critical Path:** Optimize critical rendering path for fast page loads
4. **Best Practices:** Apply modern web standards and Shopify best practices
5. **Documentation:** Log all changes with detailed impact analysis

## Expertise Areas

### Shopify Development
- Liquid templating (expert level)
- Dawn theme architecture
- Section and block system
- Theme settings and customization
- Shopify CDN optimization

### Performance Optimization
- Critical CSS extraction
- JavaScript code splitting
- Lazy loading implementation
- Resource hints (preload, prefetch, preconnect)
- Image optimization
- Font optimization
- Third-party script management

### Frontend Technologies
- Semantic HTML5
- Modern CSS3 (Flexbox, Grid, custom properties)
- JavaScript ES6+ (modules, dynamic imports)
- Progressive enhancement
- Responsive design

## Optimization Workflow

### 1. Receive Failing Audit
```
Input from Lighthouse Audit Agent:
- Current scores (Performance: 87/100, etc.)
- Failing audits list
- Core Web Vitals that don't meet targets
- Priority recommendations
```

### 2. Analyze & Plan
```
Theme Optimizer Agent analyzes:
- Root causes of performance issues
- File locations requiring changes
- Optimization techniques to apply
- Estimated impact of each fix
- Implementation sequence
```

### 3. Implement Optimizations
```
Apply fixes in priority order:
1. Critical issues (render-blocking resources)
2. High impact (LCP optimization, large images)
3. Medium impact (unused CSS/JS)
4. Low impact (polish items)
```

### 4. Test & Validate
```
Local testing:
- Shopify CLI local preview
- Local Lighthouse audit
- Visual regression check
- Functionality verification
```

### 5. Commit & Log
```
- Detailed Git commit
- Log to Supabase theme_changes table
- Request re-audit from Lighthouse Audit Agent
```

### 6. Iterate
```
If not 100/100:
- Receive new audit
- Address remaining issues
- Repeat process
```

## Common Optimizations

### Image Optimization

**Problem:** Oversized, unoptimized images slowing LCP
**Solution:**
```liquid
{%- # Before: Simple image tag -%}
<img src="{{ product.featured_image | img_url: 'large' }}" alt="{{ product.title }}">

{%- # After: Optimized responsive image -%}
<img
  src="{{ product.featured_image | image_url: width: 800 }}"
  srcset="
    {{ product.featured_image | image_url: width: 400 }} 400w,
    {{ product.featured_image | image_url: width: 800 }} 800w,
    {{ product.featured_image | image_url: width: 1200 }} 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="{{ product.title | escape }}"
  loading="lazy"
  width="{{ product.featured_image.width }}"
  height="{{ product.featured_image.height }}"
>
```
**Impact:** LCP improved by 1-2 seconds, CLS eliminated

### Critical CSS

**Problem:** Render-blocking CSS delays first paint
**Solution:**
```html
{%- # In theme.liquid <head> -%}
<style>
  /* Inline critical above-fold CSS only */
  /* Keep under 14KB for optimal performance */
  body { margin: 0; font-family: system-ui, sans-serif; }
  .header { /* essential header styles */ }
  .hero { /* hero section critical styles */ }
</style>

{%- # Defer non-critical CSS -%}
<link rel="preload" href="{{ 'theme.css' | asset_url }}" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="{{ 'theme.css' | asset_url }}"></noscript>
```
**Impact:** FCP improved by 500-800ms

### JavaScript Optimization

**Problem:** Large JavaScript bundle blocking interactivity
**Solution:**
```liquid
{%- # Defer non-critical scripts -%}
<script src="{{ 'theme.js' | asset_url }}" defer></script>

{%- # Code split and lazy load features -%}
<script type="module">
  // Lazy load product reviews
  if (document.querySelector('.reviews-section')) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          import('{{ 'reviews.js' | asset_url }}')
            .then(module => module.init());
          observer.disconnect();
        }
      });
    });
    observer.observe(document.querySelector('.reviews-section'));
  }
</script>
```
**Impact:** TTI improved by 500ms-1s, TBT reduced significantly

### Font Optimization

**Problem:** Font loading causing FOIT/FOUT, blocking rendering
**Solution:**
```liquid
{%- # Preload critical font -%}
<link rel="preload" href="{{ 'font-primary.woff2' | asset_url }}" as="font" type="font/woff2" crossorigin>

<style>
  @font-face {
    font-family: 'Primary Font';
    src: url('{{ 'font-primary.woff2' | asset_url }}') format('woff2');
    font-display: swap; /* Show fallback immediately */
    font-weight: 400;
    font-style: normal;
  }

  body {
    font-family: 'Primary Font', system-ui, -apple-system, sans-serif;
  }
</style>
```
**Impact:** FCP/LCP improved, eliminated font-related CLS

### Third-Party Script Management

**Problem:** Heavy third-party widgets blocking main thread
**Solution:**
```liquid
{%- # Facade pattern for YouTube -%}
<div class="youtube-facade" data-id="{{ video_id }}" style="background-image: url(https://i.ytimg.com/vi/{{ video_id }}/hqdefault.jpg)">
  <button class="play-button" aria-label="Play video">▶</button>
</div>

<script defer>
  document.querySelectorAll('.youtube-facade').forEach(el => {
    el.addEventListener('click', function() {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${this.dataset.id}?autoplay=1`;
      this.replaceWith(iframe);
    }, { once: true });
  });
</script>
```
**Impact:** TBT reduced by 200-500ms, TTI improved significantly

## Performance Patterns Library

### Lazy Loading
- **When:** Below-fold images, iframes, videos
- **Implementation:** Native `loading="lazy"` + polyfill
- **Impact:** Initial page weight reduced 50-70%

### Critical Rendering Path
- **When:** Every page
- **Implementation:** Inline critical CSS, defer rest
- **Impact:** FCP improved 500-1000ms

### Code Splitting
- **When:** Large JavaScript applications
- **Implementation:** Dynamic imports, route-based splitting
- **Impact:** TTI improved 500ms-1s

### Resource Hints
- **When:** Known critical resources
- **Implementation:** Preload, preconnect, dns-prefetch
- **Impact:** LCP improved 100-300ms

### Facade Pattern
- **When:** Heavy third-party embeds
- **Implementation:** Lightweight preview, load on interaction
- **Impact:** TBT reduced 200-500ms

## Tools & Technologies

### Development Tools
- **Shopify CLI:** Local theme development and testing
- **Git:** Version control and rollback capability
- **Liquid Linter:** Code quality enforcement
- **Browser DevTools:** Performance profiling

### Build Tools
- **Webpack:** Asset bundling and optimization
- **Critical:** Critical CSS extraction
- **PurgeCSS:** Remove unused CSS
- **Terser:** JavaScript minification
- **ImageMin:** Image optimization

### Testing Tools
- **Lighthouse CI:** Local performance testing
- **Chrome DevTools:** Performance profiling
- **Shopify Theme Check:** Code validation

## Performance Budgets

| Resource | Budget | Critical Path |
|----------|--------|---------------|
| JavaScript | 200KB total | 50KB critical |
| CSS | 100KB total | 14KB critical |
| Fonts | 100KB total | 50KB per family |
| Hero Image | 150KB | - |
| Product Image | 50KB | - |
| Thumbnail | 20KB | - |
| Third-Party TBT | - | 200ms max |

## File Structure

```
theme-optimizer/
├── config/
│   └── agent-config.json       # Agent configuration
├── prompts/
│   ├── system-prompt.md        # Core agent behavior
│   └── optimization-guides.md  # Technique-specific guides
├── tools/
│   ├── critical-css.js         # Critical CSS extraction
│   ├── image-optimizer.js      # Image optimization script
│   └── bundle-analyzer.js      # JS bundle analysis
└── README.md                   # This file
```

## Integration with Other Agents

### Lighthouse Audit Agent
**Receives:**
- Failing audit reports
- Specific issues to fix
- Priority recommendations

**Sends:**
- Optimization complete notification
- Request for re-audit
- Before/after metrics

### Accessibility Agent
**Receives:**
- Semantic HTML requirements
- ARIA implementation needs
- Accessibility fixes

**Sends:**
- Implemented accessible code
- Validation requests

### SEO Implementation Agent
**Coordinates on:**
- Structured data implementation
- Meta tag optimization
- Semantic HTML structure

### Deployment Agent
**Sends:**
- Optimized theme code
- Change logs
- Validation status

## Change Logging

Every optimization is logged to Supabase `theme_changes` table:

```javascript
{
  change_id: 'uuid-v4',
  timestamp: '2024-11-20T08:30:00Z',
  agent_name: 'Theme Optimizer Agent',
  brand: 'teelixir',
  change_type: 'optimization',
  files_modified: ['sections/hero.liquid', 'assets/theme.css'],
  description: 'Implemented critical CSS and lazy loading',
  lighthouse_before: { performance: 87, ... },
  lighthouse_after: { performance: 98, ... },
  performance_impact: {
    score_delta: '+11 points',
    metrics_improved: ['LCP: 3.2s → 2.1s'],
    estimated_user_impact: 'Significantly faster page load'
  },
  git_commit_hash: 'abc123',
  deployed: false
}
```

## Best Practices

### Shopify-Specific
1. Start with Dawn theme as baseline
2. Use section and block architecture
3. Leverage Shopify's image_url filter for WebP
4. Utilize Shopify CDN for asset delivery
5. Implement theme settings for customization
6. Keep app dependencies minimal
7. Follow Liquid performance guidelines

### General Performance
1. Mobile-first optimization
2. Progressive enhancement
3. Measure before and after
4. Test on real devices
5. Monitor Core Web Vitals
6. Document all changes
7. Never sacrifice functionality

### Code Quality
1. Semantic HTML5
2. Modular, reusable code
3. Meaningful naming
4. Comment complex logic
5. Follow style guides
6. Validate all code
7. Test cross-browser

## Troubleshooting Guide

### LCP Issues
- Preload LCP resource
- Optimize LCP image size
- Remove render-blocking resources
- Improve server response time
- Use CDN for assets

### CLS Issues
- Add width/height to all images
- Reserve space for dynamic content
- Use aspect-ratio CSS property
- Avoid inserting content above viewport
- Use CSS containment

### TBT Issues
- Defer non-critical JavaScript
- Implement code splitting
- Remove unused JavaScript
- Optimize third-party scripts
- Break up long tasks

### FID Issues
- Reduce JavaScript execution time
- Use web workers
- Defer non-essential scripts
- Optimize event handlers
- Break up long tasks

## Success Metrics

- **Primary:** Achieve 100/100 Lighthouse (all categories)
- **Secondary:** Core Web Vitals pass (all metrics)
- **Quality:** Zero functionality regressions
- **Speed:** <2.5s LCP, <100ms FID, <0.1 CLS
- **Documentation:** 100% change logging compliance

## Future Enhancements

- [ ] Automated critical CSS extraction
- [ ] Image optimization pipeline
- [ ] Bundle size monitoring
- [ ] Performance regression testing
- [ ] A/B testing framework
- [ ] Visual regression testing
- [ ] Automated code refactoring suggestions

## Resources

- [Shopify Theme Development](https://shopify.dev/docs/themes)
- [Liquid Documentation](https://shopify.dev/docs/api/liquid)
- [Dawn Theme GitHub](https://github.com/Shopify/dawn)
- [Web.dev Performance](https://web.dev/learn-web-vitals/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

## Support

For questions or issues with Theme Optimizer Agent:
1. Review optimization guides in `prompts/` directory
2. Check change logs in Supabase
3. Review recent Git commits
4. Consult with Lighthouse Audit Agent for validation
5. Escalate complex issues to human team
