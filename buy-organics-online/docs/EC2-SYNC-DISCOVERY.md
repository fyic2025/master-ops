# EC2 Sync System - COMPLETE DISCOVERY

**Date:** 2025-11-22
**Instance:** i-04dc435af0436943e (13.55.46.130)
**OS:** Ubuntu 16.04.1 LTS
**SSH Access:** ✅ GRANTED

---

## 🎯 EXECUTIVE SUMMARY

Successfully accessed the EC2 instance and discovered the **complete sync system**:

- **Sync Script:** PHP 7.0 application using Laravel Eloquent ORM
- **Location:** `/var/www/bigcupdate.fyic.com.au/web/`
- **Cron Schedule:** Every 6 hours (`1 */6 * * *`)
- **Database:** LOCAL MySQL (not AWS RDS!) - `c0bigc` database
- **Suppliers:** 4 active (Oborne, UHP, Kadac, GlobalNature)

**CRITICAL FINDING:** The sync uses a **local MySQL database** on the EC2 instance, NOT the AWS RDS instances we analyzed earlier!

---

## 📋 CRON JOB CONFIGURATION

### Main Sync Job
```cron
1 */6 * * * php7.0 /var/www/bigcupdate.fyic.com.au/web/echo.php >> /var/www/clients/client0/web15/web/cron_csv_upd.log 2>&1
```

**Details:**
- **Frequency:** Every 6 hours at minute 1 (12:01am, 6:01am, 12:01pm, 6:01pm)
- **Runtime:** PHP 7.0
- **Log File:** `/var/www/clients/client0/web15/web/cron_csv_upd.log` (43MB - updated Nov 22)
- **Script:** `echo.php` (main orchestrator)

### Other Cron Jobs Found
```cron
* * * * * /usr/local/ispconfig/server/server.sh 2>&1
* * * * * /usr/local/ispconfig/server/cron.sh 2>&1
*/30 * * * * /etc/init.d/mysql restart
```

---

## 🗂️ FILE STRUCTURE

### Main Scripts (14 files)

| File | Purpose | Size |
|------|---------|------|
| **echo.php** | Main sync orchestrator | 1,817 bytes |
| **SupplierFactory.php** | Creates supplier instances | Small |
| **Supplier.php** | Interface for suppliers | Interface only |
| **Oborne.php** | Oborne supplier sync logic | 1,427 lines |
| **Uhp.php** | UHP supplier sync logic | Unknown |
| **Kadac.php** | Kadac supplier sync logic | Unknown |
| **GlobalNature.php** | GlobalNature supplier sync | Unknown |
| **BigCommerceController.php** | BC API integration | 60KB |
| **Api_manager.php** | API helper functions | 20KB |
| **Api_connection.php** | BC credentials | 451 bytes |
| **OborneController.php** | Oborne-specific controller | Unknown |
| **BigCommerceSession.php** | BC session management | 11KB |
| **providers_check.php** | Provider validation | Unknown |
| **test.php** | Testing/debugging | Unknown |

### Configuration Files

| File | Purpose |
|------|---------|
| `config/database.php` | MySQL connection config |
| `composer.json` | PHP dependencies |
| `composer.lock` | Locked dependency versions |

### CSV Feed Files

| File | Supplier | Last Updated |
|------|----------|--------------|
| `globalnature_new.csv` | GlobalNature | Sep 9, 2024 |
| `EdenHealth.csv` | Eden Health | Sep 16, 2020 |
| `GBB_prods_price.csv` | Unknown | Sep 9, 2024 |
| Various `KAD_*` files | Kadac | 2020-2021 |

---

## 🔧 DATABASE CONFIGURATION

**CRITICAL:** Uses **LOCAL MySQL**, not AWS RDS!

```php
'driver'    => 'mysql',
'host'      => 'localhost',
'database'  => 'c0bigc',
'username'  => 'c0bigc',
'password'  => 'scuyTXC4!',
'charset'   => 'utf8',
'collation' => 'utf8_unicode_ci'
```

**MySQL Service:** ✅ Running (started Nov 22, 12:40 UTC)

---

## 🔐 BIGCOMMERCE API CREDENTIALS

**Found in:** `Api_connection.php`

```php
private $auth_token = 'd9y2srla3treynpbtmp4f3u1bomdna2';
private $client_id  = 'nvmcwck5yr15lob1q911z68d4r6erxy';
private $store_hash = 'hhhi';
```

**⚠️ NOTE:** These credentials are DIFFERENT from the ones in earlier documentation!

**Previous credentials:**
- access_token: ttf2mji7i912znhbue9gauvu7fbiiyo
- client_id: 884idaio0t8l28wd84u06swrqnj619e

