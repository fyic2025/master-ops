#!/usr/bin/env node
/**
 * Add RRP Display to LIVE Theme - Using Shopify Expert Skill Patterns
 *
 * Carefully adds RRP display after the price in sections/product.liquid
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
  console.log('ADD RRP TO LIVE THEME (SAFE APPROACH)');
  console.log('='.repeat(60));
  console.log();

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  // Step 1: Fetch current section
  console.log('Step 1: Fetching sections/product.liquid from LIVE theme...');
  const getResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${LIVE_THEME_ID}/assets.json?asset[key]=sections/product.liquid`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });

  if (getResult.status !== 200) {
    console.error('Failed to fetch section:', getResult.data);
    process.exit(1);
  }

  let content = getResult.data.asset.value;
  console.log(`  Current size: ${content.length} characters`);

  // Step 2: Check if RRP already exists
  if (content.includes('product-page--rrp') || content.includes('RRP Display')) {
    console.log('  RRP display already exists in section!');
    console.log('  Skipping to avoid duplicate.');
    return;
  }

  // Step 3: Find the correct insertion point
  // Looking for the price wrapper div that contains product pricing
  console.log('\nStep 2: Finding insertion point...');

  // The RRP code to insert - placed AFTER the price display
  // Using Liquid best practices from shopify-expert skill
  // Note: Using string concat to avoid JS template literal issues with ${{ }}
  const rrpCode = '\n' +
    '              {%- comment -%} RRP Display (Variant Metafield) {%- endcomment -%}\n' +
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

  // Strategy: Find the product-price render tag and insert after it
  // Looking for: render 'product-price'
  const priceRenderPattern = /{%\s*render\s*'product-price'/;
  const priceRenderMatch = content.match(priceRenderPattern);

  if (priceRenderMatch) {
    // Find the end of this tag
    const startIdx = priceRenderMatch.index;
    const endTagPattern = /-%}/;
    const remaining = content.substring(startIdx);
    const endMatch = remaining.match(endTagPattern);

    if (endMatch) {
      const insertPosition = startIdx + endMatch.index + endMatch[0].length;
      console.log(`  Found 'render product-price' at position ${startIdx}`);
      console.log(`  Will insert RRP after position ${insertPosition}`);

      // Show context
      const before = content.substring(Math.max(0, insertPosition - 100), insertPosition);
      const after = content.substring(insertPosition, insertPosition + 100);
      console.log('\n  Context:');
      console.log('  ...', before.trim().slice(-60), '[INSERT HERE]', after.trim().slice(0, 60), '...');

      // Insert
      const newContent = content.substring(0, insertPosition) + rrpCode + content.substring(insertPosition);
      console.log(`\nStep 3: Uploading updated section...`);
      console.log(`  New size: ${newContent.length} characters (added ${newContent.length - content.length})`);

      const data = JSON.stringify({
        asset: {
          key: 'sections/product.liquid',
          value: newContent
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
        console.log('\nSUCCESS! RRP display added to LIVE theme.');
        console.log('Please hard refresh the product page to see the change.');
      } else {
        console.error('Failed to upload:', putResult.data);
      }
      return;
    }
  }

  // Fallback: Look for product.price in the template
  console.log("  'render product-price' not found. Looking for product.price...");

  // Find lines with product.price | money
  const lines = content.split('\n');
  let insertLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('product.price') && lines[i].includes('money')) {
      // Find the closing tag of this block
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        if (lines[j].includes('</div>') || lines[j].includes('endif')) {
          insertLine = j + 1;
          console.log(`  Found product.price at line ${i + 1}`);
          console.log(`  Will insert after line ${j + 1}`);
          break;
        }
      }
      if (insertLine !== -1) break;
    }
  }

  if (insertLine !== -1) {
    lines.splice(insertLine, 0, rrpCode);
    const newContent = lines.join('\n');

    console.log(`\nStep 3: Uploading updated section...`);
    console.log(`  New size: ${newContent.length} characters`);

    const data = JSON.stringify({
      asset: {
        key: 'sections/product.liquid',
        value: newContent
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
      console.log('\nSUCCESS! RRP display added to LIVE theme.');
    } else {
      console.error('Failed:', putResult.data);
    }
    return;
  }

  console.error('\nCould not find suitable insertion point.');
  console.log('Manual inspection needed. Showing price-related lines:');
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes('price')) {
      console.log(`  ${i + 1}: ${line.substring(0, 100)}`);
    }
  });
}

main().catch(console.error);
