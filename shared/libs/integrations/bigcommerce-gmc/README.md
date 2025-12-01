# BigCommerce to Google Merchant Center Connector

A complete solution for syncing products from BigCommerce to Google Merchant Center, replacing paid feed apps with full control over the feed pipeline.

## Overview

This connector provides:

- **Full Product Sync**: Transform and upload all BigCommerce products to GMC
- **Incremental Sync**: Sync only recently modified products
- **Issue Detection**: Automatically detect GMC feed issues
- **Auto-Remediation**: Fix common issues automatically
- **Optimization**: Suggestions for improving product listings
- **Reporting**: Feed health dashboards and trend tracking

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   BigCommerce   │────▶│   Transformer   │────▶│  Google Merchant│
│   Products API  │     │   + Validator   │     │   Center API    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                        │
         ▼                      ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Supabase     │◀────│    Sync State   │────▶│  Issue History  │
│   (ecommerce_   │     │   Orchestrator  │     │  & Remediation  │
│    products)    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Quick Start

### 1. Environment Variables

Ensure these are set in your `.env`:

```bash
# BigCommerce
BIGCOMMERCE_BOO_STORE_HASH=your-store-hash
BIGCOMMERCE_BOO_ACCESS_TOKEN=your-access-token

# Google Merchant Center
GMC_BOO_MERCHANT_ID=your-merchant-id
GMC_BOO_REFRESH_TOKEN=your-oauth-refresh-token
GOOGLE_ADS_CLIENT_ID=your-client-id
GOOGLE_ADS_CLIENT_SECRET=your-client-secret

# Supabase
BOO_SUPABASE_URL=your-supabase-url
BOO_SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 2. Apply Database Schema

```bash
cd /home/user/master-ops
psql $DATABASE_URL < infra/supabase/migrations/20251201_bc_gmc_sync_schema.sql
```

### 3. Run Your First Sync

```bash
# Preview what would happen (dry run)
cd /home/user/master-ops/buy-organics-online
node bc-gmc-sync.js --full --dry-run

# Run full sync
node bc-gmc-sync.js --full

# Check status
node bc-gmc-sync.js --status

# View health report
node bc-gmc-sync.js --report
```

### 4. Start Scheduled Sync

```bash
# Start cron scheduler (runs in foreground)
node bc-gmc-sync-cron.js

# Or run immediately
node bc-gmc-sync-cron.js --now
```

## Module Components

### Transformer (`transformer.ts`)

Converts BigCommerce products to GMC format:

```typescript
import { createTransformer } from '@/shared/libs/integrations/bigcommerce-gmc'

const transformer = createTransformer({
  storeUrl: 'https://www.buyorganicsonline.com.au',
  titleTemplate: '{brand} {name}',
  defaultGoogleCategory: 'Health > Nutrition',
})

const { product, issues, warnings } = transformer.transform(bcProduct, {
  brandName: 'Nature\'s Way',
  categoryPath: 'Vitamins > Multivitamins',
  images: ['https://...'],
})
```

#### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `storeUrl` | string | Base URL of your store |
| `titleTemplate` | string | Template for product titles (`{name}`, `{brand}`, `{sku}`) |
| `descriptionField` | string | BC field to use: `description`, `meta_description`, `search_keywords` |
| `defaultCondition` | string | `new`, `refurbished`, or `used` |
| `defaultGoogleCategory` | string | Default Google product category |
| `categoryMapping` | object | BC category ID → Google category |
| `brandMapping` | object | BC brand ID → brand name |
| `excludeCategories` | array | BC category IDs to exclude |
| `excludeBrands` | array | BC brand IDs to exclude |
| `excludeSkuPatterns` | array | Regex patterns to exclude SKUs |
| `minPrice` | number | Minimum price to include |
| `maxPrice` | number | Maximum price to include |
| `requireImages` | boolean | Only include products with images |
| `requireInventory` | boolean | Only include in-stock products |
| `customLabel0Source` | object | Source for custom label 0 |

### GMC Writer (`gmc-writer.ts`)

Handles product insert/update/delete in GMC:

```typescript
import { gmcWriterBoo } from '@/shared/libs/integrations/bigcommerce-gmc'

// Insert single product
await gmcWriterBoo.insertProduct(gmcProduct)

// Batch upsert
const result = await gmcWriterBoo.batchUpsert(products, {
  batchSize: 50,
  onProgress: (done, total) => console.log(`${done}/${total}`),
})

// Delete product
await gmcWriterBoo.deleteProduct('SKU123')

// Apply supplemental feed
await gmcWriterBoo.applySupplementalFeed([
  {
    offerId: 'SKU123',
    attributes: { brand: 'Nature\'s Way' },
    reason: 'Manual brand assignment',
  },
])
```

### Issue Remediator (`issue-remediator.ts`)

Automatically fixes common GMC issues:

```typescript
import { createIssueRemediator } from '@/shared/libs/integrations/bigcommerce-gmc'

