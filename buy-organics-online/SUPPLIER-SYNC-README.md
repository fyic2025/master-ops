# Supplier Sync Scripts

This directory contains scripts to sync supplier product data to Supabase.

## Overview

Three suppliers provide product data that needs to be synced to the `supplier_products` table:

1. **Oborne** - Email/CSV based
2. **Kadac** - API/CSV based
3. **UHP** - HTTPS with authentication

## Scripts

### 1. Oborne Sync (`sync-oborne-to-supabase.ts`)

**Method:** Email IMAP (manual CSV download for now)

**How to run:**
```bash
# First, download the latest Oborne CSV to: ./oborne_new.csv
# (Check email: kylie@buyorganicsonline.com.au for attachments from sent-via.netsuite.com)

npx tsx sync-oborne-to-supabase.ts
```

**CSV Columns:**
- Name (supplier SKU)
- Display Name
- Brand
- W/S ex gst (cost price)
- RRP
- Barcode
- Availability (In Stock, Out of Stock)
- To Be Discontinued (Yes, No)
- GST Status

**Future Enhancement:** Add IMAP email fetching to download CSV automatically

---

### 2. Kadac Sync (`sync-kadac-to-supabase.ts`)

**Method:** Direct CSV download from API

**Setup:**
```bash
# Set the Kadac CSV URL as an environment variable
export KADAC_CSV_URL="https://kadac-api-url-here/products.csv"

# Or edit the script and replace KADAC_CSV_URL_HERE with actual URL
```

**How to run:**
```bash
npx tsx sync-kadac-to-supabase.ts
```

**CSV Columns:**
- sku
- description
- brand
- barcode
- size
- wholesale (cost price)
- rrp
- stockstatus (available, outofstock, deleted, discontinued)
- gst (Y/N)
- imageurl

---

### 3. UHP Sync (`sync-uhp-to-supabase.ts`)

**Method:** HTTPS login + download

**Credentials:**
- URL: https://shop.uhp.com.au/login
- Email: sales@buyorganicsonline.com.au
- Password: 10386

**How to run:**
```bash
npx tsx sync-uhp-to-supabase.ts
```

**CSV Columns:**
- SKU
- Description
- Brand
- Barcode
- Size
- Price (cost price/wholesale)
- RRP
- In Stock (Y/N)
- Tax (Y/N for GST)
- Imageurl

---

## Supabase Schema

All three scripts sync to the `supplier_products` table:

```sql
CREATE TABLE supplier_products (
  id UUID PRIMARY KEY,
  supplier_name VARCHAR(50) NOT NULL,  -- 'Oborne', 'Kadac', 'UHP'
  supplier_sku VARCHAR(255),
  barcode VARCHAR(255),
  product_name TEXT,
  brand VARCHAR(255),
  cost_price DECIMAL(10,2),
  rrp DECIMAL(10,2),
  stock_level INTEGER,
  moq INTEGER,
  cartononly VARCHAR(1),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Unique Constraint:** (supplier_name, supplier_sku)

---

## Scheduling

To run these scripts on a schedule, you can use:

### Option 1: Windows Task Scheduler
```batch
@echo off
cd c:\Users\jayso\master-ops\buy-organics-online
npx tsx sync-oborne-to-supabase.ts
npx tsx sync-kadac-to-supabase.ts
npx tsx sync-uhp-to-supabase.ts
```

Schedule: Every 2 hours

### Option 2: n8n Workflow
Create n8n workflows that execute these scripts via Shell Execute node

### Option 3: GitHub Actions (future)
Set up automated runs via GitHub Actions cron jobs

---

## Monitoring

All sync operations log to the `automation_logs` table:

```sql
SELECT * FROM automation_logs
WHERE workflow_type = 'supplier_sync'
ORDER BY started_at DESC;
```

---

## Next Steps

After supplier data is synced, you need to:

1. **Link products** - Match BigCommerce products to suppliers via barcode
2. **Set priorities** - Choose which supplier to use for each product
3. **Update BC** - Sync prices and availability back to BigCommerce

See: [link-products-to-suppliers.ts](./link-products-to-suppliers.ts) (coming soon)

---

## Troubleshooting

**Oborne:**
- If CSV file is missing, check email for attachments
- File should be placed at: `./oborne_new.csv`

**Kadac:**
- If sync fails, verify KADAC_CSV_URL is correct
- Check API credentials if required

**UHP:**
- If login fails, verify credentials are still valid
- UHP website may have changed login flow (update cheerio selectors)

---

## Dependencies

Required packages (already installed):
- `@supabase/supabase-js` - Supabase client
- `axios` - HTTP requests
- `csv-parser` - Parse CSV files
- `cheerio` - Parse HTML (for UHP login)
