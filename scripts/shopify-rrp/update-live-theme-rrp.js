#!/usr/bin/env node
/**
 * Add RRP display to the LIVE Elevate theme
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
  console.log('ADD RRP TO LIVE THEME (Uniform Images)');
  console.log('Theme ID:', LIVE_THEME_ID);
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

  if (getResult.status !== 200) {
    console.error('Failed to fetch:', getResult.data);
    process.exit(1);
  }

  let content = getResult.data.asset.value;
  console.log(`Current content: ${content.length} characters`);

  // Check if RRP already exists
  if (content.includes('product-page--rrp')) {
    console.log('RRP code already exists in LIVE theme!');
    return;
  }

  // Find where to insert - after the product title h1 closes
  // Look for the pattern in the heading block
  const lines = content.split('\n');
  let insertIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    // Look for </h1> after product.title
    if (lines[i].includes('</h1>') && i > 0 && lines[i-1] && lines[i-1].includes('product.title')) {
      // Found the h1 close, now find the endif
      for (let j = i; j < i + 5 && j < lines.length; j++) {
        if (lines[j].includes('endif')) {
          insertIndex = j + 1;
          console.log(`Found insertion point after line ${j + 1}`);
          break;
        }
      }
      break;
    }
    // Alternative: h1 closing on same line as product.title
    if (lines[i].includes('product.title') && lines[i].includes('</h1>')) {
      for (let j = i; j < i + 5 && j < lines.length; j++) {
        if (lines[j].includes('endif')) {
          insertIndex = j + 1;
          console.log(`Found insertion point (alt) after line ${j + 1}`);
          break;
        }
      }
      break;
    }
  }

  if (insertIndex === -1) {
    console.log('Could not find insertion point. Showing context around product.title:');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('product.title')) {
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 10); j++) {
          console.log(`${j + 1}: ${lines[j]}`);
        }
        break;
      }
    }
    process.exit(1);
  }

  // Insert RRP code
  const rrpCode = `                  {%- comment -%} RRP Display {%- endcomment -%}
                  {%- assign current_variant = product.selected_or_first_available_variant -%}
                  {%- assign rrp_value = current_variant.metafields.custom.rrp.value -%}
                  {%- if rrp_value -%}
                    <div class="product-page--rrp" style="margin-top: 8px; color: #666; font-size: 14px;">
                      RRP: ` + '$' + `{{ rrp_value }}
                      {%- if current_variant.metafields.custom.has_gst.value == true -%}
                        (inc GST)
                      {%- elsif current_variant.metafields.custom.has_gst.value == false -%}
                        (GST-free)
                      {%- endif -%}
                    </div>
                  {%- endif -%}`;

  lines.splice(insertIndex, 0, rrpCode);
  content = lines.join('\n');

  console.log(`New content: ${content.length} characters`);

  // Upload
  console.log('\nUploading to LIVE theme...');
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
    console.log('LIVE theme updated successfully!');
    console.log('\nRefresh the product page to see RRP.');
  } else {
    console.error('Failed:', putResult.data);
    process.exit(1);
  }
}

main().catch(console.error);
