# Red Hill Fresh - Performance Optimization

**Date:** 2025-12-01
**Platform:** WooCommerce on Kinsta
**URL:** https://www.redhillfresh.com.au

## Baseline Audit Results

### GTmetrix (Sydney)
| Metric | Value | Target |
|--------|-------|--------|
| Grade | B | A |
| Performance | 86% | 90%+ |
| Structure | 81% | 90%+ |
| LCP | 1.64s | < 2.5s |
| TBT | 47ms | < 200ms |
| CLS | 0.002 | < 0.1 |
| Page Size | 3.34MB | < 2MB |
| Requests | 115 | < 100 |
| Fully Loaded | 5.31s | < 5s |
| TTFB | 89ms | < 600ms |

### Lighthouse
| Metric | Value | Target |
|--------|-------|--------|
| Performance | 38% | 90%+ |
| Accessibility | 83% | 95%+ |
| Best Practices | 79% | 95%+ |
| SEO | 92% | 95%+ |
| FCP | 5.93s | < 1.8s |
| LCP | 23.0s | < 2.5s |
| TBT | 755ms | < 200ms |
| Speed Index | 9.44s | < 3.4s |

## Infrastructure

- **Hosting:** Kinsta (managed WordPress)
- **CDN:** Cloudflare (active)
- **Edge Cache:** Working (`x-kinsta-cache: HIT`)
- **Plugins Detected:** Yoast SEO, Jetpack, WooCommerce, Facebook for WC

## Top Issues to Fix

1. **Eliminate render-blocking resources** - Est savings: 2,700ms
2. **Preconnect to required origins** - Est savings: 750ms
3. **Minify JavaScript** - Est savings: 452 KiB
4. **Reduce unused CSS** - Est savings: 146 KiB
5. **Minify CSS** - Est savings: 82 KiB

## PHP Performance Code

Add via **Code Snippets plugin** or **functions.php**:

```php
<?php
/**
 * RHF Performance Optimizations
 * Fixes: Preconnect, Render-blocking, Defer JS
 */

// 1. PRECONNECT - saves ~750ms
add_action('wp_head', function() {
    echo '<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>';
    echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    echo '<link rel="preconnect" href="https://www.googletagmanager.com" crossorigin>';
    echo '<link rel="preconnect" href="https://connect.facebook.net" crossorigin>';
    echo '<link rel="preconnect" href="https://www.google-analytics.com" crossorigin>';
    echo '<link rel="dns-prefetch" href="//cdnjs.cloudflare.com">';
}, 1);

// 2. DEFER NON-CRITICAL JS - saves ~2700ms
add_filter('script_loader_tag', function($tag, $handle) {
    // Don't defer critical scripts
    $no_defer = ['jquery', 'jquery-core', 'wc-checkout', 'wc-cart'];
    if (in_array($handle, $no_defer)) return $tag;
    if (is_admin()) return $tag;
    if (strpos($tag, 'defer') !== false) return $tag;
    return str_replace(' src=', ' defer src=', $tag);
}, 10, 2);

// 3. REMOVE WORDPRESS BLOAT - saves ~50KB
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'rest_output_link_wp_head');

// 4. DISABLE EMBEDS - saves ~30KB
add_action('wp_footer', function() {
    wp_dequeue_script('wp-embed');
});

// 5. LAZY LOAD IMAGES (native)
add_filter('wp_get_attachment_image_attributes', function($attr) {
    $attr['loading'] = 'lazy';
    return $attr;
});

// 6. OPTIMIZE WOOCOMMERCE
add_action('wp_enqueue_scripts', function() {
    // Remove WC scripts from non-WC pages
    if (!is_woocommerce() && !is_cart() && !is_checkout()) {
        wp_dequeue_style('woocommerce-general');
        wp_dequeue_style('woocommerce-layout');
        wp_dequeue_style('woocommerce-smallscreen');
        wp_dequeue_script('wc-cart-fragments');
    }
}, 99);
```

## Recommended Plugins

| Plugin | Purpose | Free? |
|--------|---------|-------|
| **Autoptimize** | CSS/JS minification, defer | Yes |
| **Jetpack Boost** | Critical CSS, defer JS, lazy images | Freemium |
| **WP Rocket** | Full caching solution | Paid ($59/yr) |
| **Perfmatters** | Script management, disable bloat | Paid ($24/yr) |

## Access Credentials

Stored in Supabase Vault under `redhillfresh/`:
- `wp_admin_user` - WordPress admin email
- `wp_admin_password` - WordPress admin password
- `wc_consumer_key` - WooCommerce API key
- `wc_consumer_secret` - WooCommerce API secret
- `google_ads_customer_id` - 3990630515
- `google_merchant_id` - 523304312

## API Access Status

| API | Status | Notes |
|-----|--------|-------|
| WooCommerce REST | Working | Full product/order access |
| WordPress REST | Partial | Need Application Password for plugin mgmt |
| Google Search Console | Working | Via jayson@fyic.com.au |
| GTmetrix | Working | Via shared API key |

## Next Steps

1. [ ] Install Code Snippets plugin
2. [ ] Add performance PHP code
3. [ ] Clear Kinsta cache
4. [ ] Re-run Lighthouse audit
5. [ ] Consider Autoptimize for CSS/JS minification
6. [ ] Optimize images (compress to WebP)
7. [ ] Audit third-party scripts (Facebook pixel, etc.)

## Test Commands

```bash
# Run GTmetrix test
node -e "const gt=require('./shared/libs/integrations/gtmetrix/client.js'); gt.runTest('https://www.redhillfresh.com.au').then(t=>gt.waitForResults(t.id)).then(r=>console.log(gt.formatReport(r,gt.analyzeResults(r))))"

# Run Lighthouse test
npx lighthouse https://www.redhillfresh.com.au --output=html --view
```

## Reports

- GTmetrix: https://gtmetrix.com/reports/www.redhillfresh.com.au/MROF5BVl/
