# FYIC Portal System Analysis
## Buy Organics Online - Production Node.js System

**Analysis Date:** November 24, 2025
**Repository:** `C:\Users\jayso\fyic-portal`
**Purpose:** Complete system analysis to support AWS → Supabase migration
**Status:** Active Production System

---

## Executive Summary

The fyic-portal is a Node.js/Express application that manages Buy Organics Online product synchronization with BigCommerce. It integrates with 4 suppliers (Oborne/CH2, Kadac, UHP, GlobalNature), runs automated cron jobs every 2 hours, and uses AWS RDS MySQL for data storage.

**Key Metrics:**
- **API Endpoints:** 40+ routes
- **Database Tables:** 12+ tables
- **Suppliers:** 4 active integrations
- **Sync Frequency:** Every 2 hours (main sync), Daily orders
- **AWS Services:** RDS MySQL, S3, SES (via SendGrid)
- **Cron Jobs:** 7 scheduled tasks

---

## 1. Database Configuration

### Connection Setup

**File:** [src/config/mysql.js](C:\Users\jayso\fyic-portal\src\config\mysql.js)

#### Current Configuration (Lines 19-30)
```javascript
connection = mysql.createPool({
  connectionLimit: 50,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

**Pool Settings:**
- **Connection Limit:** 50 concurrent connections
- **Type:** Connection pooling with promise wrapper
- **Authentication:** Environment variable based

#### Legacy Configuration (Commented Out - Lines 6-17)
```javascript
// OLD RDS Connection - INACTIVE
// host: "newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com"
// user: "admin"
// password: "Welcome1A2030"
// database: "new_fyic_db"
```

### Database Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `connectMySql()` | Establishes connection pool | Line 4 |
| `getMySqlQuery()` | Returns promisified query function | Line 65 |
| `runMySqlQuery()` | Executes queries directly | Line 69 |
| `createMySqlFields()` | Generates SQL field strings | Line 73 |

### Connection Management
- Event handlers for `acquire` and `release` events
- Promise-based query execution for async/await support
- Automatic reconnection handling

---

## 2. Complete API Endpoint Mapping

**File:** [src/routes/api.routes.js](C:\Users\jayso\fyic-portal\src\routes\api.routes.js)

**Total Routes:** 224 lines
**Authentication:** All routes use `checkAuth()` middleware

### 2.1 BigCommerce Product Management

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| GET | `/load-big-commerce` | `apiController.loadBigCommerceProducts` | Fetch products from BC API | 8 |
| GET | `/big-commerce` | `apiController.getBigCommerceProducts` | Get products from local DB | 9 |
| GET | `/big-commerce-improve` | `apiController.getBigCommerceProductsImp` | Get improved product data | 10 |
| POST | `/update-big-commerce-product` | `apiController.updateBigCommerceProduct` | Update single product | 11 |
| POST | `/update-big-commerce-product-bulk` | `apiController.updateBigCommerceProductBulk` | Bulk update products | 12 |
| POST | `/insert-big-commerce-bulk` | `apiController.insertBigCommerceBulk` | Bulk insert products | 13 |

### 2.2 BigCommerce Categories

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| GET | `/load-big-commerce-category` | `apiController.loadBigCommerceCategory` | Fetch categories from BC | 15 |
| GET | `/big-commerce-categories` | `apiController.getBigCommerceCategories` | Get categories from DB | 16 |
| GET | `/big-commerce-categories-list` | `apiController.getBigCommerceCategoriesList` | List all categories | 17 |
| POST | `/update-big-commerce-cat-bulk` | `apiController.updateBigCommerceCatBulk` | Bulk update categories | 18 |

### 2.3 BigCommerce Blogs

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| GET | `/load-big-commerce-blog` | `apiController.loadBigCommerceBlog` | Fetch blogs from BC | 20 |
| GET | `/big-commerce-blogs` | `apiController.getBigCommerceBlogs` | Get blogs from DB | 21 |
| POST | `/update-big-commerce-blog-bulk` | `apiController.updateBigCommerceBlogBulk` | Bulk update blogs | 22 |

### 2.4 Supplier Product Endpoints

| Method | Endpoint | Controller | Supplier | Line |
|--------|----------|------------|----------|------|
| GET | `/uhp` | `apiController.getUHPProducts` | UHP | 26 |
| GET | `/oborne` | `apiController.getOborneProducts` | Oborne | 27 |
| GET | `/kadac` | `apiController.getKadacProducts` | Kadac | 28 |
| GET | `/global-nature` | `apiController.getGlobalNatureProducts` | GlobalNature | 29 |
| GET | `/kik` | `apiController.getKIK_Products` | KIK/Teelixir | 30 |

### 2.5 AI Content Generation

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| POST | `/text-google-ai` | `apiController.getTextGoogleAI` | Generate AI content | 32 |
| POST | `/bc-save-imp-description` | `apiController.saveImpDesc` | Save improved descriptions | 33 |
| POST | `/bc-get-imp-description` | `apiController.getImpDesc` | Get improved descriptions | 34 |
| GET | `/bc-get-imp-description-bulk` | `apiController.getImpDescBulk` | Bulk get descriptions | 35 |
| POST | `/bc-imp-score-ai` | `apiController.getImpScore` | Get AI quality scores | 36 |

### 2.6 Settings & Configuration

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| GET | `/settings/:code` | `apiController.getSetting` | Get setting by code | 38 |
| POST | `/settings/:code` | `apiController.addSetting` | Add/update setting | 39 |
| GET | `/crons` | `apiController.getCrons` | Get cron execution history | 41 |
| GET | `/all-products` | `apiController.getAllProducts` | Get all products | 42 |
| GET | `/not-listed` | `apiController.getNotListedProducts` | Get unlisted products | 43 |

### 2.7 Teelixir/KIK Specific Endpoints

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| GET | `/load-teelixir-data` | `apiController.loadTeelixirData` | Load Teelixir data | 45 |
| GET | `/teelixir-stock-analysis` | `apiController.teelixirStockAnalysis` | Stock analysis | 46 |
| GET | `/teelixir-stock-on-hand` | `apiController.teelixirStockOnHand` | Current stock | 47 |
| GET | `/teelixir-bill-of-materials` | `apiController.teelixirBillOfMaterials` | BOM report | 48 |
| GET | `/teelixir-stock-needs` | `apiController.teelixirStockNeeds` | Stock requirements | 49 |
| GET | `/ch2-data` | `apiController.ch2Data` | CH2 supplier data | 50 |

### 2.8 Customer Analytics

| Method | Endpoint | Controller | Purpose | Line |
|--------|----------|------------|---------|------|
| GET | `/product-sales-volume` | `apiController.productSalesVolume` | BOO sales data | 52 |
| GET | `/customer-buying-history` | `apiController.customerBuyingHistory` | BOO customer data | 53 |
| GET | `/shopify-teelixir-product-sales-volume` | `apiController.shopifyTeelixirProductSalesVolumeView` | Teelixir sales | 54 |
| GET | `/shopify-teelixir-customer-buying-history` | `apiController.shopifyTeelixirCustomerBuyingHistoryView` | Teelixir customers | 55 |
| GET | `/klaviyo-profiles` | `apiController.klaviyoProfiles` | BOO email list | 56 |
| GET | `/shopify-teelixir-klaviyo-profiles` | `apiController.shopifyTeelixirKlaviyoProfiles` | Teelixir email list | 57 |

---

## 3. Supplier Integration Analysis

### 3.1 Oborne (CH2 FTP) - Primary Method

**File:** [src/heplers/oborne.helper.js](C:\Users\jayso\fyic-portal\src\heplers\oborne.helper.js)

#### Integration Type
**FTP Download from CH2** (Oborne's parent company)

#### FTP Credentials (Lines 257-362)
```javascript
host: "ftp3.ch2.net.au"
user: "retail_310"
password: "am2SH6wWevAY&#+Q"
```

#### Files Downloaded
1. **Inventory:** `prod_retail_310/inventory.csv` - Stock levels for Branch 310
2. **Products:** `prod_retail_product/products.csv` - Full product catalog

#### CSV Format
- **Delimiter:** Pipe (`|`)
- **Encoding:** UTF-8

#### Data Transformation (Lines 320-335)
```javascript
{
  Brand: product.brand,
  Name: product.oborne_sku,          // SKU identifier
  "Display Name": product.name,       // Full product name
  "W/S ex gst": product.baseprice,    // Wholesale price
  RRP: product.rrp,                   // Retail price
  "GST Status": "GST applies",
  Availability: stock > 0 ? "In Stock" : "Out of Stock",
  Barcode: product.upccode,
  StockQty: stock.availablequantity,
  Id: product.id
}
```

#### Database Operations
- **Truncate:** `oborne_products` table before each sync
- **Insert:** Batch insert product data
- **Stock Tracking:** Insert to `oborne_stocks` for historical tracking

#### Legacy Email Method (Lines 135-247)
**Gmail IMAP as fallback:**
```javascript
IMAP: imap.gmail.com
User: kylie@buyorganicsonline.com.au
Password: mLmZAWeeex2N%Q4m
From: vanessa.phillips@ch2.net.au
```

**Process:**
1. Connect to Gmail IMAP
2. Search for emails from `vanessa.phillips@ch2.net.au`
3. Download CSV attachments
4. Parse and import

---

### 3.2 Kadac - Direct API

**File:** [src/heplers/kadac.helper.js](C:\Users\jayso\fyic-portal\src\heplers\kadac.helper.js)

#### Integration Type
**HTTPS CSV API**

#### API Endpoint (Lines 63-171)
```
https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv
```

#### Authentication
- **Type:** UID parameter in URL
- **UID:** `d83f42d2f1224d94856ea35c4323a94d`

#### CSV Columns (12 fields)
```csv
sku, brand, description, size
gst, wholesale, rrp
percarton, cartononly
barcode, stockstatus, imageurl
```

#### Process Flow
1. **Download:** HTTP GET request via axios (Line 74)
2. **Stream:** Write to temporary file (Lines 98-99)
3. **Parse:** Use ExcelJS to read CSV (Lines 113-135)
4. **Batch Insert:** 50 records at a time (Lines 143-156)

#### Database Table
- **Table:** `kadac_products`
- **Operation:** Truncate before each sync

---

### 3.3 UHP - HTTPS Download

**File:** [src/heplers/uhp.helper.js](C:\Users\jayso\fyic-portal\src\heplers\uhp.helper.js)

#### Integration Type
**Direct HTTPS Excel Download**

#### Feed URL (Lines 86-193)
```
https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx
```

#### Format
**Excel (.xlsx)** → Converted to CSV for parsing

#### CSV Columns (34 fields)
**Product Information:**
- Stockcode, Brand, Description, Size
- W/S ex GST, GST, RRP, MOQ
- APN Barcode, Categories

**Product Flags:**
- IsActive, InStock, New, OnDeal, Clearance

**Certifications:**
- CertifiedOrganic, Organic, GlutenFree
- Vegetarian, Vegan, DairyFree

**Additional:**
- Ingredients, Image1, Image2
- Unit and carton dimensions/weights

#### Process Flow
1. **Download:** HTTPS GET for XLSX file (Line 97)
2. **Convert:** Excel to CSV using excel2csv library (Lines 129-132)
3. **Parse:** Read CSV and extract data (Lines 137-176)
4. **Insert:** Batch insert to database

#### Database Table
- **Table:** `uhp_products`
- **Operation:** Truncate before sync

---

### 3.4 GlobalNature - Email Attachments

**File:** [src/heplers/globalnature.helper.js](C:\Users\jayso\fyic-portal\src\heplers\globalnature.helper.js)

#### Integration Type
**Gmail IMAP with Excel Attachments**

#### Email Configuration (Lines 149-265)
```javascript
IMAP: imap.gmail.com
User: kylie@buyorganicsonline.com.au
Password: mLmZAWeeex2N%Q4m
From: yiyi.lu@globalbynature.com.au
Since: Yesterday (last 24 hours)
```

#### Process
1. Connect to Gmail IMAP
2. Search for emails from `yiyi.lu@globalbynature.com.au`
3. Download Excel (.xlsx) attachments
4. Convert to CSV
5. Parse and import

#### CSV Fields
```csv
Item Code (SKU), brand, description, size
GST, wholesale, rrp
percarton, cartononly
barcode, stockstatus
```

#### Database Table
- **Table:** `globalnature_products`
- **Operation:** Truncate and reload

---

## 4. Cron Jobs & Scheduling

**File:** [src/index.js](C:\Users\jayso\fyic-portal\src\index.js) (Lines 384-476)

### Cron Schedule Overview

| Schedule | Frequency | Function | Purpose | Line |
|----------|-----------|----------|---------|------|
| `0 */2 * * *` | Every 2 hours | `main()` | Sync all suppliers | 407 |
| `45 */2 * * *` | Every 2 hours :45min | `GlobalNatureStockUpdateCron()` | GlobalNature sync | 421 |
| `0 7 * * *` | Daily 7:00 AM | `getBCOrders()` | Fetch BigCommerce orders | 433 |
| `0 5 * * *` | Daily 5:00 AM | `getAllShopifyOrders()` | Fetch Shopify orders | 443 |
| `0 6 * * *` | Daily 6:00 AM | `generateKIKSalesReport(true)` | Teelixir sales report | 451 |
| `15 6 * * *` | Daily 6:15 AM | `generateKIKSalesReport(false)` | BOO sales report | 459 |
| `0 */8 * * *` | Every 8 hours | `getOborneStock()` | Oborne stock tracking | 467 |

### Main Sync Function (Lines 118-187)

**Purpose:** Orchestrates complete supplier synchronization

**Execution Flow:**
```javascript
async function main() {
  // 1. Fetch from BigCommerce API
  await getBigComProducts();

  // 2. Sync UHP
  await getUHPProducts();

  // 3. Sync Oborne (FTP)
  await getOborneProductsFTP();

  // 4. Sync Kadac
  await getKadacProducts();

  // 5. Sync KIK/Teelixir
  await getKIKProducts();
  await getKIKStocks();

  // 6. Update inventory levels (COMMENTED OUT)
  // await updateBCInvTracProducts(callApi, { kadac: res, gbn: false });

  // 7. Update prices (COMMENTED OUT)
  // await updateBCPrices(callApi);

  // 8. Clean old files (70+ days)
  trimDirFiles(70);
}
```

### Development Mode Protection
```javascript
const isDev = process.env.NODE_ENV !== 'production';
// Crons only run in production environment
```

**All cron jobs check:**
```javascript
if (!isDev) {
  cron.schedule("0 */2 * * *", main);
}
```

---

## 5. AWS Services Usage

### 5.1 Amazon S3

**File:** [src/services/s3.service.js](C:\Users\jayso\fyic-portal\src\services\s3.service.js)

#### Configuration
```javascript
const S3 = require("aws-sdk/clients/s3");

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});
```

#### Functions

**1. uploadFile(file)** - Lines 16-25
- Uploads file from filesystem to S3
- Parameters: File object with path and filename
- Returns: Promise with S3 upload result

**2. uploadData(fileName, data)** - Lines 27-38
- Uploads data buffer/string directly to S3
- Parameters: Filename and data content
- Returns: Promise with upload result
- Used for JSON/CSV exports

#### Usage in Application
**File:** [src/heplers/big-commerce.helper.js](C:\Users\jayso\fyic-portal\src\heplers\big-commerce.helper.js) (Line 20)
```javascript
const { uploadFile } = require("../services/s3.service");
```

**Purpose:**
- Archive sync logs
- Store data export files
- Backup product catalogs

---

### 5.2 Amazon RDS MySQL

**Primary Database Service**

**Configuration:** Environment variable based
- Host: `process.env.DB_HOST`
- Port: `process.env.DB_PORT`
- User: `process.env.DB_USER`
- Password: `process.env.DB_PASSWORD`
- Database: `process.env.DB_NAME`

**Legacy RDS:** (Commented out)
- Host: `newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com`
- Database: `new_fyic_db`

---

### 5.3 Email Service (SendGrid - AWS SES Alternative)

**File:** [src/heplers/big-commerce.helper.js](C:\Users\jayso\fyic-portal\src\heplers\big-commerce.helper.js) (Lines 32-34)

```javascript
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey("SG.Z3fMrMSuTPS0UwSQJE1vkg...");
```

**Note:** Uses SendGrid instead of AWS SES
- API-based email delivery
- Transactional email support
- Sales report distribution

---

## 6. Database Schema

### 6.1 BigCommerce Products Table

**Table:** `bc_products`

**Inferred from:** [src/controllers/api.controller.js](C:\Users\jayso\fyic-portal\src\controllers\api.controller.js) (Lines 58-132)

```sql
CREATE TABLE bc_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  name VARCHAR(255),
  type VARCHAR(50),
  sku VARCHAR(100),
  weight DECIMAL(10,2),
  width DECIMAL(10,2),
  depth DECIMAL(10,2),
  height DECIMAL(10,2),
  price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  retail_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  map_price DECIMAL(10,2),
  tax_class_id INT,
  product_tax_code VARCHAR(50),
  calculated_price DECIMAL(10,2),
  categories JSON,
  brand_id INT,
  option_set_id INT,
  option_set_display VARCHAR(50),
  inventory_level INT,
  inventory_warning_level INT,
  inventory_tracking VARCHAR(50),
  reviews_rating_sum INT,
  reviews_count INT,
  total_sold INT,
  fixed_cost_shipping_price DECIMAL(10,2),
  is_free_shipping BOOLEAN,
  is_visible BOOLEAN,
  is_featured BOOLEAN,
  related_products JSON,
  warranty TEXT,
  bin_picking_number VARCHAR(50),
  layout_file VARCHAR(255),
  upc VARCHAR(50),
  mpn VARCHAR(50),
  gtin VARCHAR(50),
  search_keywords TEXT,
  availability VARCHAR(50),
  availability_description TEXT,
  gift_wrapping_options_type VARCHAR(50),
  gift_wrapping_options_list JSON,
  sort_order INT,
  _condition VARCHAR(50),
  is_condition_shown BOOLEAN,
  order_quantity_minimum INT,
  order_quantity_maximum INT,
  page_title VARCHAR(255),
  meta_keywords JSON,
  meta_description TEXT,
  description LONGTEXT,
  date_created DATETIME,
  date_modified DATETIME,
  base_variant_id INT,

  INDEX idx_product_id (product_id),
  INDEX idx_sku (sku)
);
```

---

### 6.2 Supplier Tables

#### Oborne Products
```sql
CREATE TABLE oborne_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100),
  new_sku VARCHAR(100),
  name VARCHAR(255),
  brand VARCHAR(100),
  ws_ex_gst DECIMAL(10,2),
  rrp DECIMAL(10,2),
  gst_status VARCHAR(50),
  availability VARCHAR(50),
  stock_qty INT,
  barcode VARCHAR(50),

  INDEX idx_sku (sku),
  INDEX idx_new_sku (new_sku)
);
```

#### Oborne Stock History
```sql
CREATE TABLE oborne_stocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  new_sku VARCHAR(100),
  stock_qty INT,
  date_time DATETIME,

  INDEX idx_new_sku (new_sku),
  INDEX idx_date_time (date_time)
);
```

**Usage:** Historical stock tracking for trend analysis

#### UHP Products
```sql
CREATE TABLE uhp_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100),
  brand VARCHAR(100),
  description TEXT,
  size VARCHAR(50),
  ws_ex_gst DECIMAL(10,2),
  gst VARCHAR(10),
  rrp DECIMAL(10,2),
  moq INT,
  unit_ws_ex_gst DECIMAL(10,2),
  apn_barcode VARCHAR(50),
  categories TEXT,
  is_active VARCHAR(10),
  in_stock VARCHAR(10),
  new VARCHAR(10),
  on_deal VARCHAR(10),
  clearance VARCHAR(10),
  certified_organic VARCHAR(10),
  organic VARCHAR(10),
  gluten_free VARCHAR(10),
  vegetarian VARCHAR(10),
  vegan VARCHAR(10),
  dairy_free VARCHAR(10),
  ingredients TEXT,
  image1 VARCHAR(255),
  image2 VARCHAR(255),
  u_width INT,
  u_height INT,
  u_length INT,
  u_weight DECIMAL(10,2),
  ctn_qty INT,
  ctn_barcode VARCHAR(50),
  ctn_width INT,
  ctn_height INT,
  ctn_length INT,
  ctn_weight DECIMAL(10,2),

  INDEX idx_sku (sku)
);
```

#### Kadac Products
```sql
CREATE TABLE kadac_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100),
  brand VARCHAR(100),
  description TEXT,
  size VARCHAR(50),
  gst VARCHAR(10),
  wholesale DECIMAL(10,2),
  rrp DECIMAL(10,2),
  percarton INT,
  cartononly VARCHAR(10),
  barcode VARCHAR(50),
  stockstatus VARCHAR(50),
  imageurl VARCHAR(255),

  INDEX idx_sku (sku),
  INDEX idx_barcode (barcode)
);
```

#### GlobalNature Products
```sql
CREATE TABLE globalnature_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(100),
  brand VARCHAR(100),
  description TEXT,
  size VARCHAR(50),
  gst VARCHAR(10),
  wholesale DECIMAL(10,2),
  rrp DECIMAL(10,2),
  percarton INT,
  cartononly VARCHAR(10),
  barcode VARCHAR(50),
  stockstatus VARCHAR(50),

  INDEX idx_sku (sku)
);
```

---

### 6.3 AI Content Management Tables

#### AI Quality Scores
```sql
CREATE TABLE bc_ai_score (
  product_id INT PRIMARY KEY,
  factualityaccuracy INT DEFAULT 0,
  evidencebasedclaims INT DEFAULT 0,
  transparencydisclosure INT DEFAULT 0,
  clarityreadability INT DEFAULT 0,
  engagementtone INT DEFAULT 0,
  structurelayout INT DEFAULT 0,
  visualhierarchy INT DEFAULT 0,
  imagerymultimedia INT DEFAULT 0,
  accessibility INT DEFAULT 0,
  overalleffectiveness INT DEFAULT 0,
  alignmentwithtargetaudience INT DEFAULT 0,
  trustcredibility INT DEFAULT 0,
  completeness INT DEFAULT 0,
  searchfunctionality INT DEFAULT 0,
  internallinking INT DEFAULT 0,
  calltoactionclarity INT DEFAULT 0,
  disclaimer INT DEFAULT 0,

  FOREIGN KEY (product_id) REFERENCES bc_products(product_id)
);
```

**Scoring System:** 0-100 for each quality metric

#### AI Improved Descriptions
```sql
CREATE TABLE bc_improved_ai_score (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT,
  improved_description LONGTEXT,
  ai_text LONGTEXT,
  fetch_at DATETIME,
  update_at DATETIME,

  INDEX idx_product_id (product_id)
);
```

#### Category AI Scores
```sql
CREATE TABLE bc_cat_improved_ai_score (
  id INT PRIMARY KEY,
  improved_description LONGTEXT,
  ai_text LONGTEXT,
  fetch_at DATETIME,
  update_at DATETIME,
  factualityaccuracy INT DEFAULT 0,
  evidencebasedclaims INT DEFAULT 0,
  transparencydisclosure INT DEFAULT 0,
  clarityreadability INT DEFAULT 0,
  engagementtone INT DEFAULT 0,
  structurelayout INT DEFAULT 0,
  visualhierarchy INT DEFAULT 0,
  imagerymultimedia INT DEFAULT 0,
  accessibility INT DEFAULT 0,
  overalleffectiveness INT DEFAULT 0,
  alignmentwithtargetaudience INT DEFAULT 0,
  trustcredibility INT DEFAULT 0,
  completeness INT DEFAULT 0,
  searchfunctionality INT DEFAULT 0,
  internallinking INT DEFAULT 0,
  calltoactionclarity INT DEFAULT 0,
  disclaimer INT DEFAULT 0
);
```

---

### 6.4 Key Query Patterns

#### Join Product with AI Score
**File:** [src/controllers/api.controller.js](C:\Users\jayso\fyic-portal\src\controllers\api.controller.js) (Lines 273-281)

```sql
SELECT *, bc_products.product_id as product_id
FROM bc_products
LEFT JOIN bc_ai_score
  ON bc_products.product_id = bc_ai_score.product_id
