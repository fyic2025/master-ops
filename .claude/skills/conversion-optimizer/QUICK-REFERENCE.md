# Conversion Optimizer - Quick Reference

## Get A/B Test Results

```sql
-- Active tests
SELECT * FROM ab_tests
WHERE business_slug = 'teelixir'
  AND status = 'running'
ORDER BY started_at DESC;

-- Test performance
SELECT
  test_name,
  variant_name,
  impressions,
  conversions,
  conversion_rate,
  revenue
FROM ab_test_variants
WHERE test_id = 'uuid-here'
ORDER BY conversion_rate DESC;
```

## Statistical Significance

### Minimum Sample Size Formula
```typescript
// For 95% confidence, 80% power, 5% minimum detectable effect
const minSamplePerVariant = 16 * (conversionRate * (1 - conversionRate)) / (0.05 * 0.05);
```

### Z-Score for Significance
```typescript
const zScore = (rateA - rateB) / Math.sqrt(
  (rateA * (1 - rateA) / nA) +
  (rateB * (1 - rateB) / nB)
);
// zScore > 1.96 = 95% confident
// zScore > 2.58 = 99% confident
```

## Conversion Benchmarks

| Metric | Good | Excellent |
|--------|------|-----------|
| Email Open Rate | 25% | 35%+ |
| Email Click Rate | 5% | 8%+ |
| Landing Page Conversion | 3.5% | 5%+ |
| Cart Abandonment Recovery | 10% | 15%+ |
| ROAS | 3x | 5x+ |

## Quick Test Types

### Subject Line Test
```json
{
  "type": "email_subject",
  "variants": [
    { "name": "A", "value": "Your 15% discount awaits" },
    { "name": "B", "value": "Last chance: 15% off ends tonight" }
  ],
  "metric": "open_rate"
}
```

### CTA Button Test
```json
{
  "type": "cta_button",
  "variants": [
    { "name": "A", "value": "Shop Now", "color": "#2d5a3d" },
    { "name": "B", "value": "Get 15% Off", "color": "#c8a45c" }
  ],
  "metric": "click_rate"
}
```

## Winning Variant Decision

| Confidence | Action |
|------------|--------|
| < 80% | Keep testing |
| 80-95% | Cautiously implement winner |
| > 95% | Implement winner |
| > 99% | Strong winner, implement |

## CLI Commands

```bash
# Get active tests
npx tsx scripts/ab-tester.ts list teelixir

# Check test significance
npx tsx scripts/ab-tester.ts significance <test_id>

# Generate test report
npx tsx scripts/ab-tester.ts report <test_id>
```
