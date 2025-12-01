# BOO Supplier Infrastructure

Detailed documentation of all supplier integrations for Buy Organics Online.

## Suppliers Overview

| Supplier | Products | Connection | Stock Data | Sync Frequency |
|----------|----------|------------|------------|----------------|
| Oborne/CH2 | ~8,570 | FTP | Exact quantities | 8am/8pm AEST |
| UHP | ~4,501 | HTTPS | Binary (TRUE/FALSE) | 8am/8pm AEST |
| Kadac | ~950 | CSV API | Exact quantities | 8am/8pm AEST |
| Unleashed | ~430 | REST API | Exact quantities | 8am/8pm AEST |

---

## Oborne/CH2

### Connection Details
- **Type**: FTP
- **Host**: `ftp3.ch2.net.au`
- **User**: `retail_310`
- **Password**: (stored in script)
- **Directory**: `prod_retail_310/`

### Files
1. **inventory.csv** - Stock quantities by branch
   - Columns: `id`, `branch`, `availablequantity`
   - Pipe-delimited (`|`)

2. **products.csv** - Product master data
   - Columns: `id`, `name`, `brandid`, `brand`, `weight`, `upccode`, `baseprice`, `rrp`, `oborne_id`, `oborne_sku`, `taxschedule`, `obsolete`
   - Pipe-delimited

### Stock Calculation
```javascript
// Sum available quantities across all branches
const totalStock = inventoryRows
  .filter(row => row.id === productId)
  .reduce((sum, row) => sum + parseInt(row.availablequantity), 0);
```

### Known Issues
- **ID Mismatch Risk**: Inventory linked by `id` field, not SKU
- **Obsolete Products**: Products with `obsolete=true` should be filtered
- **Feed Delay**: FTP files updated by NetSuite automation

### Loader Script
```
buy-organics-online/load-oborne-products.js
```

---

## UHP (United Health Products)

### Connection Details
- **Type**: HTTPS Download
- **URL**: `https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx`
- **Auth**: None required

### File Format
- XLSX spreadsheet
- Columns: `Stockcode`, `Description`, `Brand`, `Size`, `W/S ex GST`, `RRP`, `InStock`, `MOQ`, `Categories`, `Image1`, `Image2`, `Ctn Qty`, `Ctn Barcode`, `APN Barcode`

### Stock Handling
```javascript
// UHP only provides binary stock status
const stockLevel = row.InStock === 'TRUE' ? 100 : 0;
```

### Known Issues
- **Binary Stock Only**: No actual quantities - only TRUE/FALSE
- **Stock Level Assumption**: TRUE mapped to 100, FALSE to 0
- **Overstocking Risk**: Products may show "in stock" but have limited quantities

### Loader Script
```
buy-organics-online/load-uhp-products.js
```

---

## Kadac

### Connection Details
- **Type**: CSV API
- **URL**: `https://remote.kadac.com.au/customers/products.asp`
- **Auth**: UID parameter in URL
- **UID**: `d83f42d2f1224d94856ea35c4323a94d`

### File Format
- CSV
- Columns: `sku`, `brand`, `description`, `size`, `gst`, `wholesale`, `rrp`, `percarton`, `cartononly`, `barcode`, `stockstatus`, `imageurl`

### Stock Status Values
- `In Stock` → stock_level = 100
- `Out of Stock` → stock_level = 0
- `Low Stock` → stock_level = 10 (estimated)
- Other → stock_level = 0

### Known Issues
- **Categorical Stock**: Like UHP, provides status not quantities
- **Carton-Only Products**: Some products only available by carton

### Loader Script
```
buy-organics-online/load-kadac-products.js
```

---

## Unleashed

### Connection Details
- **Type**: REST API
- **Auth**: API Key + HMAC signature
- **Base URL**: Unleashed API endpoint

### Stock Data
- Provides exact quantities from warehouse
- Real-time availability

### Known Issues
- **Rate Limits**: API has request limits
- **Auth Complexity**: HMAC signature required

### Loader Script
```
buy-organics-online/load-unleashed-products.js
```

---

## Sync Flow

### Master Orchestrator
```
buy-organics-online/sync-all-suppliers.js
```

Runs all loaders sequentially:
1. load-oborne-products.js
2. load-uhp-products.js
3. load-kadac-products.js
4. load-unleashed-products.js

### Cron Schedule
```
buy-organics-online/stock-sync-cron.js
```

- **8:00 AM AEST** - Morning sync
- **8:00 PM AEST** - Evening sync

### Post-Sync Processing
1. **sync-stock-to-links.js** - Update product_supplier_links
2. **update-bc-availability.js** - Update BigCommerce availability

---

## Database Tables

### supplier_products
Consolidated supplier product data.

```sql
supplier_name TEXT  -- 'oborne', 'uhp', 'kadac', 'unleashed'
supplier_sku TEXT
barcode TEXT
product_name TEXT
brand TEXT
stock_level INTEGER
availability TEXT
rrp DECIMAL
wholesale_price DECIMAL
metadata JSONB
synced_at TIMESTAMPTZ
```

### product_supplier_links
Links BigCommerce products to suppliers.

```sql
ecommerce_product_id UUID
supplier_product_id UUID
supplier_name TEXT
notes JSONB  -- {stock_level, availability, in_stock, last_sync}
is_active BOOLEAN
```

### sync_logs
Audit trail for sync operations.

```sql
sync_type TEXT
supplier_name TEXT
status TEXT  -- 'running', 'completed', 'failed', 'partial'
records_processed INTEGER
records_created INTEGER
records_updated INTEGER
records_failed INTEGER
error_message TEXT
error_details JSONB
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

---

## Troubleshooting

### Oborne FTP Connection Failed
1. Check FTP credentials
2. Verify network connectivity
3. Check if FTP server is responding
4. Contact CH2 if persistent

### UHP Download Failed
1. Check if URL is accessible
2. Verify file exists at URL
3. Check for certificate issues
4. Try manual download in browser

### Kadac API Error
1. Verify UID is valid
2. Check API response status
3. Look for rate limiting
4. Contact Kadac if UID expired

### Zero Stock After Sync
1. Check supplier feed directly
2. Verify product matching (SKU alignment)
3. Check for data format changes
4. Review sync_logs for errors
