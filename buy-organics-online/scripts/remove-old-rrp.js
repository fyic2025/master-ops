#!/usr/bin/env node
/**
 * Remove old/broken RRP block, keep only the new clean one after price
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
  console.log('REMOVE OLD/BROKEN RRP BLOCK');
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

  // Count RRP blocks
  const rrpMatches = content.match(/RRP Display/g);
  console.log(`Found ${rrpMatches ? rrpMatches.length : 0} RRP blocks`);

  if (!rrpMatches || rrpMatches.length < 2) {
    console.log('Only one or zero RRP blocks - nothing to remove');
    return;
  }

  // Find and remove the OLD block (has DEBUG statements)
  // The old block has: "DEBUG: RRP BLOCK REACHED" and colored debug divs
  const lines = content.split('\n');
  const cleanLines = [];
  let inOldRrpBlock = false;
  let removedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect start of OLD RRP block (has DEBUG)
    if (line.includes('RRP Display') && !inOldRrpBlock) {
      // Check if next few lines have DEBUG indicators
      const nextLines = lines.slice(i, i + 5).join('\n');
      if (nextLines.includes('DEBUG') || nextLines.includes('background: yellow') || nextLines.includes('background: orange')) {
        console.log(`Found OLD RRP block at line ${i + 1}`);
        inOldRrpBlock = true;
        removedCount++;
        continue;
      }
    }

    // Inside old block - skip until we find the closing endif
    if (inOldRrpBlock) {
      removedCount++;
      // Look for the endif that closes the RRP block (not the has_gst one)
      // The pattern is: {%- endif -%} that comes after </div> and is not inside another if
      if (line.trim() === '{%- endif -%}') {
        // Check if this is the outer endif by looking at context
        const prevLine = lines[i - 1] || '';
        if (prevLine.includes('</div>')) {
          console.log(`Found closing endif at line ${i + 1}`);
          inOldRrpBlock = false;
        }
      }
      continue;
    }

    cleanLines.push(line);
  }

  console.log(`Removed ${removedCount} lines`);

  const newContent = cleanLines.join('\n');
  console.log(`New size: ${newContent.length} characters`);

  // Verify only one RRP block remains
  const remainingRrp = newContent.match(/RRP Display/g);
  console.log(`Remaining RRP blocks: ${remainingRrp ? remainingRrp.length : 0}`);

  if (!remainingRrp || remainingRrp.length !== 1) {
    console.error('ERROR: Expected exactly 1 RRP block after cleanup');
    return;
  }

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
    console.log('\nSUCCESS! Old RRP block removed.');
    console.log('Only the clean RRP block (after price) remains.');
    console.log('\nPlease hard refresh the product page.');
  } else {
    console.error('Failed:', putResult.data);
  }
}

main().catch(console.error);
