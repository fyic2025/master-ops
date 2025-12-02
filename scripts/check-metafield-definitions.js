#!/usr/bin/env node
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

async function checkDefinitions() {
  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);
  const hostname = url.replace('https://', '').replace('/', '');

  const query = `{
    metafieldDefinitions(ownerType: PRODUCTVARIANT, first: 20) {
      edges {
        node {
          id
          namespace
          key
          name
          type {
            name
          }
          access {
            storefront
          }
        }
      }
    }
  }`;

  const data = JSON.stringify({ query });

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: '/admin/api/2024-01/graphql.json',
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = JSON.parse(body);
        console.log('Metafield definitions for PRODUCTVARIANT:');
        if (result.data && result.data.metafieldDefinitions) {
          if (result.data.metafieldDefinitions.edges.length === 0) {
            console.log('  (none found)');
          }
          result.data.metafieldDefinitions.edges.forEach(e => {
            const n = e.node;
            console.log(`  ${n.namespace}.${n.key} - storefront: ${n.access?.storefront || 'N/A'}`);
          });
        } else {
          console.log(JSON.stringify(result, null, 2));
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

checkDefinitions();
