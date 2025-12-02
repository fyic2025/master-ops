#!/usr/bin/env node
/**
 * Update sections/product.liquid to add RRP display
 * Adds RRP after the spark-pdp component
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const THEME_ID = '153752731891';

const RRP_LIQUID = `
              {%- comment -%} RRP Display - Added by automation {%- endcomment -%}
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
              {%- endif -%}
`;

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
  console.log('UPDATE SECTIONS/PRODUCT.LIQUID WITH RRP DISPLAY');
  console.log('='.repeat(60));
  console.log();

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  // Get current content
  console.log('Fetching current sections/product.liquid...');
  const getResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${THEME_ID}/assets.json?asset[key]=sections/product.liquid`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });

  if (getResult.status !== 200) {
    console.error('Failed to fetch:', getResult.data);
    process.exit(1);
  }

  const currentContent = getResult.data.asset.value;
  console.log(`Current content: ${currentContent.length} characters`);

  // Check if RRP already added
  if (currentContent.includes('product-page--rrp')) {
    console.log('RRP display already exists in section. Skipping.');
    return;
  }

  // Find spark-pdp and insert after it
  const sparkPdpTag = '<spark-pdp parent-id="{{ product.id }}"></spark-pdp>';
  const sparkIndex = currentContent.indexOf(sparkPdpTag);

  if (sparkIndex === -1) {
    console.error('Could not find spark-pdp tag in section!');
    process.exit(1);
  }

  // Insert RRP display after spark-pdp
  const insertPosition = sparkIndex + sparkPdpTag.length;
  const newContent =
    currentContent.slice(0, insertPosition) +
    RRP_LIQUID +
    currentContent.slice(insertPosition);

  console.log(`New content: ${newContent.length} characters`);
  console.log(`Inserted RRP display after spark-pdp tag`);

  // Upload new content
  console.log('\nUploading updated section...');
  const data = JSON.stringify({
    asset: {
      key: 'sections/product.liquid',
      value: newContent
    }
  });

  const putResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${THEME_ID}/assets.json`,
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, data);

  if (putResult.status === 200) {
    console.log('Section updated successfully!');
    console.log('\nRefresh the product page to see RRP display.');
  } else {
    console.error('Failed to update:', putResult.data);
    process.exit(1);
  }
}

main().catch(console.error);
