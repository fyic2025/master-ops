#!/usr/bin/env node
/**
 * Fix RRP Display - Clean Implementation
 *
 * Removes broken RRP code and adds clean implementation after the price
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const LIVE_THEME_ID = '153755549939'; // Uniform Images - LIVE

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
  console.log('FIX RRP - CLEAN IMPLEMENTATION');
  console.log('='.repeat(60));
  console.log();

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  // Step 1: Fetch current section
  console.log('Step 1: Fetching sections/product.liquid...');
  const getResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${LIVE_THEME_ID}/assets.json?asset[key]=sections/product.liquid`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });

  if (getResult.status !== 200) {
    console.error('Failed to fetch:', getResult.data);
    process.exit(1);
  }

  let content = getResult.data.asset.value;
  console.log(`  Original size: ${content.length} characters`);

  // Step 2: Remove all existing RRP code (including broken DEBUG blocks)
  console.log('\nStep 2: Removing existing RRP code...');

  const lines = content.split('\n');
  const cleanLines = [];
  let inRrpBlock = false;
  let removedLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of RRP block
    if (line.includes('RRP Display') || line.includes('DEBUG: RRP')) {
      inRrpBlock = true;
      removedLines++;
      continue;
    }

    // Inside RRP block - look for the endif that closes it
    if (inRrpBlock) {
      removedLines++;
      // Check if this line closes the RRP block
      if (line.includes('{%- endif -%}') && !line.includes('has_gst')) {
        inRrpBlock = false;
      }
      continue;
    }

    // Also remove orphaned RRP-related lines
    if (line.includes('product-page--rrp') ||
        line.includes('RRP Value:') ||
        (line.includes('background: yellow') && line.includes('DEBUG')) ||
        (line.includes('background: orange') && line.includes('RRP'))) {
      removedLines++;
      continue;
    }

    cleanLines.push(line);
  }

  console.log(`  Removed ${removedLines} lines`);
  content = cleanLines.join('\n');
  console.log(`  After cleanup: ${content.length} characters`);

  // Step 3: Find the correct insertion point - after product-price render
  console.log('\nStep 3: Finding insertion point (after product-price)...');

  // Clean RRP code - simple and correct
  const rrpCode =
    '\n              {%- comment -%} RRP Display {%- endcomment -%}' +
    '\n              {%- assign current_variant = product.selected_or_first_available_variant -%}' +
    '\n              {%- if current_variant.metafields.custom.rrp.value -%}' +
    '\n                <div class="product-page--rrp" style="margin-top: 8px; color: #666; font-size: 14px;">' +
    '\n                  RRP: ${{ current_variant.metafields.custom.rrp.value }}' +
    '\n                  {%- if current_variant.metafields.custom.has_gst.value == true -%}' +
    '\n                    (inc GST)' +
    '\n                  {%- elsif current_variant.metafields.custom.has_gst.value == false -%}' +
    '\n                    (GST-free)' +
    '\n                  {%- endif -%}' +
    '\n                </div>' +
    '\n              {%- endif -%}\n';

  // Find product-price render and insert after it
  const priceRenderPattern = /{%-?\s*render\s*'product-price'[^%]*-%}/;
  const match = content.match(priceRenderPattern);

  if (match) {
    const insertPosition = match.index + match[0].length;
    console.log(`  Found 'render product-price' at position ${match.index}`);
    console.log(`  Inserting RRP code after position ${insertPosition}`);

    content = content.substring(0, insertPosition) + rrpCode + content.substring(insertPosition);
    console.log(`  New size: ${content.length} characters`);

    // Upload
    console.log('\nStep 4: Uploading fixed section...');
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
      console.log('SUCCESS! RRP display fixed.');
      console.log('='.repeat(60));
      console.log('\nPlease hard refresh the product page:');
      console.log('https://elevatewholesale.com.au/products/ausganica-certified-organic-calming-herbs-toothpaste-130g');
    } else {
      console.error('Failed to upload:', putResult.data);
    }
  } else {
    console.error("Could not find 'render product-price' in the template.");
    console.log('Looking for alternative insertion points...');

    // Fallback: look for product-price in the content
    const altPattern = /product-price/g;
    let altMatch;
    while ((altMatch = altPattern.exec(content)) !== null) {
      console.log(`  Found 'product-price' at position ${altMatch.index}`);
    }
  }
}

main().catch(console.error);