WHERE bc_products.product_id = ?
```

#### Stock Tracking Query
**File:** [src/heplers/oborne.helper.js](C:\Users\jayso\fyic-portal\src\heplers\oborne.helper.js) (Lines 445-453)

```sql
SELECT * FROM oborne_stocks
WHERE SUBSTR(date_time,1,10) BETWEEN ? AND ?
ORDER BY date_time ASC
```

#### Duplicate Detection
```sql
SELECT sku, COUNT(sku) as count
FROM kadac_products
GROUP BY sku
HAVING count > 1
ORDER BY count DESC
```

---

## 7. BigCommerce Integration

### 7.1 API Credentials

**Multiple Credential Sets Found:**

#### Version 1 (Node.js - Primary)
**File:** [src/heplers/big-commerce.helper.js](C:\Users\jayso\fyic-portal\src\heplers\big-commerce.helper.js) (Lines 35-42)

```javascript
{
  clientId: "nvmcwck5yr15lob1q911z68d4r6erxy",
  accessToken: "d9y2srla3treynpbtmp4f3u1bomdna2",
  storeHash: "hhhi",
  responseType: "json",
  apiVersion: "v3"
}
```

#### Version 2 (EC2 PHP - Legacy)
**File:** `C:\Users\jayso\master-ops\buy-organics-online\ec2-source-code\Api_connection.php`

```php
auth_token: "d9y2srla3treynpbtmp4f3u1bomdna2"
client_id:  "nvmcwck5yr15lob1q911z68d4r6erxy"
store_hash: "hhhi"
```

#### Version 3 (Documented Alternative)
```
access_token: "ttf2mji7i912znhbue9gauvu7fbiiyo"
client_id:    "884idaio0t8l28wd84u06swrqnj619e"
store_hash:   "hhhi"
```

**Note:** Versions 1 and 2 use same credentials, Version 3 appears to be alternative/newer set

---

### 7.2 API Client Configuration

**File:** [src/heplers/big-commerce.helper.js](C:\Users\jayso\fyic-portal\src\heplers\big-commerce.helper.js)

#### V3 API Client (Lines 35-42)
```javascript
const BigCommerce = require("node-bigcommerce");

