#!/usr/bin/env node
/**
 * Fix RRP display location - move it INSIDE the heading block
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const THEME_ID = '153752731891';

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
  console.log('FIX RRP LOCATION IN SECTIONS/PRODUCT.LIQUID');
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

  let content = getResult.data.asset.value;
  console.log(`Current content: ${content.length} characters`);

  // First, remove the old RRP code (outside the block)
  const oldRrpCode = `<spark-pdp parent-id="{{ product.id }}"></spark-pdp>
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

  if (content.includes('product-page--rrp')) {
    console.log('Removing old RRP code from outside the block...');
    // Remove everything from spark-pdp to endif
    content = content.replace(oldRrpCode, '<spark-pdp parent-id="{{ product.id }}"></spark-pdp>\n');
  }

  // Now add RRP inside the heading block - after the </h1> or </h2>
  // Find the pattern: {{- product.title -}}</h1> or </h2> followed by endif
  const headingEndPattern = /(\{\{- product\.title -\}\}\s*<\/h[12]>\s*\{%- endif -%\}\s*<\/div>\s*<\/div>)/;

  const rrpInsideBlock = `{{- product.title -}}
                    </h1>
                  {%- endif -%}
                  {%- comment -%} RRP Display {%- endcomment -%}
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
                </div>
              </div>`;

  // Find and replace the heading block end
  const headingBlockEnd = `{{- product.title -}}
                    </h1>
                  {%- endif -%}
                </div>
              </div>`;

  if (content.includes(headingBlockEnd)) {
    console.log('Found heading block end, inserting RRP code inside...');
    content = content.replace(headingBlockEnd, rrpInsideBlock);
  } else {
    console.log('Could not find exact heading block end pattern');
    console.log('Trying alternative approach...');

    // Try to find and modify line by line
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      // Look for the </h1> closing after product.title
      if (lines[i].includes('</h1>') && lines[i-1] && lines[i-1].includes('product.title')) {
        console.log(`Found </h1> at line ${i+1}, inserting RRP after endif`);
        // Find the endif and </div></div> after this
        for (let j = i; j < i + 5 && j < lines.length; j++) {
          if (lines[j].includes('endif') && lines[j+1] && lines[j+1].includes('</div>')) {
            // Insert RRP code after endif, before </div>
            const rrpCode = `
                  {%- comment -%} RRP Display {%- endcomment -%}
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
            lines.splice(j + 1, 0, rrpCode);
            modified = true;
            break;
          }
        }
        break;
      }
    }

    if (modified) {
      content = lines.join('\n');
    } else {
      console.error('Could not find insertion point!');
      process.exit(1);
    }
  }

  console.log(`New content: ${content.length} characters`);

  // Upload new content
  console.log('\nUploading updated section...');
  const data = JSON.stringify({
    asset: {
      key: 'sections/product.liquid',
      value: content
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
