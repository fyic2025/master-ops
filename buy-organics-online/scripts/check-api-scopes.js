/**
 * Check BigCommerce API token permissions
 */

const https = require('https');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const STORE_HASH = process.env.BC_BOO_STORE_HASH;
const ACCESS_TOKEN = process.env.BC_BOO_ACCESS_TOKEN;

async function checkEndpoints() {
  const endpoints = [
    { path: '/content/scripts', version: 'v3', name: 'Script Manager' },
    { path: '/content/widgets', version: 'v3', name: 'Widgets' },
    { path: '/banners', version: 'v2', name: 'Banners (Marketing)' },
    { path: '/store', version: 'v2', name: 'Store Info' },
    { path: '/catalog/products?limit=1', version: 'v3', name: 'Products' },
    { path: '/orders?limit=1', version: 'v2', name: 'Orders' },
    { path: '/customers?limit=1', version: 'v2', name: 'Customers' },
  ];

  console.log('Checking API token permissions...\n');
  console.log(`Store Hash: ${STORE_HASH}\n`);
  console.log('Endpoint Access:');
  console.log('─'.repeat(50));

  for (const ep of endpoints) {
    const result = await testEndpoint(ep.version, ep.path);
    const icon = result.ok ? '✅' : '❌';
    console.log(`  ${icon} ${ep.name.padEnd(25)} ${result.status}`);
  }

  console.log('\n' + '─'.repeat(50));
  console.log('\nTo access Banners, add "Marketing" scope to your API token.');
  console.log('Go to: BigCommerce Admin → Settings → API Accounts → Edit your token');
}

function testEndpoint(version, endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.bigcommerce.com',
      path: `/stores/${STORE_HASH}/${version}${endpoint}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ ok: res.statusCode < 400, status: res.statusCode });
      });
    });

    req.on('error', () => resolve({ ok: false, status: 'error' }));
    req.end();
  });
}

checkEndpoints().catch(console.error);
