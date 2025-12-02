#!/usr/bin/env node
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const variantId = process.argv[2] || '43768103731443';

async function main() {
  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);
  const hostname = url.replace('https://', '').replace('/', '');

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: `/admin/api/2024-01/variants/${variantId}/metafields.json`,
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': token }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const data = JSON.parse(body);
        console.log(`Metafields for variant ${variantId}:`);
        if (data.metafields && data.metafields.length > 0) {
          data.metafields.forEach(m => {
            console.log(`  ${m.namespace}.${m.key} = ${m.value} (type: ${m.type})`);
          });
        } else {
          console.log('  No metafields found!');
          console.log(JSON.stringify(data, null, 2));
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });
}

main().catch(console.error);
