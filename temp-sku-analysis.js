const crypto = require('crypto');
const { spawn } = require('child_process');

async function getCredential(business, key) {
  return new Promise((resolve) => {
    const proc = spawn('node', ['creds.js', 'get', business, key], { cwd: __dirname });
    let out = '';
    proc.stdout.on('data', (data) => out += data);
    proc.on('close', () => resolve(out.trim()));
  });
}

async function main() {
  const shopifyToken = await getCredential('teelixir', 'shopify_access_token');
  const unleashedApiId = await getCredential('teelixir', 'unleashed_api_id');
  const unleashedApiKey = await getCredential('teelixir', 'unleashed_api_key');

  function sign(queryString) {
    const hmac = crypto.createHmac('sha256', unleashedApiKey);
    hmac.update(queryString);
    return hmac.digest('base64');
  }

  // 1. Get Shopify SKUs from recent orders
  console.log('=== SHOPIFY ORDER SKUs (last 50 orders) ===\n');
  const shopifyResponse = await fetch(
    'https://teelixir-au.myshopify.com/admin/api/2024-01/orders.json?limit=50&status=any',
    { headers: { 'X-Shopify-Access-Token': shopifyToken } }
  );
  const shopifyData = await shopifyResponse.json();

  const shopifySkus = new Map(); // SKU -> { title, price, count }
  for (const order of shopifyData.orders) {
    for (const item of order.line_items) {
      const sku = item.sku || 'NO_SKU';
      const existing = shopifySkus.get(sku) || { titles: new Set(), prices: new Set(), count: 0 };
      existing.titles.add(item.title.substring(0, 50));
      existing.prices.add(item.price);
      existing.count++;
      shopifySkus.set(sku, existing);
    }
  }

  // 2. Get Unleashed products
  console.log('=== UNLEASHED PRODUCTS ===\n');
  const unleashedQuery = 'pageSize=500';
  const unleashedResponse = await fetch(
    `https://api.unleashedsoftware.com/Products?${unleashedQuery}`,
    {
      headers: {
        'Accept': 'application/json',
        'api-auth-id': unleashedApiId,
        'api-auth-signature': sign(unleashedQuery),
      }
    }
  );
  const unleashedData = await unleashedResponse.json();

  const unleashedProducts = new Map(); // ProductCode -> ProductDescription
  for (const product of unleashedData.Items || []) {
    unleashedProducts.set(product.ProductCode, product.ProductDescription);
  }

  // 3. Compare and find mismatches
  console.log('SKU ANALYSIS:\n');
  console.log('Legend: ✓ = exists in Unleashed, ✗ = NOT FOUND\n');

  const missing = [];
  const found = [];

  for (const [sku, info] of shopifySkus) {
    const inUnleashed = unleashedProducts.has(sku);
    const status = inUnleashed ? '✓' : '✗';
    const titles = Array.from(info.titles).join(' | ');
    const prices = Array.from(info.prices).join(', ');
    const isFree = prices === '0.00' || prices === '0';

    if (!inUnleashed) {
      missing.push({ sku, titles, prices, count: info.count, isFree });
    } else {
      found.push({ sku, titles, unleashedName: unleashedProducts.get(sku), count: info.count });
    }

    console.log(`${status} SKU: "${sku}" (used ${info.count}x)${isFree ? ' [FREE GIFT]' : ''}`);
    console.log(`    Shopify: ${titles}`);
    if (inUnleashed) {
      console.log(`    Unleashed: ${unleashedProducts.get(sku)}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`Total unique SKUs in orders: ${shopifySkus.size}`);
  console.log(`Found in Unleashed: ${found.length}`);
  console.log(`MISSING from Unleashed: ${missing.length}`);

  if (missing.length > 0) {
    console.log('\n=== MISSING SKUs (need mapping) ===\n');
    for (const m of missing) {
      console.log(`SKU: "${m.sku}" ${m.isFree ? '[FREE]' : ''}`);
      console.log(`  Title: ${m.titles}`);
      console.log(`  Used: ${m.count} times`);

      // Try to find similar product in Unleashed
      const skuBase = m.sku.replace(/-\d+$/, ''); // Remove trailing numbers like -250, -100
      const similar = Array.from(unleashedProducts.entries())
        .filter(([code]) => code.startsWith(skuBase) || code.includes(skuBase))
        .slice(0, 3);

      if (similar.length > 0) {
        console.log('  Possible matches in Unleashed:');
        for (const [code, desc] of similar) {
          console.log(`    - ${code}: ${desc}`);
        }
      }
      console.log('');
    }
  }
}

main().catch(console.error);