const bigCommerce = new BigCommerce({
  clientId: "nvmcwck5yr15lob1q911z68d4r6erxy",
  accessToken: "d9y2srla3treynpbtmp4f3u1bomdna2",
  storeHash: "hhhi",
  responseType: "json",
  apiVersion: "v3",
  headers: { "Accept-Encoding": "*" },
});
```

#### V2 API Client (Lines 44-51)
```javascript
const bigCommerceV2 = new BigCommerce({
  clientId: "nvmcwck5yr15lob1q911z68d4r6erxy",
  accessToken: "d9y2srla3treynpbtmp4f3u1bomdna2",
  storeHash: "hhhi",
  responseType: "json",
  apiVersion: "v2",
  headers: { "Accept-Encoding": "*" },
});
```

**Dual API Usage:** System uses both V2 and V3 APIs
- **V3:** Modern product, category, and variant management
- **V2:** Legacy features, some order operations

---

### 7.3 Key Operations

#### Product Management
**Fetch All Products:**
```javascript
bigCommerce.get("/catalog/products?limit=250&page=" + page)
```

**Update Single Product:**
```javascript
bigCommerce.put("/catalog/products/" + productId, updateData)
```

**Create Product:**
```javascript
bigCommerce.post("/catalog/products", productData)
```

#### Category Management
**Fetch Categories:**
```javascript
bigCommerce.get("/catalog/categories?limit=250&page=" + page)
```

**Update Category:**
```javascript
bigCommerce.put("/catalog/categories/" + categoryId, categoryData)
```

#### Order Management
**Fetch Orders:**
```javascript
bigCommerce.get("/orders?limit=250&page=" + page)
```

#### Inventory Updates
**Update Product Inventory:**
```javascript
bigCommerce.put("/catalog/products/" + productId, {
  inventory_level: newStock,
  inventory_tracking: "product"
})
```

---

## 8. Dependencies & Libraries

**File:** [package.json](C:\Users\jayso\fyic-portal\package.json)

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.17.1 | Web framework |
| `mysql2` | ^2.2.5 | MySQL database driver |
| `node-bigcommerce` | ^3.0.0 | BigCommerce API client |
| `aws-sdk` | ^2.891.0 | AWS S3 integration |
| `@sendgrid/mail` | ^7.4.2 | Email delivery |
| `node-cron` | ^3.0.0 | Cron job scheduling |
| `dotenv` | ^8.2.0 | Environment variables |
| `axios` | ^0.21.1 | HTTP client |
| `imap` | ^0.8.19 | Email retrieval |
| `mailparser` | ^3.2.0 | Email parsing |
| `exceljs` | ^4.2.1 | Excel/CSV processing |
| `ftp` | ^0.3.10 | FTP file transfer |
| `csv-parser` | ^3.0.0 | CSV parsing |
| `excel2csv` | ^0.2.0 | Excel conversion |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `nodemon` | ^2.0.7 | Auto-restart during development |

---

## 9. Critical Code Patterns

### 9.1 Error Handling

**Standard Pattern:**
```javascript
try {
  // Operation
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  console.error("Error:", error);
  return { success: false, error: error.message };
}
```

### 9.2 Batch Processing

**Pattern for large datasets:**
```javascript
const BATCH_SIZE = 50;
for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

