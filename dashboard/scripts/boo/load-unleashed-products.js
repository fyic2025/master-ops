#!/usr/bin/env node

/**
 * LOAD UNLEASHED PRODUCTS INTO SUPPLIER_PRODUCTS TABLE
 *
 * Queries Unleashed API and loads all products with sellable/obsolete status
 */

// Load dotenv only if available (for local dev)
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
} catch (e) {
  // Environment variables provided by App Platform
}
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const crypto = require('crypto');

// Unleashed API credentials
const API_ID = '336a6015-eae0-43ab-83eb-e08121e7655d';
const API_KEY = 'SNX5bNJMLV3VaTbMK1rXMAiEUFdO96bLT5epp6ph8DJvc1WH5aJMRLihc2J0OyzVfKsA3xXpQgWIQANLxkQ==';
const API_BASE = 'api.unleashedsoftware.com';

// Supabase connection
const supabase = createClient(
  process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
  process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
);

// Unleashed API request
function makeUnleashedRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const queryString = '';
    const signature = crypto
      .createHmac('sha256', API_KEY)
      .update(queryString)
      .digest('base64');

    const options = {
      hostname: API_BASE,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-auth-id': API_ID,
        'api-auth-signature': signature
      }
    };

    console.log(`  Requesting: ${endpoint}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Load all products from Unleashed
async function loadUnleashedProducts() {
  console.log('========================================');
  console.log('LOAD UNLEASHED PRODUCTS');
  console.log('========================================\n');

  try {
    console.log('Step 1: Fetching products from Unleashed API...\n');

    let allProducts = [];
    let page = 1;
    let hasMore = true;

    // Unleashed uses pagination
    while (hasMore) {
      const response = await makeUnleashedRequest(`/Products/${page}`);

      if (response.Items && response.Items.length > 0) {
        console.log(`  Page ${page}: ${response.Items.length} products`);
        allProducts = allProducts.concat(response.Items);
        page++;

        // Check if there are more pages
        hasMore = response.Pagination && response.Pagination.NumberOfPages > page - 1;
      } else {
        hasMore = false;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✓ Fetched ${allProducts.length} products from Unleashed\n`);

    console.log('Step 2: Deleting existing Unleashed products from database...\n');

    // Delete existing unleashed products
    const { error: deleteError } = await supabase
      .from('supplier_products')
      .delete()
      .eq('supplier_name', 'unleashed');

    if (deleteError) throw deleteError;
    console.log('✓ Cleared existing Unleashed products\n');

    console.log('Step 3: Preparing products for insert...\n');

    // Transform Unleashed products to supplier_products format
    const supplierProducts = allProducts.map(product => ({
      supplier_name: 'unleashed',
      supplier_sku: product.ProductCode,
      barcode: product.Barcode || null,
      product_name: product.ProductDescription,
      brand: product.Brand || null,
      size: product.DefaultSellUnit || null,
      cost_price: product.LastCost || null,
      rrp: product.RRP || null,
      wholesale_price: product.DefaultSellPrice || null,
      stock_level: product.AvailableQty || 0,
      availability: product.IsSellable ? 'sellable' : 'not_sellable',
      category: product.ProductGroup || null,
      supplier_product_code: product.Guid,
      metadata: {
        is_sellable: product.IsSellable,
        is_obsolete: product.IsObsolete,
        unit_of_measure: product.UnitOfMeasure,
        bin_location: product.BinLocation,
        product_guid: product.Guid
      },
      last_synced_at: new Date().toISOString()
    }));

    console.log(`Prepared ${supplierProducts.length} products for insert\n`);

    console.log('Step 4: Inserting into supplier_products table...\n');

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < supplierProducts.length; i += batchSize) {
      const batch = supplierProducts.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('supplier_products')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError.message);
      } else {
        inserted += batch.length;
        console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${supplierProducts.length} products`);
      }
    }

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================\n');
    console.log(`Total fetched from Unleashed: ${allProducts.length}`);
    console.log(`Total inserted to database: ${inserted}`);
    console.log(`Sellable products: ${allProducts.filter(p => p.IsSellable).length}`);
    console.log(`Obsolete products: ${allProducts.filter(p => p.IsObsolete).length}`);
    console.log(`\n✓ Unleashed products loaded successfully!`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

loadUnleashedProducts();