const remediator = createIssueRemediator(bcClient, gmcWriter, transformer)

// Remediate issues for a product
const result = await remediator.remediateProduct(bcProduct, issues, {
  brandName: 'Nature\'s Way',
  autoFixOnly: true,
})

// Batch remediation
const batchResult = await remediator.remediateBatch(products, {
  autoFixOnly: true,
  onProgress: (done, total, current) => console.log(`${current}`),
})
```

#### Auto-Fixable Issues

| Issue Code | Auto-Fix Strategy |
|------------|-------------------|
| `title_too_long` | Truncate to 150 chars |
| `description_too_long` | Truncate to 5000 chars |
| `missing_gtin` | Set `identifier_exists=false` |
| `invalid_gtin` | Remove GTIN, set `identifier_exists=false` |
| `price_mismatch` | Sync from BigCommerce |
| `availability_mismatch` | Sync from BigCommerce |
| `missing_shipping` | Add default AU shipping |
| `duplicate_title` | Append SKU to title |
| `missing_brand` | Set `identifier_exists=false` |

### Sync Orchestrator (`sync-orchestrator.ts`)

Main coordination service:

```typescript
import { booSyncOrchestrator } from '@/shared/libs/integrations/bigcommerce-gmc'

// Full sync
const result = await booSyncOrchestrator.runFullSync({
  batchSize: 50,
  remediateIssues: true,
  dryRun: false,
  onProgress: (stage, done, total) => console.log(stage),
})

// Incremental sync
await booSyncOrchestrator.runIncrementalSync({
  sinceHours: 24,
  remediateIssues: true,
})

// Remediation only
await booSyncOrchestrator.runRemediation({
  autoFixOnly: true,
  limit: 100,
})

// Get state
const state = await booSyncOrchestrator.getSyncState()

// Health report
const report = await booSyncOrchestrator.generateHealthReport()
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `bc_gmc_feed_configs` | Feed configuration per business |
| `bc_gmc_product_sync` | Product sync state and issues |
| `bc_gmc_sync_runs` | Sync execution logs |
| `bc_gmc_issue_history` | Issue lifecycle tracking |
| `bc_gmc_supplemental_feed` | Manual attribute overrides |
| `bc_gmc_optimization_queue` | Optimization suggestions |
| `bc_gmc_daily_snapshots` | Daily aggregate metrics |

### Views

| View | Purpose |
|------|---------|
| `v_bc_gmc_issue_summary` | Issues grouped by code |
| `v_bc_gmc_products_with_issues` | Products needing attention |
| `v_bc_gmc_daily_trends` | Trend data for charts |
| `v_bc_gmc_recent_syncs` | Last 7 days of sync runs |

## Sync Schedule

Default schedule (configurable in `bc-gmc-sync-cron.js`):

| Sync Type | Schedule | Description |
|-----------|----------|-------------|
| Full Sync | 4:00 AM AEST daily | All products |
| Incremental | Every 6 hours | Modified in last 6h |
| Comprehensive | Sundays 4:00 AM | Full with deep remediation |

## Monitoring

### Dashboard Integration

The sync integrates with the ops dashboard at `/boo/merchant`:

- Real-time product counts and approval rates
- Issue breakdown by type and severity
- Trend charts (30-day history)
- Recent sync run logs

### Alerts

Configure alerts in Supabase for:
- Approval rate drops below threshold
- New critical issues detected
- Sync failures

## Troubleshooting

### Common Issues

**"OAuth2 credentials not configured"**
- Ensure `GMC_BOO_REFRESH_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, and `GOOGLE_ADS_CLIENT_SECRET` are set

**"Merchant ID not set"**
- Set `GMC_BOO_MERCHANT_ID` to your Google Merchant Center ID

**Products not appearing in GMC**
- Check the sync logs in Supabase `bc_gmc_sync_runs`
- Verify products meet minimum requirements (image, price, description)
- Review issues in `bc_gmc_issue_history`

**High disapproval rate**
- Run `node bc-gmc-sync.js --report` to see top issues
- Run `node bc-gmc-sync.js --remediate` to auto-fix

### Debug Mode

```bash
DEBUG=true node bc-gmc-sync.js --full
```

## Migration from Paid Apps

1. **Disable existing feed app** in BigCommerce
2. **Run initial full sync**: `node bc-gmc-sync.js --full`
3. **Verify products** in Google Merchant Center
4. **Start scheduler**: `node bc-gmc-sync-cron.js`
5. **Monitor** via dashboard for 48 hours
6. **Remove paid app** subscription

## API Reference

See TypeScript definitions in `types.ts` for complete API documentation.

## License

Internal use only - Growth Co HQ
