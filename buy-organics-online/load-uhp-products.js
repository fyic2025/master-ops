#!/usr/bin/env node

/**
 * UHP SUPPLIER FEED LOADER
 *
 * Downloads UHP product export and loads into Supabase
 */

require('dotenv').config({ path: '../MASTER-CREDENTIALS-COMPLETE.env' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SUPPLIER_NAME = 'uhp';

async function loadUHPProducts() {
  console.log('========================================');
  console.log('UHP PRODUCT LOADER');
  console.log('========================================\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.BOO_SUPABASE_URL,
    process.env.BOO_SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Downloading UHP product export...');

  // UHP XLSX export URL (from working AWS code)
  const exportUrl = 'https://www.uhp.com.au/media/wysiwyg/uhp_products_export.xlsx';
  console.log(`URL: ${exportUrl}`);

  try {
    // Download XLSX file to disk
    const tempFile = path.join(__dirname, 'temp-uhp-products.xlsx');

    const response = await axios.get(exportUrl, {
      responseType: 'stream',
      timeout: 60000
    });

    console.log('Downloading XLSX file...');
    const writer = fs.createWriteStream(tempFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`✓ Downloaded (${(fs.statSync(tempFile).size / 1024).toFixed(2)} KB)\n`);

    // Parse XLSX with xlsx (SheetJS)
    console.log('Parsing XLSX file...');
    const workbook = XLSX.readFile(tempFile);

    console.log(`Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(', ')}`);
    if (workbook.SheetNames.length === 0) {
      console.error('⚠️  No worksheets found in XLSX file');
      fs.unlinkSync(tempFile);
      return;
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log(`Reading sheet: ${sheetName}`);

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✓ Parsed ${data.length} products\n`);

    if (data.length === 0) {
      console.log('⚠️  No products found in export');
      fs.unlinkSync(tempFile);
      return;
    }

    // Show sample
    console.log('Sample XLSX structure:');
    console.log(JSON.stringify(Object.keys(data[0] || {}), null, 2));
    console.log('\nSample product:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('');

    // Transform to Supabase format
    console.log('Transforming products...');
    const products = data.map(row => {
      // Parse numeric values safely
      const parseNum = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      return {
        supplier_name: SUPPLIER_NAME,
        supplier_sku: row.Stockcode || '',
        barcode: row['APN Barcode'] || null,
        product_name: row.Description || '',
        brand: row.Brand || null,
        size: row.Size || null,
        cost_price: parseNum(row['W/S ex GST']),
        rrp: parseNum(row.RRP),
        wholesale_price: parseNum(row['W/S ex GST']),
        stock_level: (row.InStock === 'TRUE' || row.InStock === true) ? 100 : 0,
        availability: (row.InStock === 'TRUE' || row.InStock === true) ? 'available' : 'preorder',
        category: row.Categories || null,
        moq: parseInt(row.MOQ || 1),
        metadata: {
          is_active: row.IsActive,
          new: row.New,
          on_deal: row.OnDeal,
          clearance: row.Clearance,
          certified_organic: row.CertifiedOrganic,
          organic: row.Organic,
          gluten_free: row.GlutenFree,
          vegetarian: row.Vegetarian,
          vegan: row.Vegan,
          dairy_free: row.DairyFree,
          ingredients: row.Ingredients,
          image1: row.Image1,
          image2: row.Image2,
          carton_qty: row['Ctn Qty'],
          carton_barcode: row['Ctn Barcode'],
          raw_data: row
        },
        last_synced_at: new Date().toISOString()
      };
    }).filter(p => p.supplier_sku); // Skip rows without SKU

    console.log(`✓ Transformed ${products.length} valid products\n`);

    // Delete existing UHP products
    console.log(`Deleting existing ${SUPPLIER_NAME} products...`);
    const { error: deleteError } = await supabase
      .from('supplier_products')
      .delete()
      .eq('supplier_name', SUPPLIER_NAME);

    if (deleteError) {
      console.error('⚠️  Delete error:', deleteError.message);
    } else {
      console.log('✓ Cleared existing products\n');
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
          console.error(`✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
          errors += batch.length;
        } else {
          inserted += batch.length;
          console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products`);
        }
      } catch (err) {
        console.error(`✗ Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, err.message);
        errors += batch.length;
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('UHP LOAD SUMMARY');
    console.log('========================================\n');
    console.log(`Total products fetched: ${data.length}`);
    console.log(`Valid products:         ${products.length}`);
    console.log(`Successfully loaded:    ${inserted}`);
    console.log(`Errors:                 ${errors}\n`);

    // Verify
    const { count } = await supabase
      .from('supplier_products')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_name', SUPPLIER_NAME);

    console.log(`✅ UHP products in database: ${count}\n`);
    console.log('========================================\n');

    // Clean up temp file
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    // Clean up temp file
    const tempFile = path.join(__dirname, 'temp-uhp-products.xlsx');
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }
}

// Run
loadUHPProducts().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