### 9.3 Rate Limiting

**BigCommerce API calls include delays:**
```javascript
await new Promise(resolve => setTimeout(resolve, 200));
```

---

## 10. Production Server Details

**Discovered Server:**
- **IP:** `170.64.223.141`
- **Hostname:** `dev.growthcohq.com`
- **Platform:** Linux
- **Source:** VS Code SSH configuration

**Next Steps:**
1. SSH access to verify running processes
2. Locate .env file for environment variables
3. Confirm deployment method (PM2, Docker, systemd)

---

## 11. Migration Considerations

### 11.1 PostgreSQL Adaptations Required

**MySQL → PostgreSQL Changes:**

1. **JSON Data Types:**
   - MySQL: `JSON` type
   - PostgreSQL: `JSONB` recommended for better performance

2. **Date Functions:**
   - MySQL: `SUBSTR(date_time,1,10)`
   - PostgreSQL: `date_trunc('day', date_time)` or `to_char(date_time, 'YYYY-MM-DD')`

3. **Auto Increment:**
   - MySQL: `AUTO_INCREMENT`
   - PostgreSQL: `SERIAL` or `BIGSERIAL`

4. **String Concatenation:**
   - MySQL: `CONCAT()`
   - PostgreSQL: `||` operator or `CONCAT()`

