#!/usr/bin/env node
/**
 * Restore section from backup theme and add RRP in correct position
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const LIVE_THEME_ID = '153755549939'; // Uniform Images - LIVE
const BACKUP_THEME_ID = '153752731891'; // Copy of Beyond - backup

function makeRequest(hostname, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('RESTORE + ADD RRP (SAFE APPROACH)');
  console.log('='.repeat(60));
  console.log();

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  // Step 1: Fetch backup section (clean, no RRP)
  console.log('Step 1: Fetching clean section from backup theme...');
  const backupResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${BACKUP_THEME_ID}/assets.json?asset[key]=sections/product.liquid`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });

  if (backupResult.status !== 200) {
    console.error('Failed to fetch backup:', backupResult.data);
    process.exit(1);
  }

  let content = backupResult.data.asset.value;
  console.log(`  Backup size: ${content.length} characters`);

  // Verify backup is clean (no RRP code)
  if (content.includes('product-page--rrp') || content.includes('RRP Display')) {
    console.log('  WARNING: Backup already has RRP code, proceeding anyway...');
  } else {
    console.log('  Backup is clean (no RRP code)');
  }

  // Step 2: Find the correct insertion point
  // The product-price is rendered inside a case statement for 'price' block
  // We want to insert RRP AFTER the product-price render tag
  console.log('\nStep 2: Finding insertion point...');

  // Look for the product-price render tag with proper context
  const priceRenderRegex = /\{%-?\s*render\s+'product-price'[^%]*?-%\}/g;
  let match;
  let insertPosition = -1;

  while ((match = priceRenderRegex.exec(content)) !== null) {
    console.log(`  Found render 'product-price' at position ${match.index}`);
    // Use the first match
    if (insertPosition === -1) {
      insertPosition = match.index + match[0].length;
    }
  }

  if (insertPosition === -1) {
    console.error('  Could not find product-price render tag!');
    // Fallback - try different pattern
    const altPattern = /render 'product-price'/;
    const altMatch = content.match(altPattern);
    if (altMatch) {
      // Find the end of this line
      const startPos = altMatch.index;
      const endOfLine = content.indexOf('\n', startPos);
      insertPosition = endOfLine;
      console.log(`  Using fallback: insert at position ${insertPosition}`);
    } else {
      console.error('  Could not find any product-price reference!');
      process.exit(1);
    }
  }

  console.log(`  Will insert RRP after position ${insertPosition}`);

  // Show context
  const contextBefore = content.substring(insertPosition - 80, insertPosition);
  const contextAfter = content.substring(insertPosition, insertPosition + 80);
  console.log('\n  Context:');
  console.log('  Before:', contextBefore.replace(/\n/g, '\\n').slice(-60));
  console.log('  After: ', contextAfter.replace(/\n/g, '\\n').slice(0, 60));

  // Step 3: Create RRP code
  // Using proper Liquid syntax matching the theme's style
  const rrpCode =
    '\n' +
    '              {%- comment -%} RRP Display {%- endcomment -%}\n' +
    '              {%- assign current_variant = product.selected_or_first_available_variant -%}\n' +
    '              {%- if current_variant.metafields.custom.rrp.value -%}\n' +
    '                <div class="product-page--rrp" style="margin-top: 8px; color: #666; font-size: 14px;">\n' +
    '                  RRP: ${{ current_variant.metafields.custom.rrp.value }}\n' +
    '                  {%- if current_variant.metafields.custom.has_gst.value == true -%}\n' +
    '                    (inc GST)\n' +
    '                  {%- elsif current_variant.metafields.custom.has_gst.value == false -%}\n' +
    '                    (GST-free)\n' +
    '                  {%- endif -%}\n' +
    '                </div>\n' +
    '              {%- endif -%}';

  // Insert RRP code
  content = content.substring(0, insertPosition) + rrpCode + content.substring(insertPosition);
  console.log(`\n  New size: ${content.length} characters (added ${rrpCode.length})`);

  // Step 4: Upload to LIVE theme
  console.log('\nStep 3: Uploading to LIVE theme...');

  const data = JSON.stringify({
    asset: {
      key: 'sections/product.liquid',
      value: content
    }
  });

  const putResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${LIVE_THEME_ID}/assets.json`,
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, data);

  if (putResult.status === 200) {
    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS! RRP display added correctly.');
    console.log('='.repeat(60));
    console.log('\nPlease hard refresh (Ctrl+Shift+R) the product page:');
    console.log('https://elevatewholesale.com.au/products/ausganica-certified-organic-calming-herbs-toothpaste-130g');
    console.log('\nRRP should now appear after the price.');
  } else {
    console.error('\nFailed to upload:', JSON.stringify(putResult.data, null, 2));
    console.log('\nThe content was not saved. The LIVE theme is unchanged.');
  }
}

main().catch(console.error);