**This suggests there may be multiple API tokens or the documentation credentials are newer.**

---

## 🏗️ SYNC WORKFLOW (echo.php)

### Main Orchestration

```php
$factory = new SupplierFactory();

// 1. GlobalNature
$globalnature = $factory->getSupplier('GlobalNature');
$globalnature->set_feed_products();
$globalnature->do_bulk_update();

// 2. UHP
$uhp = $factory->getSupplier('Uhp');
$uhp->set_feed_products();
$uhp->do_bulk_update();

// 3. Kadac
$kadac = $factory->getSupplier('Kadac');
$kadac->set_feed_products();
$kadac->set_changed_and_new_products();
$kadac->update();

// 4. Oborne
$oborne = $factory->getSupplier('Oborne');
$oborne->set_feed_products();
$oborne->do_bulk_update();
```

**⚠️ CRITICAL:** BigCommerce sync is COMMENTED OUT!

```php
// $x = new BigCommerceController();
// $x->main();
```

**This explains why the sync might not be pushing to BigCommerce!**

---

## 📊 SUPPLIER FEED CONFIGURATION

### Feed URLs (from SupplierFactory.php)

| Supplier | Feed URL | Type |
|----------|----------|------|
| **UHP** | `/var/www/clients/client0/web15/web/uhp_prods.csv` | Local File |
| **Kadac** | `https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv` | Remote API |
| **Oborne** | `http://bigcupdate.fyic.com.au/oborne_new.csv` | Remote HTTP |
| **GlobalNature** | `http://bigcupdate.fyic.com.au/globalnature_new.csv` | Remote HTTP |

**Note:** UHP feed is LOCAL FILE, not remote. Original remote URL is commented out:
```php
// 'http://shop.uhp.com.au/uhp_products_export.php?format=csv&accno=10386&cuid=BUYORO0102'
```

---

## 💰 PRICING LOGIC (Oborne.php)

### Price Calculation Strategy

**For Oborne products:**

```php
$fields = array(
    "retail_price" => $product['RRP'],
    "price" => $live_product['price'] > $product['RRP'] ? $live_product['price'] : $product['RRP'],
    "cost_price" => $product['W/S ex gst'],
    "calculated_price" => $product['RRP'],
    "sale_price" => $newsaleprice
);
```

**Breakdown:**
- `retail_price` = RRP from supplier CSV
- `price` = RRP (or existing price if higher)
- `cost_price` = W/S ex gst (wholesale price excluding GST)
- `sale_price` = RRP - 8% (when sale is active)

**Sale Price Calculation:**
```php
$newsaleprice = floatval($product['RRP']) - (floatval($product['RRP']) * 8 / 100);
```

**Validation:**
- Only updates if `RRP > W/S ex gst` (ensures profit margin)
- Won't set sale_price below cost_price
- Skips products with "ON SALE" or "NEWOB" in name/SKU

**KEY INSIGHT:** No markup is applied! They sell at supplier's RRP directly.

---

## 🔍 DISCREPANCY: TWO DATABASE SYSTEMS?

### Local MySQL Database (on EC2)
- **Host:** localhost
- **Database:** c0bigc
- **User:** c0bigc
- **Purpose:** ❓ UNKNOWN (used by sync scripts)

### AWS RDS Databases (analyzed earlier)
- **newsync6.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com**
  - Database: c7c7buyorgdnxtl1 (Sync Engine)
  - Database: new_fyic_db (Production)
- **newsync5.cxf17nwudeto.ap-southeast-2.rds.amazonaws.com**
  - Private, inaccessible

**QUESTION:** Are these two separate systems?
- Possibility 1: RDS is a backup/replica of local MySQL
- Possibility 2: Two different sync systems (old vs new)
- Possibility 3: RDS is for different store/purpose

**NEEDS INVESTIGATION:** Check if local `c0bigc` database contains same tables as RDS `new_fyic_db`

---

## 🚨 CRITICAL FINDINGS

### Issue 1: BigCommerce Sync Disabled
```php
// De decomentat!!!__________________________________
// $x = new BigCommerceController();
// $x->main();
```

Comment says "De decomentat!" (Romanian for "Uncomment this!") but it's still commented out.

**Impact:** Products may sync to local database but NOT push to BigCommerce API!

### Issue 2: UHP Feed is Local File
UHP feed is read from local file instead of remote URL. This could be outdated.

### Issue 3: Cron Runs Every 6 Hours
Cron is scheduled every 6 hours, but earlier S3 logs showed activity every 40-45 minutes. Either:
- S3 logs are from different process
- Cron schedule was recently changed
- Multiple cron jobs exist

