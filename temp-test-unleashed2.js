const crypto = require('crypto');

// Test different Unleashed API search parameters
async function main() {
  const apiId = '7fda9404-7197-477b-89b1-dadbcefae168';

  // Load key from vault
  const { spawn } = require('child_process');
  const key = await new Promise((resolve) => {
    const proc = spawn('node', ['creds.js', 'get', 'teelixir', 'unleashed_api_key'], { cwd: __dirname });
    let out = '';
    proc.stdout.on('data', (data) => out += data);
    proc.on('close', () => resolve(out.trim()));
  });

  const baseUrl = 'https://api.unleashedsoftware.com';

  function sign(queryString) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(queryString);
    return hmac.digest('base64');
  }

  // Try different search approaches
  const tests = [
    { name: 'Comments contains Shopify', query: 'comments=Shopify%2331695' },
    { name: 'OrderNumber exact', query: 'orderNumber=SO-00002477' },
    { name: 'All with limit 5', query: '' },
  ];

  for (const test of tests) {
    const url = `${baseUrl}/SalesOrders${test.query ? '?' + test.query : ''}`;
    const signature = sign(test.query);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': apiId,
        'api-auth-signature': signature,
      },
    });

    const data = await response.json();
    console.log(`\n${test.name}:`);
    console.log(`  Total: ${data.Pagination?.NumberOfItems || data.Items?.length || 0}`);
    if (data.Items?.length > 0) {
      for (const item of data.Items.slice(0, 3)) {
        console.log(`    - ${item.OrderNumber}: Ref=${item.CustomerRef}, Comments=${item.Comments?.substring(0,40)}`);
      }
    }
  }

  // Now check what the duplicates look like - search for orders with same CustomerRef
  console.log('\n\n=== Checking duplicates for CustomerRef 6608181887251 ===');
  const queryString = '';
  const url = `${baseUrl}/SalesOrders?pageSize=20`;
  const signature = sign('pageSize=20');

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-auth-id': apiId,
      'api-auth-signature': signature,
    },
  });

  const data = await response.json();
  const dupeRef = '6608181887251';
  const dupes = data.Items?.filter(i => i.CustomerRef === dupeRef) || [];
  console.log(`\nOrders with CustomerRef ${dupeRef}: ${dupes.length}`);
  for (const item of dupes) {
    console.log(`  - ${item.OrderNumber} | ${item.Customer?.CustomerName} | Status: ${item.OrderStatus}`);
  }
}

main().catch(console.error);
