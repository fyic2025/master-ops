#!/usr/bin/env tsx

/**
 * BigCommerce API Diagnostic Tool
 *
 * Tests various API endpoints to determine what's actually accessible
 * with the current credentials
 */

import 'dotenv/config';

interface APITest {
  name: string;
  version: 'v2' | 'v3';
  endpoint: string;
  method?: string;
}

async function testEndpoint(test: APITest) {
  const storeHash = process.env.BIGCOMMERCE_BOO_STORE_HASH || 'hhhi';
  const accessToken = process.env.BIGCOMMERCE_BOO_ACCESS_TOKEN || '';

  const baseUrl = test.version === 'v2'
    ? `https://api.bigcommerce.com/stores/${storeHash}/v2`
    : `https://api.bigcommerce.com/stores/${storeHash}/v3`;

  const url = `${baseUrl}${test.endpoint}`;

  try {
    const response = await fetch(url, {
      method: test.method || 'GET',
      headers: {
        'X-Auth-Token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text.substring(0, 200);
    }

    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? data : undefined,
      contentType,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log('\n🔬 BigCommerce API Diagnostic Tool');
  console.log('===================================\n');

  const tests: APITest[] = [
    // V2 API endpoints
    { name: 'V2 Store Info', version: 'v2', endpoint: '/store' },
    { name: 'V2 Products', version: 'v2', endpoint: '/products?limit=1' },
    { name: 'V2 Orders', version: 'v2', endpoint: '/orders?limit=1' },
    { name: 'V2 Customers', version: 'v2', endpoint: '/customers?limit=1' },
    { name: 'V2 Shipping Zones', version: 'v2', endpoint: '/shipping/zones' },

    // V3 API endpoints
    { name: 'V3 Catalog Summary', version: 'v3', endpoint: '/catalog/summary' },
    { name: 'V3 Products', version: 'v3', endpoint: '/catalog/products?limit=1' },
    { name: 'V3 Orders', version: 'v3', endpoint: '/orders?limit=1' },
    { name: 'V3 Customers', version: 'v3', endpoint: '/customers?limit=1' },
    { name: 'V3 Channels', version: 'v3', endpoint: '/channels' },
    { name: 'V3 Store Settings', version: 'v3', endpoint: '/settings' },
    { name: 'V3 Shipping Zones', version: 'v3', endpoint: '/shipping/zones' },
  ];

  const results = [];

  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    const result = await testEndpoint(test);
    results.push({ test, result });

    if (result.ok) {
      console.log(`✅ ${result.status} OK`);
      if (result.data) {
        const dataPreview = typeof result.data === 'object'
          ? Object.keys(result.data).slice(0, 3).join(', ')
          : String(result.data).substring(0, 50);
        console.log(`   Data: ${dataPreview}`);
      }
    } else {
      console.log(`❌ ${result.status} FAILED`);
      if (result.error) {
        const errorMsg = typeof result.error === 'object'
          ? JSON.stringify(result.error).substring(0, 150)
          : String(result.error).substring(0, 150);
        console.log(`   Error: ${errorMsg}`);
      }
    }
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('==========\n');

  const v2Results = results.filter(r => r.test.version === 'v2');
  const v3Results = results.filter(r => r.test.version === 'v3');

  const v2Success = v2Results.filter(r => r.result.ok).length;
  const v3Success = v3Results.filter(r => r.result.ok).length;

  console.log(`V2 API: ${v2Success}/${v2Results.length} working`);
  console.log(`V3 API: ${v3Success}/${v3Results.length} working\n`);

  // Specific recommendations
  console.log('💡 Recommendations:');

  const ordersV2 = results.find(r => r.test.name === 'V2 Orders')?.result;
  const ordersV3 = results.find(r => r.test.name === 'V3 Orders')?.result;

  if (ordersV2?.ok || ordersV3?.ok) {
    console.log('   ✅ Orders API is accessible via', ordersV2?.ok ? 'V2' : 'V3');
  } else {
    console.log('   ❌ Orders API not accessible - check API account permissions');
    console.log('      Error:', ordersV2?.error || ordersV3?.error);
  }

  const customersV2 = results.find(r => r.test.name === 'V2 Customers')?.result;
  const customersV3 = results.find(r => r.test.name === 'V3 Customers')?.result;

  if (customersV2?.ok || customersV3?.ok) {
    console.log('   ✅ Customers API is accessible via', customersV2?.ok ? 'V2' : 'V3');
  } else {
    console.log('   ❌ Customers API not accessible - check API account permissions');
    console.log('      Error:', customersV2?.error || customersV3?.error);
  }

  const shippingV2 = results.find(r => r.test.name === 'V2 Shipping Zones')?.result;
  const shippingV3 = results.find(r => r.test.name === 'V3 Shipping Zones')?.result;

  if (shippingV2?.ok || shippingV3?.ok) {
    console.log('   ✅ Shipping API is accessible via', shippingV2?.ok ? 'V2' : 'V3');
  } else {
    console.log('   ❌ Shipping API not accessible');
    console.log('      V2 Error:', shippingV2?.error);
    console.log('      V3 Error:', shippingV3?.error);
  }

  console.log('\n🔐 Next Steps:');
  console.log('   1. Check which API version works for each endpoint');
  console.log('   2. If still seeing 403 errors, regenerate the API token:');
  console.log('      - Go to: https://store-hhhi.mybigcommerce.com/manage/settings/api-accounts');
  console.log('      - Find your API account');
  console.log('      - Click "Edit" and save (this may refresh the token)');
  console.log('      - Or delete and recreate the API account with all scopes\n');
}

main().catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
  process.exit(1);
});
