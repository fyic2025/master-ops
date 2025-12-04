#!/usr/bin/env node

/**
 * KADAC SUPPLIER FEED LOADER
 *
 * Downloads Kadac product CSV and loads into Supabase
 */

// Load dotenv only if available (for local dev)
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
} catch (e) {
  // Environment variables provided by App Platform
}
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Excel = require('exceljs');
const fs = require('fs');
const path = require('path');

const SUPPLIER_NAME = 'kadac';

async function loadKadacProducts() {
  console.log('========================================');
  console.log('KADAC PRODUCT LOADER');
  console.log('========================================\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.BOO_SUPABASE_URL || 'https://usibnysqelovfuctmkqw.supabase.co',
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzaWJueXNxZWxvdmZ1Y3Rta3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ4ODA4OCwiZXhwIjoyMDY2MDY0MDg4fQ.B9uihsaUvwkJWFAuKAtu7uij1KiXVoiHPHa9mm-Tz1s'
  );

  console.log('Downloading Kadac product feed...');

  // Kadac CSV feed URL
  const feedUrl = 'https://remote.kadac.com.au/customers/products.asp?uid=d83f42d2f1224d94856ea35c4323a94d&format=csv';
  console.log(`URL: ${feedUrl}`);

  const tempFile = path.join(__dirname, 'temp-kadac-products.csv');

  try {
    // Download CSV file
    const response = await axios.get(feedUrl, {
      responseType: 'stream',
      timeout: 120000
    });

    console.log('Downloading CSV file...');
    const writer = fs.createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`Downloaded (${(fs.statSync(tempFile).size / 1024).toFixed(2)} KB)\n`);

    // Parse CSV with exceljs
    console.log('Parsing CSV file...');
    const workbook = new Excel.Workbook();
    const reader = fs.createReadStream(tempFile);
    const worksheet = await workbook.csv.read(reader);

    let header = [];
    let data = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          header.push(cell.value);
        });
      } else {
        let item = {};
        row.eachCell((cell, colNumber) => {
          item[header[colNumber - 1]] = cell.value;
        });
        data.push(item);
      }
    });

    console.log(`Parsed ${data.length} products\n`);

    if (data.length === 0) {
      console.log('No products found in feed');
      return { success: false, count: 0 };
    }

    // Show sample structure
    console.log('Sample CSV structure:');
    console.log(JSON.stringify(Object.keys(data[0] || {}), null, 2));
    console.log('\nSample product:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('');

    // Transform to Supabase format
    // Kadac columns: sku, brand, description, size, gst, wholesale, rrp, percarton, cartononly, barcode, stockstatus, imageurl
    console.log('Transforming products...');
    const products = data.map(row => {
      const parseNum = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      // stockstatus values: "Available", "Low Stock", "Out of Stock", etc.
      const stockStatus = (row.stockstatus || '').toLowerCase();
      const isAvailable = stockStatus.includes('available') || stockStatus.includes('low');

      return {
        supplier_name: SUPPLIER_NAME,
        supplier_sku: row.sku || '',
        barcode: row.barcode || null,
        product_name: row.description || '',
        brand: row.brand || null,
        size: row.size || null,
        cost_price: parseNum(row.wholesale),
        rrp: parseNum(row.rrp),
        wholesale_price: parseNum(row.wholesale),
        stock_level: isAvailable ? 1000 : 0, // Kadac doesn't give exact qty
        availability: isAvailable ? 'available' : 'out_of_stock',
        category: null,
        moq: parseInt(row.percarton || 1),
        metadata: {
          gst: row.gst,
          per_carton: row.percarton,
          carton_only: row.cartononly,
          image_url: row.imageurl,
          stock_status_raw: row.stockstatus,
          raw_data: row
        },
        last_synced_at: new Date().toISOString()
      };
    }).filter(p => p.supplier_sku);

    console.log(`Transformed ${products.length} valid products\n`);

    // Delete existing Kadac products
    console.log(`Deleting existing ${SUPPLIER_NAME} products...`);
    const { error: deleteError } = await supabase
      .from('supplier_products')
      .delete()
      .eq('supplier_name', SUPPLIER_NAME);

    if (deleteError) {
      console.error('Delete error:', deleteError.message);
    } else {
      console.log('Cleared existing products\n');
    }

    // Batch insert
    console.log('Loading to Supabase...');

    const BATCH_SIZE = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);

      try {
        const { error } = await supabase
          .from('supplier_products')
          .insert(batch);

        if (error) {
          console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
          errors += batch.length;
        } else {
          inserted += batch.length;
          console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products`);
        }
      } catch (err) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, err.message);
        errors += batch.length;
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('KADAC LOAD SUMMARY');
    console.log('========================================\n');
    console.log(`Total products fetched: ${data.length}`);
    console.log(`Valid products:         ${products.length}`);
    console.log(`Successfully loaded:    ${inserted}`);
    console.log(`Errors:                 ${errors}\n`);

    // Count available vs out of stock
    const availableCount = products.filter(p => p.availability === 'available').length;
    const outOfStockCount = products.filter(p => p.availability === 'out_of_stock').length;
    console.log(`In Stock:     ${availableCount}`);
    console.log(`Out of Stock: ${outOfStockCount}\n`);

    // Verify
    const { count } = await supabase
      .from('supplier_products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', SUPPLIER_NAME);

    console.log(`Kadac products in database: ${count}\n`);
    console.log('========================================\n');

    return { success: true, count: inserted, available: availableCount, outOfStock: outOfStockCount };

  } catch (error) {
    console.error('\nError:', error.message);
    throw error;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

// Export for use in master sync
module.exports = { loadKadacProducts };

// Run if called directly
if (require.main === module) {
  loadKadacProducts().catch(error => {
    console.error('\nFatal error:', error.message);
    process.exit(1);
  });
}
