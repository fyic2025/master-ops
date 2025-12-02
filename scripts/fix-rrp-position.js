#!/usr/bin/env node
/**
 * Fix RRP position in LIVE theme - move it to the correct location
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const LIVE_THEME_ID = '153755549939';

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
  console.log('FIX RRP POSITION IN LIVE THEME');
  console.log('='.repeat(60));
  console.log();

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  // Get current section
  console.log('Fetching sections/product.liquid...');
  const getResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${LIVE_THEME_ID}/assets.json?asset[key]=sections/product.liquid`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });

  let content = getResult.data.asset.value;
  console.log(`Current content: ${content.length} characters`);

  // First, remove any existing RRP code
  if (content.includes('RRP Display')) {
    console.log('Removing existing RRP code...');
    const lines = content.split('\n');
    const newLines = [];
    let skipUntilEndif = false;
    let endifCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('RRP Display')) {
        skipUntilEndif = true;
        endifCount = 0;
        continue;
      }
      if (skipUntilEndif) {
        if (lines[i].includes('{%- if')) endifCount++;
        if (lines[i].includes('{%- endif -%}')) {
          if (endifCount > 0) {
            endifCount--;
          } else {
            skipUntilEndif = false;
            continue;
          }
        }
        continue;
      }
      newLines.push(lines[i]);
    }
    content = newLines.join('\n');
    console.log(`After removal: ${content.length} characters`);
  }

  // Find the right place - after the price in the product info section
  // Look for where product.price or variant.price is displayed
  const lines = content.split('\n');
  let insertIndex = -1;

  // Strategy 1: Find after the price display in product-page--info
  for (let i = 0; i < lines.length; i++) {
    // Look for product price display
    if (lines[i].includes('product.price') && lines[i].includes('money')) {
      // Insert after this line
      insertIndex = i + 1;
      console.log(`Found product.price at line ${i + 1}`);
      break;
    }
    // Look for variant price
    if (lines[i].includes('variant.price') && lines[i].includes('money')) {
      insertIndex = i + 1;
      console.log(`Found variant.price at line ${i + 1}`);
      break;
    }
  }

  // Strategy 2: Find after the h1 title in the desktop container
  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('product-page--desktop-container')) {
        // Find the title h1 in this section
        for (let j = i; j < Math.min(i + 50, lines.length); j++) {
          if (lines[j].includes('</h1>')) {
            insertIndex = j + 1;
            console.log(`Found </h1> in desktop container at line ${j + 1}`);
            break;
          }
        }
        break;
      }
    }
  }

  // Strategy 3: Just find the first </h1> that has product.title before it
  if (insertIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('product.title')) {
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes('</h1>')) {
            insertIndex = j + 1;
            console.log(`Found </h1> after product.title at line ${j + 1}`);
            break;
          }
        }
        if (insertIndex !== -1) break;
      }
    }
  }

  if (insertIndex === -1) {
    console.error('Could not find suitable insertion point!');
    console.log('Showing lines with product.title:');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('product.title')) {
        console.log(`${i + 1}: ${lines[i].substring(0, 100)}`);
      }
    }
    process.exit(1);
  }

  // Show context
  console.log('\nContext around insertion point:');
  for (let i = Math.max(0, insertIndex - 3); i < Math.min(lines.length, insertIndex + 3); i++) {
    const marker = i === insertIndex ? '>>> ' : '    ';
    console.log(`${marker}${i + 1}: ${lines[i].substring(0, 80)}`);
  }

  // Insert RRP code with proper indentation matching surrounding code
  const indent = '      '; // Match the typical indentation
  const rrpCode = `${indent}{%- comment -%} RRP Display {%- endcomment -%}
${indent}{%- assign current_variant = product.selected_or_first_available_variant -%}
${indent}{%- assign rrp_value = current_variant.metafields.custom.rrp.value -%}
${indent}{%- if rrp_value -%}
${indent}  <div class="product-page--rrp" style="margin-top: 4px; margin-bottom: 8px; color: #666; font-size: 14px;">
${indent}    RRP: ` + '$' + `{{ rrp_value }}
${indent}    {%- if current_variant.metafields.custom.has_gst.value == true -%}
${indent}      (inc GST)
${indent}    {%- elsif current_variant.metafields.custom.has_gst.value == false -%}
${indent}      (GST-free)
${indent}    {%- endif -%}
${indent}  </div>
${indent}{%- endif -%}`;

  lines.splice(insertIndex, 0, rrpCode);
  content = lines.join('\n');

  console.log(`\nNew content: ${content.length} characters`);

  // Upload
  console.log('\nUploading...');
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
    console.log('LIVE theme updated!');
    console.log('\nHard refresh the page to see the fix.');
  } else {
    console.error('Failed:', putResult.data);
  }
}

main().catch(console.error);
