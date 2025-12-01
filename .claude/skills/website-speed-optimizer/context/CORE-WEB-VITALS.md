# Core Web Vitals - Technical Reference

## Metric Definitions

### LCP - Largest Contentful Paint

**What it measures:** Time until the largest content element is rendered.

**Target:** ≤2.5 seconds

**Common LCP Elements:**
- Hero images
- Background images
- Video poster images
- Block-level text elements
- SVG elements

**Calculation:**
- Measured from navigation start
- Updates as larger elements render
- Final value when user interacts or page is hidden

**Diagnostic Steps:**
1. Identify LCP element: Chrome DevTools → Performance → Timings → LCP
2. Check resource load time
3. Check render delay
4. Check element size and priority

---

### INP - Interaction to Next Paint

**What it measures:** Responsiveness to user interactions (replaced FID in March 2024).

**Target:** ≤200 milliseconds

**Interactions Measured:**
- Clicks
- Taps
- Key presses
- NOT: Scrolling, hovering

**Calculation:**
- Time from interaction to next paint
- 75th percentile of all interactions
- Includes input delay + processing + presentation

**Diagnostic Steps:**
1. Profile with Chrome DevTools Performance panel
2. Look for long tasks (>50ms)
3. Check event handlers
4. Review JavaScript bundle size

---

### CLS - Cumulative Layout Shift

**What it measures:** Visual stability - unexpected layout shifts.

**Target:** ≤0.1

**Elements That Cause CLS:**
- Images without dimensions
- Ads/embeds without reserved space
- Dynamically injected content
- Web fonts causing FOIT/FOUT
- Actions waiting for network before updating DOM

**Calculation:**
- Sum of all individual shift scores
- Shift score = impact fraction × distance fraction
- Session windows (5s max, 1s gap) → largest window

**Diagnostic Steps:**
1. Chrome DevTools → Performance → Experience → Layout Shift
2. Check for elements without explicit dimensions
3. Review dynamic content insertion
4. Test font loading behavior

---

### TTFB - Time to First Byte

**What it measures:** Server responsiveness.

**Target:** ≤800 milliseconds

**Components:**
- DNS lookup
- TCP connection
- TLS negotiation
- Server processing
- Network latency

**Diagnostic Steps:**
1. Chrome DevTools → Network → first document → Timing
2. Check redirect chains
3. Verify CDN is serving
4. Monitor server response time

---

### FCP - First Contentful Paint

**What it measures:** Time until first content renders.

**Target:** ≤1.8 seconds

**What Triggers FCP:**
- Text
- Images (including backgrounds)
- SVG
- Non-white canvas

**Diagnostic Steps:**
1. Check render-blocking resources
2. Review critical CSS
3. Verify font loading
4. Check server response

---

## Measurement Methods

### Lab Data (Synthetic)
- Controlled environment
- Consistent, reproducible
- Good for debugging
- Tools: Lighthouse, WebPageTest, PSI lab data

### Field Data (Real Users)
- Actual user experience
- Varies by device/network
- What Google uses for ranking
- Sources: CrUX, RUM tools, PSI field data

### 75th Percentile
- Google uses p75 for pass/fail
- 75% of page loads must meet threshold
- More representative than median
- Accounts for variability

---

## Chrome DevTools Workflow

### Performance Panel
```
1. Open DevTools (F12)
2. Go to Performance tab
3. Check "Web Vitals" checkbox
4. Click Record
5. Interact with page
6. Stop recording
7. Review Timings lane for LCP, CLS, INP
```

### Lighthouse Panel
```
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Select categories (Performance)
4. Choose device (Mobile recommended)
5. Click "Analyze page load"
6. Review report
```

### Network Panel (for TTFB)
```
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Click first document request
5. Review Timing breakdown
```

---

## PageSpeed Insights API

### Endpoint
```
https://www.googleapis.com/pagespeedonline/v5/runPagespeed
```

### Parameters
| Param | Values | Default |
|-------|--------|---------|
| url | Full URL | Required |
| strategy | mobile, desktop | mobile |
| category | performance, accessibility, best-practices, seo | all |
| key | API key | Optional (rate limited without) |

### Response Structure
```json
{
  "loadingExperience": {
    "metrics": {
      "LARGEST_CONTENTFUL_PAINT_MS": {
        "percentile": 2500,
        "category": "AVERAGE"
      }
    },
    "overall_category": "AVERAGE"
  },
  "lighthouseResult": {
    "categories": {
      "performance": {
        "score": 0.75
      }
    },
    "audits": {
      "largest-contentful-paint": {
        "numericValue": 2450
      }
    }
  }
}
```

### Rate Limits
- Without API key: 25,000 queries/day
- With API key: 25,000 queries/day (but tracked)
- Per-second limit: ~400 queries

---

## CrUX (Chrome User Experience Report)

### Data Sources
- Real Chrome users (opted-in)
- 28-day rolling average
- Origin-level and URL-level data
- Available via BigQuery or API

### CrUX API
```bash
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "https://teelixir.com",
    "metrics": ["largest_contentful_paint", "cumulative_layout_shift", "interaction_to_next_paint"]
  }'
```

### Data Thresholds
- Minimum 1000 samples for URL-level
- Minimum 1000 samples for origin-level
- Some URLs may not have data

---

## Optimization Priority Matrix

### High Impact + Easy Fix
1. Add image dimensions (width/height)
2. Preload LCP image
3. Defer non-critical JS
4. Enable text compression

### High Impact + Medium Effort
1. Optimize hero images (WebP, sizing)
2. Implement critical CSS
3. Configure CDN caching
4. Remove unused CSS/JS

### High Impact + Hard Fix
1. Reduce JavaScript bundle size
2. Break up long tasks
3. Server-side rendering
4. Database optimization

### Low Impact
1. Minor image optimization
2. Preconnect hints
3. DNS prefetch
4. Minor CSS cleanup

---

## Google Search Ranking Signal

### Page Experience Update (2021-2022)
- CWV is a ranking factor
- Combined with mobile-friendly, HTTPS, no intrusive interstitials
- Tiebreaker when content quality is similar
- Not a dominant factor (content still king)

### INP Replacement (March 2024)
- INP replaced FID as CWV metric
- More comprehensive interaction measurement
- Existing FID-passing sites may fail INP
- Grace period through March 2024

### Search Console Integration
- Page Experience report in GSC
- Shows CWV pass/fail by URL group
- Identifies pages needing improvement
- Updates every 28 days (CrUX data)
