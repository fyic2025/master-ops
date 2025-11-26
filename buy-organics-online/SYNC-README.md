# BOO Supplier Stock Sync System

**Project Name:** Sync
**Purpose:** Automated supplier stock sync to Supabase with BigCommerce availability updates

## Quick Start

```bash
cd buy-organics-online

# Full sync (all suppliers + stock status)
node sync-all-suppliers.js

# Update BC availability (dry run)
node update-bc-availability.js

# Update BC availability (live)
node update-bc-availability.js --live

# Start cron scheduler (8am/8pm AEST)
node stock-sync-cron.js

# Run sync immediately
node stock-sync-cron.js --now
```

## Data Flow

```
Supplier Feeds (UHP, Kadac, Oborne, Unleashed)
         ↓ (8am & 8pm cron)
    Supabase: supplier_products.stock_level
         ↓
    sync-stock-to-links.js
         ↓
    product_supplier_links.notes = {stock_level, in_stock, availability}
         ↓
    update-bc-availability.js
         ↓
    BigCommerce API: Update availability
```

## Files

| File | Purpose |
|------|---------|
| `sync-all-suppliers.js` | Master sync - runs all loaders + stock-to-links |
| `load-uhp-products.js` | UHP XLSX → Supabase |
| `load-kadac-products.js` | Kadac CSV API → Supabase |
| `load-oborne-products.js` | Oborne FTP → Supabase |
| `load-unleashed-products.js` | Unleashed API → Supabase |
| `sync-stock-to-links.js` | Sync stock status to product_supplier_links |
| `update-bc-availability.js` | Update BC based on supplier stock |
| `stock-sync-cron.js` | Cron scheduler (8am/8pm AEST) |
| `link-products-full.js` | Link BC products to suppliers |
| `check-stock-status.js` | View current stock status |

## Supplier Sources

| Supplier | Source | Products |
|----------|--------|----------|
| UHP | XLSX download | ~4,500 |
| Kadac | CSV API | ~950 |
| Oborne | FTP | ~7,500 |
| Unleashed | REST API | ~430 |

## Stock Status Storage

Every `product_supplier_links` record has stock info in `notes` field:

```json
{
  "stock_level": 100,
  "availability": "available",
  "in_stock": true,
  "last_sync": "2025-11-26T06:48:03.489Z"
}
```

## Cron Schedule

- **8:00 AM AEST** - Morning sync
- **8:00 PM AEST** - Evening sync

## Dependencies

```
@supabase/supabase-js, axios, basic-ftp, exceljs, node-cron, xlsx
```

## Database Tables

- `supplier_products` - Raw supplier data with stock_level
- `ecommerce_products` - BigCommerce product mirror
- `product_supplier_links` - Links between BC and suppliers (notes.in_stock)
