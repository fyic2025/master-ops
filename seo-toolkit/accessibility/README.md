# Accessibility Agent

**Type:** Compliance Agent
**Version:** 1.0.0
**Mission:** Achieve 100/100 accessibility score with WCAG 2.1 AA/AAA compliance

## Overview

The Accessibility Agent ensures that Teelixir and Elevate Shopify stores are fully accessible to all users, including those using assistive technologies. This agent audits for accessibility violations, ensures WCAG 2.1 compliance (Level AA minimum, AAA target), and provides specific remediation guidance.

## Standards Compliance

### WCAG 2.1 Levels
- **Level A:** Basic accessibility (must pass all)
- **Level AA:** Required standard (100% compliance)
- **Level AAA:** Enhanced accessibility (target where feasible)

### Legal Compliance
- ADA (Americans with Disabilities Act)
- AODA (Accessibility for Ontarians with Disabilities Act) - Relevant for Canada
- Section 508
- EN 301 549

## Core Responsibilities

### 1. Automated Testing
- Run axe-core on all pages
- Execute pa11y CI tests
- Parse Lighthouse accessibility audits
- Detect common violations automatically

### 2. Manual Testing (Simulated)
- Keyboard navigation verification
- Screen reader compatibility (simulated NVDA/JAWS)
- Zoom/resize testing (up to 400%)
- Color blindness simulation
- Focus indicator validation

### 3. Violation Reporting
- Categorize by severity (critical/high/medium/low)
- Map to WCAG criteria
- Provide specific remediation guidance
- Include code examples

### 4. Implementation Coordination
- Work with Theme Optimizer Agent on fixes
- Validate fixes after implementation
- Document accessibility patterns

## Key Audit Areas

### Keyboard Navigation (Critical)
✅ All interactive elements accessible via keyboard
✅ Logical tab order
✅ Visible focus indicators (3:1 contrast minimum)
✅ No keyboard traps
✅ Skip navigation links present

### Screen Reader Compatibility (Critical)
✅ Semantic HTML5 structure
✅ Proper heading hierarchy (h1-h6)
✅ Alt text for all images
✅ ARIA labels where semantic HTML insufficient
✅ Form labels properly associated
✅ Meaningful link text
✅ Live regions for dynamic content

### Color Contrast (Critical)
✅ Normal text: 4.5:1 contrast minimum (AA), 7:1 target (AAA)
✅ Large text (18pt+): 3:1 minimum (AA), 4.5:1 target (AAA)
✅ UI components: 3:1 minimum
✅ Focus indicators: Adequate contrast

### Forms (Critical)
✅ Every input has associated label
✅ Error messages clear and accessible
✅ Required fields indicated
✅ Input purpose identified (autocomplete)
✅ Related fields grouped (fieldset/legend)

### Visual Design (High Priority)
✅ Text resizable to 200% without loss of content
✅ Content reflows at 400% zoom (no horizontal scroll)
✅ Adequate spacing between touch targets (44x44px minimum)
✅ Clear visual hierarchy

### Multimedia (High Priority)
✅ Captions for video content
✅ Transcripts for audio
✅ Audio description where needed
✅ No autoplay (or pause/stop controls)
✅ Accessible media player controls

## Common Violations & Fixes

### 1. Missing Alt Text
**Violation:** `<img src="product.jpg">` (no alt attribute)
**Fix:**
```liquid
<img src="{{ product.image | image_url }}" alt="{{ product.title | escape }}">

{%- # For decorative images -%}
<img src="{{ icon | asset_url }}" alt="" role="presentation">
```

