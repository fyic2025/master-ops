const crypto = require('crypto');

// Test Unleashed API duplicate check
async function main() {
  const apiId = '7fda9404-7197-477b-89b1-dadbcefae168';
  const apiKey = process.env.TEELIXIR_UNLEASHED_API_KEY;

  if (!apiKey) {
    // Load from vault
    const { spawn } = require('child_process');
    const result = await new Promise((resolve) => {
      const proc = spawn('node', ['creds.js', 'get', 'teelixir', 'unleashed_api_key'], { cwd: __dirname });
      let out = '';
      proc.stdout.on('data', (data) => out += data);
      proc.on('close', () => resolve(out.trim()));
    });
    process.env.TEELIXIR_UNLEASHED_API_KEY = result;
  }

  const key = process.env.TEELIXIR_UNLEASHED_API_KEY;
  const baseUrl = 'https://api.unleashedsoftware.com';

  function sign(queryString) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(queryString);
    return hmac.digest('base64');
  }

  // Test searching by customerRef with specific IDs from the screenshot
  const testRefs = [
    '6608181887251',  // Arlette Mercae from screenshot
    '6608250798355',  // Michelle Rogers from screenshot
    'nonexistent123'  // Should return empty
  ];

  for (const ref of testRefs) {
    const queryString = `customerRef=${encodeURIComponent(ref)}`;
    const url = `${baseUrl}/SalesOrders?${queryString}`;
    const signature = sign(queryString);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-auth-id': apiId,
        'api-auth-signature': signature,
      },
    });

    const data = await response.json();
    console.log(`\nSearch customerRef=${ref}:`);
    console.log(`  Results: ${data.Items?.length || 0}`);
    if (data.Items?.length > 0) {
      for (const item of data.Items.slice(0, 3)) {
        console.log(`    - ${item.OrderNumber}: CustomerRef=${item.CustomerRef}, Customer=${item.Customer?.CustomerName}`);
      }
    }
  }
}

main().catch(console.error);
