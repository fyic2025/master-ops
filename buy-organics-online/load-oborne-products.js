#!/usr/bin/env node

/**
 * OBORNE SUPPLIER FEED LOADER
 *
 * Downloads Oborne product data via FTP and loads into Supabase
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const SUPPLIER_NAME = 'oborne';

// FTP credentials
const FTP_HOST = 'ftp3.ch2.net.au';
const FTP_USER = 'retail_310';
const FTP_PASSWORD = 'am2SH6wWevAY&#+Q';

async function loadOborneProducts() {
  console.log('========================================');
  console.log('OBORNE PRODUCT LOADER');
  console.log('========================================\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
  );

  const inventoryFile = path.join(__dirname, 'temp-oborne-inventory.csv');
  const productsFile = path.join(__dirname, 'temp-oborne-products.csv');

  const client = new Client();
  client.ftp.verbose = false;

  try {
    console.log('Connecting to Oborne FTP...');
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
    });
    console.log('Connected to FTP\n');

    // Download inventory and products files
    console.log('Downloading inventory.csv...');
    await client.downloadTo(inventoryFile, 'prod_retail_310/inventory.csv');
    console.log(`Downloaded (${(fs.statSync(inventoryFile).size / 1024).toFixed(2)} KB)`);

    console.log('Downloading products.csv...');
    await client.downloadTo(productsFile, 'prod_retail_product/products.csv');
    console.log(`Downloaded (${(fs.statSync(productsFile).size / 1024).toFixed(2)} KB)\n`);

    client.close();

    // Parse CSV files (pipe-delimited)
    console.log('Parsing CSV files...');

    const parseCSV = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return [];

      const headers = lines[0].split('|').map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('|');
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] ? values[idx].trim() : '';
        });
        data.push(row);
      }
      return data;
    };

    const products = parseCSV(productsFile);
    const inventory = parseCSV(inventoryFile);

    console.log(`Products: ${products.length}`);
    console.log(`Inventory records: ${inventory.length}\n`);

    // Show sample structure
    if (products.length > 0) {
      console.log('Product columns:', Object.keys(products[0]));
      console.log('Sample product:', JSON.stringify(products[0], null, 2));
    }
    if (inventory.length > 0) {
      console.log('\nInventory columns:', Object.keys(inventory[0]));
      console.log('Sample inventory:', JSON.stringify(inventory[0], null, 2));
    }
    console.log('');

    // Create inventory lookup by product id
    const inventoryMap = new Map();
    inventory.forEach(inv => {
      inventoryMap.set(inv.id, parseInt(inv.availablequantity || 0));
    });

    // Transform to Supabase format
    // Product columns: id, name, brandid, brand, weight, upccode, baseprice, rrp, oborne_id, oborne_sku, taxschedule, obsolete
    // Inventory columns: id, branch, availablequantity
    console.log('Transforming products...');
    const supplierProducts = products.map(row => {
      const parseNum = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      const stockQty = inventoryMap.get(row.id) || 0;
      const isObsolete = row.obsolete === 'Y';

      return {
        supplier_name: SUPPLIER_NAME,
        supplier_sku: row.oborne_sku || '',
        barcode: row.upccode || null,
        product_name: row.name || '',
        brand: row.brand || null,
        size: null,
        cost_price: parseNum(row.baseprice),
        rrp: parseNum(row.rrp),
        wholesale_price: parseNum(row.baseprice),
        stock_level: stockQty,
        availability: isObsolete ? 'discontinued' : (stockQty > 0 ? 'available' : 'out_of_stock'),
        category: null,
        supplier_product_code: row.id,
        metadata: {
          oborne_id: row.oborne_id,
          brand_id: row.brandid,
          weight: row.weight,
          tax_schedule: row.taxschedule,
          obsolete: row.obsolete,
          raw_data: row
        },
        last_synced_at: new Date().toISOString()
      };
    }).filter(p => p.supplier_sku);

    console.log(`Transformed ${supplierProducts.length} valid products\n`);

    // Deduplicate by SKU (keep first occurrence with highest stock)
    const skuMap = new Map();
    supplierProducts.forEach(p => {
      const existing = skuMap.get(p.supplier_sku);
      if (!existing || p.stock_level > existing.stock_level) {
        skuMap.set(p.supplier_sku, p);
      }
    });
    const deduped = Array.from(skuMap.values());
    console.log(`Deduplicated: ${supplierProducts.length} -> ${deduped.length} unique SKUs\n`);

    // Fetch all existing SKUs (paginated to handle >1000 rows)
    console.log('Fetching existing Oborne products from database...');
    const existingSkuMap = new Map();
    let page = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: existingProducts, error: fetchError } = await supabase
        .from('supplier_products')
        .select('id, supplier_sku')
        .eq('supplier_name', SUPPLIER_NAME)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (fetchError) {
        console.error('Error fetching existing products:', fetchError.message);
        break;
      }

      (existingProducts || []).forEach(p => existingSkuMap.set(p.supplier_sku, p.id));
      hasMore = existingProducts && existingProducts.length === PAGE_SIZE;
      page++;
    }
    console.log(`Found ${existingSkuMap.size} existing Oborne products\n`);

    // Split into updates and inserts
    const toUpdate = [];
    const toInsert = [];

    deduped.forEach(p => {
      const existingId = existingSkuMap.get(p.supplier_sku);
      if (existingId) {
        toUpdate.push({ ...p, id: existingId });
      } else {
        toInsert.push(p);
      }
    });

    console.log(`Products to update: ${toUpdate.length}`);
    console.log(`Products to insert: ${toInsert.length}\n`);

    const BATCH_SIZE = 500;
    let upserted = 0;
    let errors = 0;

    // Process updates
    if (toUpdate.length > 0) {
      console.log('Updating existing products...');
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);

        try {
          const { error } = await supabase
            .from('supplier_products')
            .upsert(batch);

          if (error) {
            console.error(`Update batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
            errors += batch.length;
          } else {
            upserted += batch.length;
            console.log(`Updated batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products`);
          }
        } catch (err) {
          console.error(`Update batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, err.message);
          errors += batch.length;
        }
      }
    }

    // Process inserts
    if (toInsert.length > 0) {
      console.log('\nInserting new products...');
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);

        try {
          const { error } = await supabase
            .from('supplier_products')
            .insert(batch);

          if (error) {
            console.error(`Insert batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
            errors += batch.length;
          } else {
            upserted += batch.length;
            console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products`);
          }
        } catch (err) {
          console.error(`Insert batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, err.message);
          errors += batch.length;
        }
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('OBORNE LOAD SUMMARY');
    console.log('========================================\n');
    console.log(`Total products fetched: ${products.length}`);
    console.log(`Valid products:         ${supplierProducts.length}`);
    console.log(`Unique SKUs:            ${deduped.length}`);
    console.log(`Successfully upserted:  ${upserted}`);
    console.log(`Errors:                 ${errors}\n`);

    // Count stock status (from deduplicated data)
    const availableCount = deduped.filter(p => p.availability === 'available').length;
    const outOfStockCount = deduped.filter(p => p.availability === 'out_of_stock').length;
    const discontinuedCount = deduped.filter(p => p.availability === 'discontinued').length;

    console.log(`In Stock:     ${availableCount}`);
    console.log(`Out of Stock: ${outOfStockCount}`);
    console.log(`Discontinued: ${discontinuedCount}\n`);

    // Verify
    const { count } = await supabase
      .from('supplier_products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', SUPPLIER_NAME);

    console.log(`Oborne products in database: ${count}\n`);
    console.log('========================================\n');

    return { success: true, count: upserted, available: availableCount, outOfStock: outOfStockCount, discontinued: discontinuedCount };

  } catch (error) {
    console.error('\nError:', error.message);
    throw error;
  } finally {
    client.close();
    // Clean up temp files
    if (fs.existsSync(inventoryFile)) fs.unlinkSync(inventoryFile);
    if (fs.existsSync(productsFile)) fs.unlinkSync(productsFile);
  }
}

// Export for use in master sync
module.exports = { loadOborneProducts };

// Run if called directly
if (require.main === module) {
  loadOborneProducts().catch(error => {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  });
}