### 2. Low Color Contrast
**Violation:** Light gray text (#999) on white background (#FFF) = 2.8:1
**Fix:** Use darker gray (#595959) for 7:1 contrast ratio (AAA)

### 3. Missing Form Labels
**Violation:**
```html
<input type="email" placeholder="Email">
```
**Fix:**
```html
<label for="email">Email Address</label>
<input type="email" id="email" name="email" placeholder="you@example.com">
```

### 4. Invalid ARIA
**Violation:**
```html
<div role="button" class="cta">Click here</div>
```
**Fix:**
```html
<button type="button" class="cta">Learn about our products</button>
```

### 5. Heading Order Skip
**Violation:** h1 → h3 (skips h2)
**Fix:** Use logical hierarchy: h1 → h2 → h3

### 6. Non-Descriptive Link Text
**Violation:**
```html
<a href="/products">Click here</a>
```
**Fix:**
```html
<a href="/products">Browse our mushroom products</a>
```

### 7. Missing Focus Indicators
**Violation:**
```css
*:focus { outline: none; }
```
**Fix:**
```css
*:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}
```

## Testing Strategy

### Automated Testing (60% coverage)
```bash
# Run axe-core
npx @axe-core/cli https://teelixir-au.myshopify.com

# Run pa11y
npx pa11y https://teelixir-au.myshopify.com

# Lighthouse accessibility audit
# (via Lighthouse Audit Agent)
```

### Manual Testing Checklist (40% coverage)

**Keyboard Navigation:**
- [ ] Tab through entire page
- [ ] Verify logical order
- [ ] Check focus indicators visible
- [ ] Test skip links
- [ ] Verify no keyboard traps

**Screen Reader (Simulated):**
- [ ] Heading structure makes sense
- [ ] Images have alt text
- [ ] Links are descriptive
- [ ] Forms are properly labeled
- [ ] Dynamic content announced

**Zoom/Resize:**
- [ ] Test at 200% zoom
- [ ] Test at 400% zoom
- [ ] No horizontal scrolling
- [ ] Content remains usable

**Color/Contrast:**
- [ ] Run contrast checker on all text
- [ ] Simulate color blindness
- [ ] Ensure information not conveyed by color alone

## ARIA Usage Guidelines

### Prefer Semantic HTML
```html
<!-- GOOD: Semantic HTML -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

<!-- AVOID: Unnecessary ARIA -->
<div role="navigation">
  <div role="list">
    <div role="listitem"><a href="/">Home</a></div>
  </div>
</div>
```

### Use ARIA Only When Needed
```html
<!-- GOOD: Native button -->
<button type="button">Add to Cart</button>

<!-- AVOID: Div as button (requires ARIA + JS) -->
<div role="button" tabindex="0" onclick="...">Add to Cart</div>

<!-- GOOD: ARIA where semantic HTML insufficient -->
<nav aria-label="Primary Navigation">...</nav>
<button aria-expanded="false" aria-controls="menu">Menu</button>
```

## Accessibility Patterns Library

### Skip Navigation
```liquid
{%- # In theme.liquid, before header -%}
<a href="#main-content" class="skip-to-content">
  Skip to content
</a>

{%- # CSS -%}
<style>
  .skip-to-content {
    position: absolute;
    left: -9999px;
    z-index: 999;
  }
  .skip-to-content:focus {
    left: 50%;
    transform: translateX(-50%);
    top: 10px;
  }
</style>

{%- # Main content -%}
<main id="main-content" tabindex="-1">
  {%- # Page content -%}
</main>
```

### Accessible Modal
```liquid
<div role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
  <h2 id="modal-title">Modal Title</h2>
  <button aria-label="Close dialog">×</button>
  {%- # Modal content -%}
</div>
```

### Accessible Dropdown Menu
```liquid
<button aria-expanded="false" aria-controls="menu-dropdown">
  Menu
</button>
<ul id="menu-dropdown" hidden>
  <li><a href="/">Home</a></li>
  <li><a href="/products">Products</a></li>
</ul>
```

## Shopify-Specific Considerations

### Product Images
```liquid
{%- # Use product alt text or title -%}
<img
  src="{{ product.featured_image | image_url }}"
  alt="{{ product.featured_image.alt | default: product.title | escape }}"
>
```

### Collection Filters
```liquid
<form action="{{ collection.url }}" method="get">
  <fieldset>
    <legend>Filter by type</legend>
    {%- for value in filter.values -%}
      <label>
        <input type="checkbox" name="{{ filter.param_name }}" value="{{ value.value }}">
        {{ value.label }}
      </label>
    {%- endfor -%}
  </fieldset>
  <button type="submit">Apply Filters</button>
</form>
```

### Cart Updates
```liquid
{%- # Announce cart updates to screen readers -%}
<div role="status" aria-live="polite" aria-atomic="true" class="visually-hidden">
  Item added to cart
</div>
```

## Violation Report Format

```markdown
## Accessibility Violation Report
**Page:** /products/chaga-mushroom
**Date:** 2024-11-20

### Critical Violations (Block 100/100)

**1. Missing Alt Text (WCAG 1.1.1)**
- **Element:** Product gallery image #3
- **Current:** `<img src="chaga-3.jpg">`
- **Fix:** `<img src="chaga-3.jpg" alt="Chaga mushroom growing on birch tree">`
- **Impact:** Screen reader users cannot perceive image content

**2. Low Color Contrast (WCAG 1.4.3)**
- **Element:** .product-description text
- **Current:** #999 on #FFF (2.8:1 ratio)
- **Fix:** Use #595959 for 7:1 ratio (AAA)
- **Impact:** Low vision users cannot read text

### High Priority

**3. Missing Form Label (WCAG 1.3.1, 4.1.2)**
- **Element:** Email signup input
- **Current:** `<input type="email" placeholder="Email">`
- **Fix:**
```html
<label for="email-signup">Email Address</label>
<input type="email" id="email-signup" name="email" placeholder="you@example.com">
```
- **Impact:** Screen reader users don't know input purpose

### Validation Steps
1. Run axe-core after fixes
2. Test keyboard navigation
3. Verify screen reader announcements
4. Re-run Lighthouse audit
```

## Tools & Resources

### Testing Tools
- **axe DevTools:** Browser extension for accessibility testing
- **pa11y:** CI-friendly accessibility testing
- **WAVE:** Visual accessibility evaluation
- **Color Contrast Analyzer:** Check contrast ratios
- **Screen Reader Simulators:** Test with NVDA/JAWS

### Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)
- [Deque University](https://dequeuniversity.com/)

## Success Metrics
- **Primary:** 100/100 Lighthouse accessibility score
- **Secondary:** Zero critical WCAG violations
- **Legal:** Full ADA/AODA compliance
- **UX:** Fully keyboard navigable
- **Quality:** All fixes validated via testing
