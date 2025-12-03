#!/usr/bin/env node
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

async function main() {
  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);
  const hostname = url.replace('https://', '').replace('/', '');

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: '/admin/api/2024-01/themes/153755549939/assets.json?asset[key]=sections/product.liquid',
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': token }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const content = JSON.parse(body).asset.value;
        console.log('Total chars:', content.length);

        // Find RRP-related content
        const lines = content.split('\n');
        console.log('\n=== RRP-related lines ===');
        let rrpFound = false;
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes('rrp') ||
              line.includes('metafields.custom.rrp') ||
              line.includes('product-page--rrp')) {
            rrpFound = true;
            console.log((i + 1) + ': ' + line.substring(0, 120));
          }
        });
        if (!rrpFound) console.log('No RRP code found');

        // Show context around product-price render
        console.log('\n=== Context around product-price ===');
        lines.forEach((line, i) => {
          if (line.includes("render 'product-price'")) {
            console.log('Line ' + (i + 1) + ': ' + line.trim().substring(0, 100));
            // Show next 10 lines
            for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
              console.log('  +' + (j - i) + ': ' + lines[j].trim().substring(0, 80));
            }
          }
        });

        // Show lines 175-200 to understand RRP block context
        console.log('\n=== Lines 175-205 (RRP block context) ===');
        for (let i = 174; i < Math.min(205, lines.length); i++) {
          const marker = (i >= 183 && i <= 195) ? '>>>' : '   ';
          console.log(marker + (i + 1) + ': ' + lines[i].substring(0, 90));
        }

        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });
}

main().catch(console.error);
