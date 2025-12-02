# Skill Updates - Progress Notes

**Date:** 2025-12-02
**Status:** Mostly Complete

---

## Completed

### Platform Skills with Real API Access

| Skill | Status | Businesses | Test Command |
|-------|--------|------------|--------------|
| **Klaviyo** | ✅ Working | BOO, Teelixir, Elevate | `node .claude/skills/klaviyo-expert/scripts/klaviyo.js boo profiles --recent` |
| **BigCommerce** | ✅ Working | BOO (3,000+ products) | `npx tsx .claude/skills/bigcommerce-expert/scripts/bc-client.ts products --list` |
| **Shopify** | ✅ Working | Teelixir, Elevate | `npx tsx .claude/skills/shopify-expert/scripts/shopify-client.ts --store teelixir products --list` |
| **WooCommerce** | ✅ Working | Red Hill Fresh | `npx tsx .claude/skills/woocommerce-expert/scripts/wc-client.ts orders --recent 5` |
| **GSC** | ✅ Working | All 4 businesses | `npx tsx .claude/skills/gsc-expert/scripts/sync-gsc-data.ts` |

### GSC Data Synced (2025-12-02)

| Business | Rows | URL Format |
|----------|------|------------|
| BOO | 59,009 | `https://www.buyorganicsonline.com.au/` |
| Teelixir | 4 | `https://teelixir.com/` |
| Elevate | 131 | `sc-domain:elevatewholesale.com.au` |
| RHF | 5,635 | `sc-domain:redhillfresh.com.au` |

### Technical Fixes Applied

1. **ES Module Compatibility** - Added `createRequire(import.meta.url)` to all TypeScript scripts
2. **GSC URL Formats** - Fixed to use exact formats from `sites.list` API
3. **Supabase Config** - Updated to use `MASTER_SUPABASE_*` env vars
4. **Error Handling** - Improved error output with status codes and helpful messages

---

## Unresolved Issues

### GA4 Skill - Needs Setup

**Problem:** GA4 sync script not working

**Root Causes:**
1. **Missing Property IDs** - Need to add GA4 property IDs to vault
2. **OAuth Scope** - Global GSC refresh token doesn't have `analytics.readonly` scope

**To Fix:**

Option A - Add property IDs manually:
```bash
# Get property IDs from: Google Analytics > Admin > Property Settings > Property ID
node creds.js store boo ga4_property_id "PROPERTY_ID"
node creds.js store teelixir ga4_property_id "PROPERTY_ID"
node creds.js store elevate ga4_property_id "PROPERTY_ID"
node creds.js store redhillfresh ga4_property_id "PROPERTY_ID"
```

Option B - Create new OAuth token with analytics scope:
```
Required scope: https://www.googleapis.com/auth/analytics.readonly
```

**Files affected:**
- `.claude/skills/ga4-analyst/scripts/sync-ga4-data.ts`
- `.claude/skills/ga4-analyst/scripts/generate-traffic-report.ts`

---

### Teelixir GSC - Low Data

**Observation:** Only 4 rows synced for Teelixir (vs 59K for BOO)

**Possible causes:**
- New site with limited search visibility
- Different property verification (URL prefix vs domain)
- Data retention settings

**To investigate:** Check GSC dashboard directly for teelixir.com

---

## Commits

| Hash | Description |
|------|-------------|
| `2185197` | Platform skills with real API access + ES module fixes |
| `789a72c` | Google API dependencies + error handling |
| `cdedb84` | GSC sync working + migration |

---

## Migration Files Created

- `infra/supabase/migrations/20251202_gsc_search_performance.sql` - GSC raw data table

---

## Next Steps

1. [ ] Get GA4 property IDs from Google Analytics dashboard
2. [ ] Add GA4 property IDs to vault
3. [ ] Test GA4 sync
4. [ ] Create GA4 Supabase migration if needed
5. [ ] Investigate Teelixir low GSC data
