#!/usr/bin/env node
/**
 * Update RRP display with proper styling - careful line-by-line approach
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
  console.log('UPDATE RRP STYLING (V2 - Line by Line)');
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
  const lines = content.split('\n');
  console.log(`Current: ${content.length} chars, ${lines.length} lines`);

  // Find the RRP block start line
  let rrpStartLine = -1;
  let rrpEndLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{%- comment -%} RRP Display {%- endcomment -%}')) {
      rrpStartLine = i;
      console.log(`Found RRP start at line ${i + 1}`);
      break;
    }
  }

  if (rrpStartLine === -1) {
    console.error('Could not find RRP block start');
    process.exit(1);
  }

  // Find the end of the RRP block (the endif for the rrp.value if)
  let depth = 0;
  for (let i = rrpStartLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{%- if current_variant.metafields.custom.rrp.value -%}')) {
      depth = 1;
    } else if (depth > 0) {
      // Count nested ifs
      if (line.match(/{%-?\s*if\s/)) {
        depth++;
      }
      if (line.match(/{%-?\s*endif\s*-?%}/)) {
        depth--;
        if (depth === 0) {
          rrpEndLine = i;
          console.log(`Found RRP end at line ${i + 1}`);
          break;
        }
      }
    }
  }

  if (rrpEndLine === -1) {
    console.error('Could not find RRP block end');
    process.exit(1);
  }

  // Show current RRP block
  console.log('\nCurrent RRP block:');
  for (let i = rrpStartLine; i <= rrpEndLine; i++) {
    console.log(`  ${i + 1}: ${lines[i].substring(0, 80)}`);
  }

  // New RRP block with updated styling
  // Using data-item="accent-text" to match price styling, but font-weight: normal
  const newRrpLines = [
    '              {%- comment -%} RRP Display {%- endcomment -%}',
    '              {%- assign current_variant = product.selected_or_first_available_variant -%}',
    '              {%- if current_variant.metafields.custom.rrp.value -%}',
    '                <div class="product-page--rrp" data-item="accent-text" style="font-weight: normal; margin-top: 4px;">',
    '                  RRP: ${{ current_variant.metafields.custom.rrp.value }}',
    '                </div>',
    '                <div class="product-page--gst" data-item="accent-text" style="font-weight: normal; margin-top: 4px;">',
    '                  GST: {%- if current_variant.metafields.custom.has_gst.value == true -%}Yes{%- else -%}No{%- endif -%}',
    '                </div>',
    '              {%- endif -%}'
  ];

  // Replace the old lines with new ones
  const newLines = [
    ...lines.slice(0, rrpStartLine),
    ...newRrpLines,
    ...lines.slice(rrpEndLine + 1)
  ];

  console.log('\nNew RRP block:');
  newRrpLines.forEach((line, i) => {
    console.log(`  ${rrpStartLine + i + 1}: ${line.substring(0, 80)}`);
  });

  const newContent = newLines.join('\n');
  console.log(`\nNew: ${newContent.length} chars, ${newLines.length} lines`);

  // Upload
  console.log('\nUploading...');
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
    console.log('\nSUCCESS! RRP styling updated.');
    console.log('- RRP: Same size as price (accent-text), not bold');
    console.log('- GST: Yes/No line added');
    console.log('\nPlease hard refresh the product page.');
  } else {
    console.error('\nFailed:', JSON.stringify(putResult.data, null, 2));
  }
}

main().catch(console.error);