### 11.2 Supabase Features to Leverage

**Row Level Security (RLS):**
```sql
-- Example: Restrict access to supplier data
ALTER TABLE oborne_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON oborne_products
  FOR SELECT USING (auth.role() = 'authenticated');
```

**Real-time Subscriptions:**
- Monitor product updates
- Track stock changes
- Alert on sync failures

**Edge Functions:**
- Supplier sync workflows
- Data transformation logic
- API endpoint proxying

### 11.3 Data Migration Strategy

**Phase 1: Schema Migration**
1. Export MySQL schema
2. Convert to PostgreSQL syntax
3. Create tables in Supabase

**Phase 2: Data Migration**
1. Export data from RDS (CSV format)
2. Transform data types (JSON, dates)
3. Import to Supabase using `COPY` command

**Phase 3: Validation**
1. Compare row counts
2. Verify data integrity
3. Test queries

---

## 12. Outstanding Questions

### 12.1 Environment Variables
**Missing `.env` file - Need to locate:**
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `AWS_BUCKET_NAME`
- `AWS_BUCKET_REGION`
- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `NODE_ENV`

**Action:** SSH to production server and locate .env file

### 12.2 Active Deployment
**Unknown deployment method:**
- PM2 process manager?
- Docker container?
- systemd service?
- Direct node execution?

