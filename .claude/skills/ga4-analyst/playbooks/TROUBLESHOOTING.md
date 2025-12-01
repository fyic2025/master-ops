# Troubleshooting - GA4 Analyst

## Decision Trees

### Traffic Drop Investigation

```
Traffic dropped?
├── Check data collection first
│   ├── Is GA4 tag firing?
│   │   ├── Open site → DevTools → Network → filter "collect"
│   │   ├── Check GTM preview mode
│   │   └── Verify measurement ID
│   │
│   └── Is data appearing in realtime?
│       ├── Yes → Data collection OK
│       └── No → Fix tracking first
│
├── Is it affecting all sources?
│   ├── Yes → Site-wide issue
│   │   ├── Technical problem
│   │   ├── Site down/slow
│   │   └── Seasonal pattern
│   │
│   └── No → Source-specific
│       ├── Organic drop → Check GSC
│       ├── Paid drop → Check ad accounts
│       ├── Email drop → Check campaigns
│       └── Direct drop → Check brand awareness
│
├── Is it affecting all devices?
│   ├── Yes → General issue
│   └── No → Device-specific
│       ├── Mobile only → Check mobile experience
│       └── Desktop only → Check desktop tracking
│
└── Compare with previous periods
    ├── Same time last year
    ├── Last month
    └── Last week
```

---

### Conversion Rate Drop

```
Conversion rate dropped?
├── Check transaction tracking
│   ├── Are purchases being recorded?
│   ├── Compare GA4 to platform orders
│   └── Check purchase event firing
│
├── Is traffic quality different?
│   ├── New traffic sources?
│   ├── Campaign changes?
│   └── Audience mix shift?
│
├── Is funnel affected?
│   ├── View → Cart drop? → Product page issue
│   ├── Cart → Checkout drop? → Cart experience issue
│   └── Checkout → Purchase drop? → Checkout issue
│
├── Is it device-specific?
│   ├── Mobile CVR drop → Mobile UX issue
│   └── Desktop CVR drop → Desktop UX issue
│
└── Recent site changes?
    ├── Price changes?
    ├── Shipping changes?
    ├── Layout changes?
    └── Checkout changes?
```

---

### Revenue Discrepancy

```
GA4 revenue ≠ Platform revenue?
├── Check currency settings
│   ├── Same currency in GA4 and platform?
│   └── Currency conversion applied?
│
├── Check transaction completeness
│   ├── All orders tracked?
│   ├── Test orders included?
│   └── Refunds reflected?
│
├── Check timing
│   ├── GA4 uses event time
│   ├── Platform uses order time
│   └── Timezone differences?
│
├── Check deduplication
│   ├── Transaction ID unique?
│   ├── Duplicate events?
│   └── Multiple purchase fires?
│
└── Acceptable variance
    ├── <5% → Normal
    ├── 5-10% → Investigate
    └── >10% → Fix required
```

---

### E-commerce Events Not Firing

```
E-commerce events missing?
├── Check data layer
│   ├── Open DevTools Console
│   ├── Type: dataLayer
│   ├── Look for e-commerce events
│   └── Check event structure
│
├── Check GTM configuration
│   ├── Tags configured?
│   ├── Triggers correct?
│   ├── Variables mapped?
│   └── Preview mode working?
│
├── Platform-specific checks
│   │
│   ├── BigCommerce
│   │   ├── Check Analytics settings
│   │   ├── Verify script placement
│   │   └── Check checkout snippet
│   │
│   ├── Shopify
│   │   ├── Check GA4 app settings
│   │   ├── Verify customer events
│   │   └── Check additional scripts
│   │
│   └── WooCommerce
│       ├── Check GA4 plugin
│       ├── Verify dataLayer plugin
│       └── Check theme compatibility
│
└── Test purchase flow
    ├── Add to cart → check event
    ├── Begin checkout → check event
    └── Purchase → check event
```

---

## Common Issues by Platform

### BigCommerce (BOO)

| Issue | Cause | Solution |
|-------|-------|----------|
| Missing purchases | Checkout on different domain | Implement cross-domain tracking |
| Double transactions | Multiple tag fires | Add transaction ID dedup |
| Missing add_to_cart | AJAX cart not tracked | Custom event implementation |
| Wrong revenue | Tax/shipping config | Check value calculation |

### Shopify (Teelixir, Elevate)

| Issue | Cause | Solution |
|-------|-------|----------|
| Missing checkout events | Checkout is Shopify-hosted | Use customer events API |
| Duplicate purchases | Page refresh on thank you | Transaction ID dedup |
| Wrong item data | Theme not passing data | Update theme snippets |
| Missing view_item | Product page variants | Implement per-variant tracking |

### WooCommerce (RHF)

| Issue | Cause | Solution |
|-------|-------|----------|
| No events at all | Plugin not installed | Install GA4 plugin |
| Missing purchases | Thank you page cached | Exclude from cache |
| Wrong prices | Tax config mismatch | Check WooCommerce tax settings |
| Partial events | Plugin conflicts | Test with other plugins disabled |

---

## Data Quality Issues

### Sampling
```
GA4 shows (based on X% of data)?
├── Reduce date range
├── Reduce dimensions
├── Use explorations (higher limits)
└── Export to BigQuery (full data)
```

### Cardinality
```
(other) row appearing?
├── Dimension has >500 unique values
├── Solutions:
│   ├── Filter to specific values
│   ├── Use shorter date range
│   └── Export via API
```

### Data Freshness
```
Data delayed?
├── Standard reports: 24-48 hours typical
├── Realtime: Few seconds
├── BigQuery export: 24 hours
└── If >48 hours delayed: Check property health
```

---

## Verification Procedures

### After Implementation Changes

1. **Preview Mode Test**
   ```
   - Open GTM preview
   - Navigate through funnel
   - Verify each event fires
   - Check event parameters
   ```

2. **Realtime Verification**
   ```
   - Open GA4 Realtime
   - Perform test actions
   - Verify events appear
   - Check event parameters
   ```

3. **Debug View**
   ```
   - Enable debug mode (?debug_mode=true)
   - Open DebugView in GA4
   - Perform test actions
   - Verify full event details
   ```

### Regular Audits

**Daily**
- [ ] Check realtime shows activity
- [ ] Compare yesterday's data to platform

**Weekly**
- [ ] Compare GA4 transactions to platform
- [ ] Review conversion rates by device
- [ ] Check for anomalies in traffic sources

**Monthly**
- [ ] Full event audit
- [ ] Cross-property comparison
- [ ] Revenue reconciliation

---

## Emergency Procedures

### Complete Tracking Failure

1. **Verify scope**
   - All properties or one?
   - All events or specific?
   - When did it start?

2. **Check fundamentals**
   - Site accessible?
   - GTM container loading?
   - GA4 config tag firing?

3. **Recent changes**
   - GTM container changes?
   - Site deployment?
   - Theme changes?

4. **Rollback if needed**
   - GTM version history
   - Site rollback
   - Theme restore

5. **Verify fix**
   - Test in preview mode
   - Check realtime
   - Monitor for 24 hours

### Major Discrepancy Discovered

1. **Document the gap**
   - GA4 value: $X
   - Platform value: $Y
   - Period: dates
   - Gap: $Z (%)

2. **Identify cause**
   - Missing transactions
   - Duplicate transactions
   - Wrong values
   - Timing issues

3. **Fix forward**
   - Implement fix
   - Test thoroughly
   - Document changes

4. **Consider backfill**
   - Can we correct historical data?
   - BigQuery adjustments?
   - Note discrepancy in reports
