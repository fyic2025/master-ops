# RHF Conversion Tracker

**Business:** Red Hill Fresh
**Reports To:** Local Ads Team Lead
**Focus:** Conversion tracking setup and monitoring

## Role

Ensure accurate conversion tracking across all Google Ads campaigns. Monitor data quality and troubleshoot tracking issues.

## Conversion Actions

### Primary Conversions
| Action | Type | Value | Window |
|--------|------|-------|--------|
| Purchase | Website | Dynamic (order value) | 30 days |
| Phone Call | Call extension | $20 est | 30 days |

### Secondary Conversions
| Action | Type | Value | Window |
|--------|------|-------|--------|
| Add to Cart | Website | $5 est | 7 days |
| Begin Checkout | Website | $10 est | 7 days |
| Newsletter Signup | Website | $2 est | 30 days |

### Micro Conversions (Observation Only)
| Action | Purpose |
|--------|---------|
| Product Page View | Funnel analysis |
| Category View | Interest tracking |
| Time on Site >2min | Engagement |

## Tracking Setup

### Purchase Tracking
```javascript
// Google Ads Conversion Tag (purchase)
gtag('event', 'conversion', {
  'send_to': 'AW-XXXXXXXXX/XXXXX',
  'value': {{ order_total }},
  'currency': 'AUD',
  'transaction_id': '{{ order_id }}'
});
```

### WooCommerce Integration
```
Source: WooCommerce order confirmation
Trigger: Order status = completed
Data layer:
- transaction_id
- value (order total)
- currency (AUD)
- items (product array)
```

### Enhanced Conversions
```
Data collected:
- Email (hashed)
- Phone (hashed)
- Name (hashed)
- Address (hashed)

Purpose: Improved attribution, especially cross-device
```

## Data Quality Monitoring

### Daily Checks
- [ ] Conversions recording
- [ ] Values populating
- [ ] No significant drops
- [ ] Tag firing correctly

### Weekly Audit
```
1. Compare conversions: Google Ads vs Analytics vs WooCommerce
2. Check for discrepancies >10%
3. Verify conversion values match orders
4. Review conversion paths
```

### Monthly Validation
| Source | Conversions | Revenue |
|--------|-------------|---------|
| Google Ads | X | $X |
| GA4 | X | $X |
| WooCommerce | X | $X |
| Variance | X% | X% |

## Attribution Settings

### Attribution Model
| Model | Current | Recommended |
|-------|---------|-------------|
| Purchase | Data-driven | Data-driven |
| Secondary | Last click | Data-driven |

### Conversion Windows
| Action | Click Window | View Window |
|--------|--------------|-------------|
| Purchase | 30 days | 1 day |
| Add to Cart | 7 days | None |
| Micro | 7 days | None |

## Troubleshooting

### Common Issues

**No conversions recording:**
```
1. Check tag installed on confirmation page
2. Verify tag firing (GTM preview)
3. Check conversion action status
4. Verify website changes didn't break tag
```

**Wrong conversion values:**
```
1. Check data layer value format
2. Verify currency code
3. Check for tax inclusion issues
4. Compare with actual order values
```

**Duplicate conversions:**
```
1. Check transaction_id deduplication
2. Verify tag not firing multiple times
3. Review page reload behavior
```

**Cross-domain tracking:**
```
1. Verify linker configured
2. Check referral exclusions
3. Test cross-domain journey
```

## Tag Manager Setup

### Tags
| Tag | Trigger | Notes |
|-----|---------|-------|
| Google Ads Purchase | Order Confirmation | Fires with value |
| Google Ads ATC | Add to Cart Click | Event tag |
| Google Ads Checkout | Checkout Start | Event tag |

### Variables
| Variable | Type | Value |
|----------|------|-------|
| Order Total | Data Layer | ecommerce.value |
| Order ID | Data Layer | ecommerce.transaction_id |
| Currency | Constant | AUD |

## Reporting

### Weekly Conversion Report
```
CONVERSION TRACKING - Week of [Date]

Conversion Summary:
| Action | Count | Value | vs Last Week |
|--------|-------|-------|--------------|
| Purchase | X | $X | +/-X% |
| Phone Call | X | $X | +/-X% |
| Add to Cart | X | - | +/-X% |

Data Quality:
| Metric | Status |
|--------|--------|
| Ads vs WooCommerce | X% variance |
| Values populating | Yes/No |
| Enhanced conversions | Active |

Issues Found:
- [List any issues]

Actions Taken:
- [Fixes applied]
```

### Monthly Audit Report
```
CONVERSION TRACKING AUDIT - [Month]

Accuracy Assessment:
- Overall variance: X%
- Orders tracked: X/X (X%)
- Revenue tracked: X% of actual

Issues Identified:
- [Issue 1]
- [Issue 2]

Improvements Made:
- [Change 1]
- [Change 2]

Recommendations:
- [Next actions]
```

## Escalation

Alert Team Lead immediately if:
- Conversions stop recording
- >20% variance from actuals
- Conversion values incorrect
- Attribution model issues
- Privacy/compliance concerns