**Action:** Check running processes on `dev.growthcohq.com`

### 12.3 Inventory Update Status
**Code shows commented out:**
```javascript
// Lines 175-182 in index.js
// await updateBCInvTracProducts(callApi, { kadac: res, gbn: false });
// await updateBCPrices(callApi);
```

**Questions:**
- Are inventory updates happening elsewhere?
- Is this intentionally disabled?
- How are BC products kept in sync?

**Action:** Review BigCommerce admin for inventory settings

### 12.4 Database Synchronization
**Two database systems identified:**
- EC2 Local MySQL (`c0bigc`)
- AWS RDS (`new_fyic_db`)

**Questions:**
- Are they synchronized?
- Which is source of truth?
- Is EC2 system still active?

**Action:** Compare table counts and timestamps

---

## 13. Security Considerations

### 13.1 Credentials in Code
**Found hardcoded credentials in:**
- FTP passwords
- API keys
- Email passwords
- SendGrid API key

**Migration Action:**
- Move all credentials to Supabase secrets
- Use environment variables only
- Implement secret rotation

### 13.2 Database Access
**Current:** Direct MySQL connection from application

**Recommended:**
- Use Supabase client libraries
- Implement Row Level Security
- Use API keys with limited scopes

### 13.3 API Key Management
**Multiple BigCommerce credential sets found**