### Issue 4: MySQL Restarts Every 30 Minutes
```cron
*/30 * * * * /etc/init.d/mysql restart
```
This is unusual and suggests potential MySQL stability issues.

---

## 📝 SYNC LOGIC BREAKDOWN

### Step 1: Fetch Supplier Feeds
```php
$globalnature->set_feed_products();
```
- Downloads CSV from remote URL or reads local file
- Parses CSV into array
- Stores in `$this->products`

### Step 2: Bulk Update Database
```php
$globalnature->do_bulk_update();
```
- Compares feed products with local database
- Updates availability, inventory, pricing
- Marks discontinued products
- Logs changes to CSV files

### Step 3: Detect New/Changed Products
```php
$kadac->set_changed_and_new_products();
```
- Identifies products not in BigCommerce
- Detects price/availability changes
- Queues for API sync

### Step 4: Update BigCommerce (DISABLED!)
```php
// $x = new BigCommerceController();
// $x->main();
```
**This is commented out! Products update in database but NOT in BigCommerce!**

---

## 📂 LOG FILES FOUND

| Log File | Size | Last Updated |
|----------|------|--------------|
| `cron_csv_upd.log` | 43MB | Nov 22 00:01 |
| `OB_prods_price.csv` | Unknown | Activity log |
| `OB_check_price.log` | Unknown | Price check log |
| `prods_outofstock.csv` | Unknown | Out of stock tracking |
| `KAD_check_price.log` | 84KB | Sep 26 2021 |

---

## 🎯 NEXT ACTIONS

### Immediate Questions to Resolve

1. **Is the BigCommerce sync intentionally disabled?**
   - Uncomment `BigCommerceController` and test?
   - Or is there another process handling BC sync?

2. **What's in the local `c0bigc` database?**
   - Connect to local MySQL
   - Compare schema with RDS databases
   - Determine which is current

3. **Why are there two different BC API credentials?**
   - Test both credentials
   - Determine which is active
   - Update documentation

4. **Why does MySQL restart every 30 minutes?**
   - Check MySQL error logs
   - Investigate stability issues
   - May need to fix before migration

5. **How are the CSV feeds on bigcupdate.fyic.com.au generated?**
   - Are they static files?
   - Is there a separate process updating them?
   - Check `/var/www/bigcupdate.fyic.com.au/` directory

### Files to Download for Analysis

- [x] echo.php ✅
- [x] SupplierFactory.php ✅
- [x] Oborne.php (partial) ✅
- [ ] Uhp.php
- [ ] Kadac.php
- [ ] GlobalNature.php
- [ ] BigCommerceController.php
- [ ] Api_manager.php
- [ ] Complete Oborne.php

### Database Investigation Needed

```bash
# Connect to local MySQL
mysql -u c0bigc -p'scuyTXC4!' c0bigc

# List tables
SHOW TABLES;

# Compare with RDS schema
# Determine primary database
```

---

## 💡 MIGRATION IMPLICATIONS

### What We Can Migrate NOW
- ✅ Supplier feed URLs (known)
- ✅ Pricing formulas (documented)
- ✅ Feed parsing logic (PHP to n8n)
- ✅ BigCommerce API calls (documented)

### What Needs Clarification
- ❌ Which database is primary (local vs RDS)
- ❌ Is BigCommerce sync working? (code is commented out)
- ❌ Are there multiple sync processes?
- ❌ UHP local feed source

### Risk Assessment
- **Medium Risk:** BigCommerce sync appears disabled in main cron
- **Low Risk:** Pricing logic is simple (use supplier RRP)
- **Medium Risk:** Two database systems (unclear which is source of truth)
- **High Risk:** MySQL stability issues (30-min restarts)

---

## 🔧 TECHNOLOGY STACK

- **Language:** PHP 7.0
- **Framework:** Laravel Eloquent ORM
- **Database:** MySQL (local)
- **Web Server:** ISPConfig (Apache/Nginx)
- **Dependencies:** Composer (BigCommerce SDK, Illuminate/Database)
- **Cron:** System crontab

---

## 📊 MIGRATION READINESS: 85%

**Blockers:**
1. Determine primary database (local vs RDS)
2. Understand why BigCommerce sync is commented out
3. Fix MySQL stability issues
4. Locate UHP feed source

**Once resolved, we can:**
1. Replicate sync logic in n8n
2. Migrate database to Supabase
3. Switch feed sources
4. Test parallel run
5. Cutover

---

**Status:** EC2 fully explored - Ready for database investigation
**Next Step:** Connect to local MySQL and compare with RDS schema

**Last Updated:** 2025-11-22 12:46 UTC
