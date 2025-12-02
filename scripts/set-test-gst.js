#!/usr/bin/env node
/**
 * Set has_gst metafield on test product variant
 */
const https = require('https');
const path = require('path');
const creds = require(path.join(__dirname, '..', 'creds.js'));

const TEST_VARIANT_ID = '43768103731443';

async function main() {
  console.log('Setting has_gst metafield on test variant...');

  const [token, url] = await Promise.all([
    creds.get('elevate', 'shopify_access_token'),
    creds.get('elevate', 'shopify_store_url')
  ]);

  const hostname = url.replace('https://', '').replace('/', '');

  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [{
      ownerId: `gid://shopify/ProductVariant/${TEST_VARIANT_ID}`,
      namespace: 'custom',
      key: 'has_gst',
      type: 'boolean',
      value: 'true'
    }]
  };

  const data = JSON.stringify({ query: mutation, variables });

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
        if (result.data?.metafieldsSet?.userErrors?.length > 0) {
          console.error('Errors:', result.data.metafieldsSet.userErrors);
        } else if (result.data?.metafieldsSet?.metafields) {
          console.log('SUCCESS! has_gst = true set on variant', TEST_VARIANT_ID);
          result.data.metafieldsSet.metafields.forEach(m => {
            console.log(`  ${m.namespace}.${m.key} = ${m.value}`);
          });
        } else {
          console.log('Response:', JSON.stringify(result, null, 2));
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

main().catch(console.error);