**Migration Action:**
- Verify which credentials are active
- Rotate keys if needed
- Document scopes and permissions

---

## Appendix: File Reference Index

### Core Configuration Files
- [src/config/mysql.js](C:\Users\jayso\fyic-portal\src\config\mysql.js) - Database configuration
- [src/index.js](C:\Users\jayso\fyic-portal\src\index.js) - Application entry, cron jobs
- [package.json](C:\Users\jayso\fyic-portal\package.json) - Dependencies

### API & Routes
- [src/routes/api.routes.js](C:\Users\jayso\fyic-portal\src\routes\api.routes.js) - All API endpoints
- [src/controllers/api.controller.js](C:\Users\jayso\fyic-portal\src\controllers\api.controller.js) - Controller logic

### Supplier Integrations
- [src/heplers/oborne.helper.js](C:\Users\jayso\fyic-portal\src\heplers\oborne.helper.js) - Oborne/CH2 FTP
- [src/heplers/kadac.helper.js](C:\Users\jayso\fyic-portal\src\heplers\kadac.helper.js) - Kadac API
- [src/heplers/uhp.helper.js](C:\Users\jayso\fyic-portal\src\heplers\uhp.helper.js) - UHP HTTPS
- [src/heplers/globalnature.helper.js](C:\Users\jayso\fyic-portal\src\heplers\globalnature.helper.js) - GlobalNature email

### BigCommerce Integration
- [src/heplers/big-commerce.helper.js](C:\Users\jayso\fyic-portal\src\heplers\big-commerce.helper.js) - BC API client

### AWS Services
- [src/services/s3.service.js](C:\Users\jayso\fyic-portal\src\services\s3.service.js) - S3 uploads

---

**Document Status:** Complete
**Last Updated:** November 24, 2025
**Next Review:** After production server investigation
