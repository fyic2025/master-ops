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

## Elevate Wholesale - Customer Login (Dec 2, 2025)

**Store Type:** Basic Shopify with New Customer Accounts (Passwordless)
**Purpose:** B2B wholesale only - gatekept via "approved" tag

### How Login Works (Passwordless/OTP)

1. Customer goes to site → clicks Login
2. Enters email address
3. Receives 6-digit OTP code via email
4. Enters code → logged in

**Key Finding:** The Shopify `state` field (`disabled`/`invited`/`enabled`) is a **legacy field** that does NOT affect passwordless login. Customers can log in regardless of state.

### Changes Made (Dec 2, 2025)

| Change | Status |
|--------|--------|
| Disabled "Sign in with Shop" button | ✅ Done |
| Shopify Flow "Auto-invite approved customers" | ❌ Turned OFF |

**Why Flow was turned off:**
- Default Shopify invite email says "click to activate your account"
- This confuses customers - they don't need to click anything
- With passwordless, they just log in directly with email + OTP

### Original Issue

Customers reported they couldn't log in. Actual causes:
1. "Sign in with Shop" button caused confusion (now disabled)
2. Customers didn't understand the OTP login flow
3. The "activation" emails added more confusion (not needed for passwordless)

### For New Customers

When a new customer is approved:
1. Add "approved" tag to customer in Shopify
2. Send custom welcome email explaining how to log in (use `elevate-wholesale/templates/prospecting/welcome.html`)
3. Customer goes to site, enters email, gets OTP, logs in

No Shopify "activation" needed.

### Testing Status (Dec 2, 2025)

- Rajani tested login successfully (state remained "invited" but login worked)
- Awaiting broader test results (Dec 3)

**Quick check command:**
```bash
# Check Elevate customer activation status
# Use Shopify Admin API with customer read access
# Token stored in: node creds.js get elevate shopify_access_token
npx tsx .claude/skills/shopify-expert/scripts/shopify-client.ts --store elevate customers --list
```

---

## Marketing Skills Suite - 100/100 Complete (Dec 2, 2025)

### Skills Created

| Skill | Status | Key Files |
|-------|--------|-----------|
| **brand-asset-manager** | ✅ Complete | SKILL.md, scripts/brand-client.ts |
| **email-template-designer** | ✅ Complete | SKILL.md, scripts/template-client.ts, templates/*.html |
| **marketing-copywriter** | ✅ Complete | SKILL.md, scripts/copy-generator.ts |
| **email-preview-tester** | ✅ Complete | SKILL.md, scripts/preview-tester.ts |
| **conversion-optimizer** | ✅ Complete | SKILL.md, QUICK-REFERENCE.md |
| **marketing-analytics-reporter** | ✅ Complete | SKILL.md, QUICK-REFERENCE.md |
| **customer-segmentation-engine** | ✅ Complete | SKILL.md, scripts/segment-calculator.ts |
| **product-image-enhancer** | ✅ Complete | SKILL.md, scripts/image-enhancer.ts |
| **social-creative-generator** | ✅ Complete | SKILL.md, QUICK-REFERENCE.md |
| **landing-page-builder** | ✅ Complete | SKILL.md, QUICK-REFERENCE.md |

### External Integrations

| Integration | Path | Status |
|-------------|------|--------|
| **Litmus** | `shared/libs/integrations/litmus/client.ts` | ✅ Complete |
| **Cloudinary** | `shared/libs/integrations/cloudinary/client.ts` | ✅ Complete |

### Database Migration

- `infra/supabase/migrations/20251203_marketing_skills_foundation.sql`
- Tables: brand_guidelines, brand_assets, email_templates, customer_rfm_scores, landing_pages, marketing_copy_library, skill_implementation_progress
- Pre-populated brand data for all 4 businesses

### Quick Commands

```bash
# Brand Assets
npx tsx .claude/skills/brand-asset-manager/scripts/brand-client.ts guidelines teelixir

# Email Templates
npx tsx .claude/skills/email-template-designer/scripts/template-client.ts list teelixir

# Copy Generation
npx tsx .claude/skills/marketing-copywriter/scripts/copy-generator.ts subjects teelixir "wellness"

# Email Testing
npx tsx .claude/skills/email-preview-tester/scripts/preview-tester.ts test templates/promotional.html

# Customer Segments
npx tsx .claude/skills/customer-segmentation-engine/scripts/segment-calculator.ts summary teelixir

# Image Enhancement
npx tsx .claude/skills/product-image-enhancer/scripts/image-enhancer.ts product-variants my-image
```

---

## Next Steps

1. [ ] Get GA4 property IDs from Google Analytics dashboard
2. [ ] Add GA4 property IDs to vault
3. [ ] Test GA4 sync
4. [ ] Create GA4 Supabase migration if needed
5. [ ] Investigate Teelixir low GSC data
6. [ ] Apply marketing skills migration to Supabase
7. [ ] Set up Litmus API credentials (LITMUS_API_KEY, LITMUS_API_SECRET)
8. [ ] Set up Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
