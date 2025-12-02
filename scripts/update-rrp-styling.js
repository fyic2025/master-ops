#!/usr/bin/env node
/**
 * Update RRP display with proper styling:
 * - Same size as price but not bold
 * - Add separate GST: Yes/No line
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
  console.log('UPDATE RRP STYLING');
  console.log('='.repeat(60));
  console.log();

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  // Fetch current section
  console.log('Fetching current section...');
  const getResult = await makeRequest(hostname, {
    hostname,
    path: `/admin/api/2024-01/themes/${LIVE_THEME_ID}/assets.json?asset[key]=sections/product.liquid`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });

  if (getResult.status !== 200) {
    console.error('Failed:', getResult.data);
    process.exit(1);
  }

  let content = getResult.data.asset.value;
  console.log(`Current size: ${content.length} characters`);

  // Old RRP code pattern to find and replace
  const oldRrpPattern = /\{%- comment -%\} RRP Display \{%- endcomment -%\}[\s\S]*?\{%- endif -%\}/;

  // New RRP code with updated styling:
  // - Same font-size as price (using the theme's accent-text styling)
  // - Not bold (font-weight: normal)
  // - GST line on separate row
  const newRrpCode =
    '{%- comment -%} RRP Display {%- endcomment -%}\n' +
    '              {%- assign current_variant = product.selected_or_first_available_variant -%}\n' +
    '              {%- if current_variant.metafields.custom.rrp.value -%}\n' +
    '                <div class="product-page--rrp" data-item="accent-text" style="font-weight: normal; margin-top: 4px;">\n' +
    '                  RRP: ${{ current_variant.metafields.custom.rrp.value }}\n' +
    '                </div>\n' +
    '              {%- endif -%}\n' +
    '              <div class="product-page--gst" data-item="accent-text" style="font-weight: normal; margin-top: 4px;">\n' +
    '                GST: {%- if current_variant.metafields.custom.has_gst.value == true -%}Yes{%- else -%}No{%- endif -%}\n' +
    '              </div>\n' +
    '              {%- comment -%} End RRP/GST Display {%- endcomment -%}';

  // Check if old pattern exists
  if (content.match(oldRrpPattern)) {
    console.log('Found existing RRP code, replacing...');
    content = content.replace(oldRrpPattern, newRrpCode);
  } else {
    console.log('Old RRP pattern not found exactly, trying alternative approach...');

    // Find RRP Display comment and replace from there
    const startMarker = '{%- comment -%} RRP Display {%- endcomment -%}';
    const startIdx = content.indexOf(startMarker);

    if (startIdx === -1) {
      console.error('Could not find RRP code to replace');
      process.exit(1);
    }

    // Find the closing endif after the RRP block
    // Need to find the endif that closes the if current_variant.metafields.custom.rrp.value
    const afterStart = content.substring(startIdx);

    // Find end of the RRP block - look for the endif that closes the rrp.value if
    let endIdx = startIdx;
    let depth = 0;
    let foundRrpIf = false;
    const lines = afterStart.split('\n');
    let lineCount = 0;

    for (const line of lines) {
      lineCount++;
      if (line.includes('if current_variant.metafields.custom.rrp.value')) {
        foundRrpIf = true;
        depth = 1;
      } else if (foundRrpIf) {
        if (line.includes('{%- if') || line.includes('{% if')) {
          depth++;
        }
        if (line.includes('{%- endif -%}') || line.includes('{% endif %}')) {
          depth--;
          if (depth === 0) {
            // Found the closing endif
            endIdx = startIdx + lines.slice(0, lineCount).join('\n').length;
            break;
          }
        }
      }
    }

    console.log(`Replacing from position ${startIdx} to ${endIdx}`);
    content = content.substring(0, startIdx) + newRrpCode + content.substring(endIdx);
  }

  console.log(`New size: ${content.length} characters`);

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
    console.log('\nSUCCESS! RRP styling updated.');
    console.log('- RRP: Same size as price, not bold');
    console.log('- GST: Yes/No line added');
  } else {
    console.error('Failed:', putResult.data);
  }
}

main().catch(console.error);
